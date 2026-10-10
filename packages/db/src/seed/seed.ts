// scripts/src/seed.ts
//
// Phase-based demo seed orchestrator.
//
// Contract: this pipeline is ALWAYS a full rebuild. It truncates every
// table in phase 0. There is no incremental mode — the phases have no
// idempotency branches, so a non-truncating run would duplicate rows.
//
// Two-track seeding:
//
//   1. Column-level values (clinics, clinicSettings) come from
//      `drizzle-seed`'s seedable pRNG + `.refine()`. These tables have no
//      child rows, so weighted distributions and faker bindings are safe.
//
//   2. FK-linked clinical data (patients→appointments→encounters→
//      prescriptions, …) uses the deterministic helpers in `helper.ts`.
//      `drizzle-seed`'s `.refine()` cannot express "this encounter must
//      reference an appointment that already exists", so the phase list
//      below is hand-rolled and ordered.
//
// Do not convert track 2 to `drizzle-seed`. The dependency graph is the
// whole point of the phase ordering.

import { faker } from "@faker-js/faker";
import { logger } from "@pedia/shared/logger/server";
import { sql } from "drizzle-orm";

import { db } from "..";
import { whoGrowthData } from "../schema";
import { seedAuth } from "./auth";
import {
  seedChargeCatalog,
  seedExpenses,
  seedInvoices,
  seedPayments,
} from "./billing";
import {
  seedAuditLogs,
  seedClinicSettings,
  seedClinics,
  seedDepartments,
} from "./clinic";
import {
  seedAppointments,
  seedGrowthMeasurements,
  seedPrescriptions,
  seedStaffAndDoctors,
} from "./clinical";
import { seedEncounters } from "./encounters";
import { closePool, seedLogger, truncateAll } from "./helper";
import { seedImmunizations } from "./immunization";
import { seedAdmissions, seedWards } from "./inpatient";
import { seedLabOrders, seedLabTests } from "./laboratory";
import { seedPatientClinical, seedPatients } from "./patients";
import {
  seedDispensations,
  seedMedicines,
  seedPharmacyInventory,
} from "./pharmacy";
import { seedWHOGrowthData } from "./seed-who";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedPhaseResult {
  name: string;
  counts: Record<string, number>;
}

export interface SeedSummary {
  durationMs: number;
  phases: SeedPhaseResult[];
}

export interface SeedOptions {
  /**
   * Import WHO growth reference data.
   * Default: on. Set `SEED_WHO='false'` to skip.
   */
  seedWho?: boolean;
  /**
   * Seed the public project catalog.
   * Default: on. Set `SEED_PROJECTS='false'` to skip.
   */
  // seedProjects?: boolean
  /** Directory containing the WHO JSON files. Default: `WHO_DATA_DIR`. */
  whoDataDir?: string;
  /** Skip the phase logger noise. Default: false. */
  quiet?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// State passed between phases
// ─────────────────────────────────────────────────────────────────────────────

interface SeedState {
  /** Produced by phase 1_foundation (`seedAuth`). */
  adminUserId: string;
  /** Produced by phase 1_foundation (`seedAuth`). */
  users: Awaited<ReturnType<typeof seedAuth>>["users"];
  /** Produced by phase 0_columns (`seedClinics`). */
  clinics: Awaited<ReturnType<typeof seedClinics>>["clinics"];
  /** Produced by phase 1_foundation (`seedDepartments`). */
  departments: Awaited<ReturnType<typeof seedDepartments>>["departments"];
  /** Produced by phase 2_staff (`seedStaffAndDoctors`). */
  staffRows: Awaited<ReturnType<typeof seedStaffAndDoctors>>["staffRows"];
  /** Produced by phase 2_staff (`seedStaffAndDoctors`). */
  doctorRows: Awaited<ReturnType<typeof seedStaffAndDoctors>>["doctorRows"];
  /** Produced by phase 3_patients (`seedPatients`). */
  patients: Awaited<ReturnType<typeof seedPatients>>["patients"];
  /** Produced by phase 5_encounters (`seedEncounters`). */
  encounters: Awaited<ReturnType<typeof seedEncounters>>["encounters"];
}

function createSeedState(): SeedState {
  return {} as SeedState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase runner
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseContext {
  quiet: boolean;
}

async function runPhase(
  name: string,
  ctx: PhaseContext,
  fn: () => Promise<Record<string, number>>
): Promise<SeedPhaseResult> {
  const phaseLog = seedLogger(`seed_phase_${name}`);
  const startedAt = Date.now();

  if (!ctx.quiet) phaseLog.set({ event: "phase_started" });

  try {
    const counts = await fn();

    if (!ctx.quiet) {
      phaseLog.set({
        event: "phase_complete",
        durationMs: Date.now() - startedAt,
        counts,
      });
      phaseLog.emit();
    }

    return { name, counts };
  } catch (error) {
    phaseLog.error(error instanceof Error ? error : new Error(String(error)), {
      phase: name,
      durationMs: Date.now() - startedAt,
    });
    phaseLog.set({ event: "phase_failed", phase: name });
    phaseLog.emit();
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertions used at phase boundaries
// ─────────────────────────────────────────────────────────────────────────────

function assertState<K extends keyof SeedState>(
  state: SeedState,
  keys: readonly K[],
  phase: string
): asserts state is SeedState & Required<Pick<SeedState, K>> {
  for (const key of keys) {
    if (state[key] === undefined || state[key] === null) {
      throw new Error(
        `${phase}: state.${String(key)} is unset — check phase ordering.`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(options: SeedOptions = {}): Promise<SeedSummary> {
  const seedWho = options.seedWho ?? process.env.SEED_WHO !== "false";
  // const seedProjectsEnabled =
  // 	options.seedProjects ?? process.env.SEED_PROJECTS !== 'false'
  const whoDataDir = options.whoDataDir ?? process.env.WHO_DATA_DIR;
  const quiet = options.quiet ?? false;

  const state = createSeedState();
  faker.seed(42);

  const runLogger = seedLogger("seed_run");
  const startedAt = Date.now();
  const phaseResults: SeedPhaseResult[] = [];
  const ctx: PhaseContext = { quiet };

  if (!quiet) {
    runLogger.set({
      event: "seed_started",
      seed: {
        fakerSeed: 42,
        seedWho,
        // seedProjects: seedProjectsEnabled,
      },
    });
  }

  try {
    // ─────────────────────────────────────────────────────────
    // PHASE 0_truncate — always runs. The pipeline is a full rebuild.
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("0_truncate", ctx, async () => {
        await truncateAll();
        return {};
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 0c_who — WHO Growth Reference
    //
    // Must run before any growth measurements are written:
    // seedGrowthMeasurements calls loadWhoLmsTable(), which reads
    // who_growth_data.
    // ─────────────────────────────────────────────────────────
    if (seedWho) {
      phaseResults.push(
        await runPhase("0c_who", ctx, async () => {
          await seedWHOGrowthData(whoDataDir);
          const { count } = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(whoGrowthData)
            .then((r) => r[0] ?? { count: 0 });

          if (count === 0) {
            throw new Error(
              "seedWHOGrowthData completed but who_growth_data is empty — " +
                "check WHO_DATA_DIR and the JSON files it points at."
            );
          }
          return { whoGrowthRows: count };
        })
      );
    }

    // ─────────────────────────────────────────────────────────
    // PHASE 0_columns — clinics and clinic settings
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("0_columns", ctx, async () => {
        const { clinics } = await seedClinics();
        const clinic = clinics[0];
        if (!clinic) {
          throw new Error("seedClinicSettings requires a seeded clinic");
        }
        const settings = await seedClinicSettings(clinic.id);
        state.clinics = clinics;
        return {
          clinics: clinics.length,
          clinicSettings: settings ? 1 : 0,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 1_foundation — users, departments
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("1_foundation", ctx, async () => {
        assertState(state, ["clinics"], "phase 1_foundation");

        const { adminUser, users } = await seedAuth();
        const { departments } = await seedDepartments();

        state.adminUserId = adminUser.id;
        state.users = users;
        state.departments = departments;

        return {
          users: users.length + 1,
          clinics: state.clinics.length,
          departments: departments.length,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 2_staff — staff, doctors, schedules
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("2_staff", ctx, async () => {
        assertState(
          state,
          ["users", "clinics", "departments"],
          "phase 2_staff"
        );

        const { staffRows, doctorRows, scheduleCount } =
          await seedStaffAndDoctors({
            users: state.users,
            clinics: state.clinics,
            departments: state.departments,
          });

        state.staffRows = staffRows;
        state.doctorRows = doctorRows;

        return {
          staff: staffRows.length,
          doctors: doctorRows.length,
          schedules: scheduleCount,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 3_patients — patients, guardians
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("3_patients", ctx, async () => {
        assertState(state, ["clinics", "doctorRows"], "phase 3_patients");

        const { patients, patientUsers } = await seedPatients({
          clinics: state.clinics,
          pediatricianIds: state.doctorRows.map((d) => d.staffId),
        });

        state.patients = patients;

        return {
          patients: patients.length,
          patientUsers: patientUsers.length,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 4_patient_clinical — allergies, conditions, documents
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("4_patient_clinical", ctx, async () => {
        assertState(state, ["patients"], "phase 4_patient_clinical");
        return seedPatientClinical({ patients: state.patients });
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 5_encounters — appointments, encounters, dx, rx
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("5_encounters", ctx, async () => {
        assertState(
          state,
          ["adminUserId", "doctorRows", "staffRows", "patients"],
          "phase 5_encounters"
        );

        const { appointments } = await seedAppointments({
          patients: state.patients,
          doctors: state.doctorRows,
          bookedById: state.adminUserId,
        });
        const { encounters, diagnosisCount } = await seedEncounters({
          patients: state.patients,
          doctors: state.doctorRows,
          staffRows: state.staffRows,
          appointments,
        });
        const rxResult = await seedPrescriptions({
          encounters,
          doctors: state.doctorRows,
          staffRows: state.staffRows,
        });

        state.encounters = encounters;

        return {
          appointments: appointments.length,
          encounters: encounters.length,
          diagnoses: diagnosisCount,
          prescriptions: rxResult.prescriptionCount,
          prescriptionItems: rxResult.itemCount,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 6_immunizations_growth
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("6_immunizations_growth", ctx, async () => {
        assertState(
          state,
          ["patients", "staffRows"],
          "phase 6_immunizations_growth"
        );

        const immunizations = await seedImmunizations({
          patients: state.patients,
          staffRows: state.staffRows,
        });
        const recordingStaff = state.staffRows.find(
          (staff) => staff.role === "doctor" || staff.role === "staff"
        );
        if (!recordingStaff) {
          throw new Error(
            "Growth seeding requires at least one doctor or clinical staff member"
          );
        }
        const growthMeasurements = await seedGrowthMeasurements({
          patients: state.patients,
          recordedById: recordingStaff.id,
        });
        return { immunizations, growthMeasurements };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 7_inpatient
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("7_inpatient", ctx, async () => {
        assertState(
          state,
          ["adminUserId", "clinics", "patients", "doctorRows"],
          "phase 7_inpatient"
        );

        const { wards, rooms, beds } = await seedWards({
          clinics: state.clinics,
        });
        const { admissionCount, allocationCount, noteCount } =
          await seedAdmissions({
            patients: state.patients,
            doctors: state.doctorRows,
            beds,
            createdById: state.adminUserId,
          });
        return {
          wards: wards.length,
          rooms: rooms.length,
          beds: beds.length,
          admissions: admissionCount,
          bedAllocations: allocationCount,
          clinicalNotes: noteCount,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 8_lab
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("8_lab", ctx, async () => {
        assertState(
          state,
          ["patients", "doctorRows", "staffRows", "encounters"],
          "phase 8_lab"
        );

        const { labTests } = await seedLabTests();
        const { labOrderCount, labItemCount } = await seedLabOrders({
          patients: state.patients,
          doctors: state.doctorRows,
          staffRows: state.staffRows,
          encounters: state.encounters,
          labTests,
        });
        return {
          labTests: labTests.length,
          labOrders: labOrderCount,
          labOrderItems: labItemCount,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 9_pharmacy
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("9_pharmacy", ctx, async () => {
        assertState(state, ["adminUserId", "patients"], "phase 9_pharmacy");

        const { medicines, batches } = await seedMedicines({
          clinics: state.clinics,
        });
        const inventoryTransactions = await seedPharmacyInventory({
          medicines,
          batches,
          performedById: state.adminUserId,
        });
        const dispensationResult = await seedDispensations({
          patients: state.patients,
          medicines,
          batches,
          dispensedById: state.adminUserId,
        });
        return {
          medicines: medicines.length,
          batches: batches.length,
          inventoryTransactions,
          dispensations: dispensationResult.dispensationCount,
          dispensationItems: dispensationResult.itemCount,
          dispensationsSkippedNonCompliant:
            dispensationResult.skippedNonCompliant,
          dispensationsSkippedMissingBatch:
            dispensationResult.skippedMissingBatch,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 10_billing
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("10_billing", ctx, async () => {
        assertState(state, ["adminUserId", "patients"], "phase 10_billing");

        const chargeCatalog = await seedChargeCatalog();
        const { invoices, itemCount: invoiceItems } = await seedInvoices({
          patients: state.patients,
          createdById: state.adminUserId,
        });
        const payments = await seedPayments({
          invoices,
          receivedById: state.adminUserId,
        });
        const expenses = await seedExpenses({
          recordedById: state.adminUserId,
        });
        return {
          chargeCatalog,
          invoices: invoices.length,
          invoiceItems,
          payments,
          expenses,
        };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 11_audit
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("11_audit", ctx, async () => {
        assertState(state, ["staffRows"], "phase 11_audit");

        const auditLogs = await seedAuditLogs({
          staffRows: state.staffRows,
        });
        return { auditLogs };
      })
    );

    // ─────────────────────────────────────────────────────────
    // PHASE 12_validate — asserts the produced shape
    // ─────────────────────────────────────────────────────────
    phaseResults.push(
      await runPhase("12_validate", ctx, async () => {
        const [r] = await db
          .select({
            growth_with_z: sql<number>`(
					SELECT count(*)::int FROM growth_measurements
					WHERE weight_for_age_zscore IS NOT NULL
				)`,
            growth_total: sql<number>`(
					SELECT count(*)::int FROM growth_measurements
				)`,
            prescriptions_total: sql<number>`(
					SELECT count(*)::int FROM prescriptions
				)`,
            dispensations_total: sql<number>`(
					SELECT count(*)::int FROM dispensations
				)`,
            invoices_total: sql<number>`(
					SELECT count(*)::int FROM invoices
				)`,
            payments_total: sql<number>`(
					SELECT count(*)::int FROM payments
				)`,
            who_total: sql<number>`(
					SELECT count(*)::int FROM who_growth_data
				)`,
          })
          .from(sql`(SELECT 1) AS anchor`);

        if (!r) throw new Error("validation query returned no rows");

        if (seedWho && r.who_total < 7000) {
          throw new Error(`WHO table under-populated: ${r.who_total}`);
        }
        if (
          seedWho &&
          r.growth_total > 0 &&
          r.growth_with_z / r.growth_total < 0.95
        ) {
          throw new Error(
            `Only ${r.growth_with_z}/${r.growth_total} growth rows have Z-scores`
          );
        }
        if (
          r.prescriptions_total > 0 &&
          r.dispensations_total === r.prescriptions_total
        ) {
          throw new Error(
            "Dispensation coverage is 100% — the coverage gate is not active"
          );
        }
        if (r.invoices_total > 0 && r.payments_total === 0) {
          throw new Error(
            "seedPayments produced zero payments — check the invoice-status filter"
          );
        }

        return {
          who_total: r.who_total,
          growth_with_z: r.growth_with_z,
          dispensation_coverage:
            r.prescriptions_total > 0
              ? r.dispensations_total / r.prescriptions_total
              : 0,
          payment_coverage:
            r.invoices_total > 0 ? r.payments_total / r.invoices_total : 0,
        };
      })
    );

    const summary: SeedSummary = {
      durationMs: Date.now() - startedAt,
      phases: phaseResults,
    };

    if (!quiet) {
      runLogger.set({
        event: "seed_completed",
        ...summary,
        mode: {
          wipe: true,
          seedWho,
          // seedProjects: seedProjectsEnabled,
        },
      });
      runLogger.emit();
    }

    return summary;
  } catch (error) {
    const failedPhase = phaseResults.at(-1)?.name ?? "unknown";
    runLogger.error(error instanceof Error ? error : new Error(String(error)), {
      failedPhase,
      completedPhases: phaseResults.map((p) => p.name),
    });
    runLogger.set({
      event: "seed_failed",
      failedPhase,
      durationMs: Date.now() - startedAt,
    });
    runLogger.emit();
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function runSeed(options: SeedOptions = {}): Promise<SeedSummary> {
  return main(options);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────────────────────

async function cli(): Promise<void> {
  try {
    const summary = await runSeed();
    logger.info("Seed complete", {
      durationMs: summary.durationMs,
      phases: summary.phases.length,
    });
  } catch (err) {
    seedLogger("seed_cli").error(
      err instanceof Error ? err : new Error(String(err))
    );
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  void cli();
}
