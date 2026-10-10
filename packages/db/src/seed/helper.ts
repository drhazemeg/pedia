import * as fs from "node:fs";
import * as path from "node:path";

import type { InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { closeConnection, db } from "..";
import {
  type account,
  type admissions,
  type appointments,
  type auditLogs,
  type bedAllocations,
  type beds,
  type chargeCatalog,
  type clinicalNotes,
  type clinicSettings,
  type clinics,
  type counters,
  type departments,
  type diagnoses,
  type dispensationItems,
  type dispensations,
  type doctorSchedules,
  type doctors,
  type encounters,
  type expenses,
  type growthMeasurements,
  type guardians,
  type inventoryTransactions,
  type invoiceItems,
  type invoices,
  type labOrderItems,
  type labOrders,
  type labTests,
  type medicalRecords,
  type medicineBatches,
  type medicines,
  type patientAllergies,
  type patientChronicConditions,
  type patientDocuments,
  type patients,
  type payments,
  type prescriptionItems,
  type prescriptions,
  type rooms,
  type session,
  type staff,
  type user,
  type verification,
  type wards,
  whoGrowthData,
} from "../schema";

export const seedDb = db;

// ─── Logging ────────────────────────────────────────────────
export function seedLogger(operation: string) {
  return {
    context: { operation, origin: "seed" as const },
    set(meta: Record<string, unknown>) {
      console.debug(`[${operation}]`, JSON.stringify(meta));
    },
    emit(meta?: Record<string, unknown>) {
      if (meta) console.debug(`[${operation}]`, JSON.stringify(meta));
    },
    error(err: Error, meta?: Record<string, unknown>) {
      // Unwrap Drizzle's wrapped cause so we see the real PG message.
      const cause = (err as { cause?: unknown }).cause;
      const causeMsg = cause instanceof Error ? cause.message : cause;
      console.debug(`[${operation}]`, err.message, meta ?? {});
      if (causeMsg && causeMsg !== err.message) {
        console.debug(`[${operation}] caused by:`, causeMsg);
      }
      // Also surface constraint / detail fields when present.
      if (cause && typeof cause === "object") {
        const c = cause as {
          code?: string;
          detail?: string;
          constraint?: string;
          table?: string;
          column?: string;
        };
        if (c.code || c.detail || c.constraint) {
          console.debug(`[${operation}] pg error:`, {
            code: c.code,
            detail: c.detail,
            constraint: c.constraint,
            table: c.table,
            column: c.column,
          });
        }
      }
    },
    warn(msg: string, meta?: Record<string, unknown>) {
      console.debug(`[${operation}]`, msg, meta ?? {});
    },
  };
}

// ─── Truncate (idempotent reset) ────────────────────────────
export async function truncateAll() {
  const logger = seedLogger("truncate_all");
  logger.set({ event: "truncate_started" });

  await seedDb.execute(sql`
		TRUNCATE TABLE
			rate_limit, invitation, member, organization_role, organization,
			two_factor, verification, account, session, "user",
			templates,
			expenses, payments, invoice_items, invoices, charge_catalog,
			dispensation_items, dispensations, inventory_transactions,
			medicine_batches, medicines,
			lab_order_items, lab_orders, lab_tests,
			clinical_notes, bed_allocations, admissions, beds, rooms, wards,
			medical_records, patient_documents,
			patient_chronic_conditions, patient_allergies, guardians,
			growth_measurements, who_growth_data,
			prescription_items, prescriptions,
			immunizations, diagnoses, encounters, appointments,
			doctor_schedules, doctors, staff, departments,
			clinic_settings, clinics, counters,
			patients
		CASCADE
	`);

  logger.set({ event: "truncate_complete" });
}
/** Drain the shared pg.Pool. Call at process exit in CLI entry points. */
export async function closePool(): Promise<void> {
  await closeConnection();
}

// ─────────────────────────────────────────────────────────────
// Deterministic RNG (mulberry32) — used ONLY for FK-linked rows
// ─────────────────────────────────────────────────────────────
//
// Column-level faker values (names, phones, addresses) come from
// `drizzle-seed` / `@faker-js/faker` at the `seed.ts` orchestrator level.
// Everything here is reserved for rows whose FK targets must be *stable
// across runs* (appointments → patients, encounters → appointments, …),
// where drizzle-seed's `.refine()` cannot express the constraint.
//
// Do not mix: if a value is not FK-constrained, prefer faker.

export function createRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = createRng(42);

// ─── Pick helpers (deterministic) ───────────────────────────
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].toSorted(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number, decimals = 2): number {
  return Number((rng() * (max - min) + min).toFixed(decimals));
}

export function chance(p: number): boolean {
  return rng() < p;
}

// ─── Dates ──────────────────────────────────────────────────
export const dateStr = (d: Date) => d.toISOString().slice(0, 10);

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Whole calendar months between two dates.
 *
 * `from` and `to` must be ordered (`from <= to`). Passing a future `from`
 * returns a negative count on purpose — callers use that to detect
 * "measurement before birth" mistakes.
 */
export function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

/**
 * Whole days between two dates, floored. Safe for WHO lookups where the
 * table key is `age_days` (integer) — see `loadWhoLmsTable` below.
 */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000);
}

// ─── ID generators ──────────────────────────────────────────
export const ids = {
  mrn: (i: number) => `MRN-${String(i).padStart(6, "0")}`,
  doctorCode: (i: number) => `DOC-${String(i).padStart(4, "0")}`,
  appointmentNumber: (i: number) => `APT-${String(i).padStart(6, "0")}`,
  encounterNumber: (i: number) => `ENC-${String(i).padStart(6, "0")}`,
  admissionNumber: (i: number) => `ADM-${String(i).padStart(6, "0")}`,
  prescriptionNumber: (i: number) => `RX-${String(i).padStart(6, "0")}`,
  labOrderNumber: (i: number) => `LAB-${String(i).padStart(6, "0")}`,
  invoiceNumber: (i: number) => `INV-${String(i).padStart(6, "0")}`,
  paymentNumber: (i: number) => `PAY-${String(i).padStart(6, "0")}`,
  expenseNumber: (i: number) => `EXP-${String(i).padStart(6, "0")}`,
  registrationNumber: (i: number) => `REG-${String(i).padStart(6, "0")}`,
  departmentCode: (i: number) => `DEPT-${String(i).padStart(3, "0")}`,
  wardCode: (i: number) => `WARD-${String(i).padStart(3, "0")}`,
  medicineCode: (i: number) => `MED-${String(i).padStart(5, "0")}`,
  labTestCode: (i: number) => `LABT-${String(i).padStart(4, "0")}`,
  chargeCode: (i: number) => `CHG-${String(i).padStart(4, "0")}`,
  sequence: (prefix: string, n: number, pad = 5) =>
    `${prefix}-${String(n).padStart(pad, "0")}`,
};

// ─── Pediatric growth approximations ────────────────────────
//
// These are *fallback* anthropometrics for the case where WHO LMS lookup
// fails (e.g. patient older than the WHO tables cover). Real Z-scores are
// computed from LMS rows in `seed-who.ts` — see `computeZScore` below.

export function approximateWeight(ageMonths: number): number {
  if (ageMonths <= 12) {
    return randFloat(3.2 + ageMonths * 0.65, 4.5 + ageMonths * 0.75, 2);
  }
  if (ageMonths <= 60) {
    return randFloat(
      10 + (ageMonths - 12) * 0.28,
      13 + (ageMonths - 12) * 0.33,
      2
    );
  }
  return randFloat(
    20 + (ageMonths - 60) * 0.35,
    25 + (ageMonths - 60) * 0.42,
    2
  );
}

export function approximateHeight(ageMonths: number): number {
  if (ageMonths <= 12) {
    return randFloat(50 + ageMonths * 2.1, 54 + ageMonths * 2.3, 1);
  }
  if (ageMonths <= 60) {
    return randFloat(
      75 + (ageMonths - 12) * 0.85,
      80 + (ageMonths - 12) * 0.9,
      1
    );
  }
  return randFloat(
    115 + (ageMonths - 60) * 0.55,
    125 + (ageMonths - 60) * 0.6,
    1
  );
}

export function approximateHeadCirc(ageMonths: number): number {
  if (ageMonths <= 3) return randFloat(34, 40, 1);
  if (ageMonths <= 12) return randFloat(40, 47, 1);
  return randFloat(47, 52, 1);
}

// ─────────────────────────────────────────────────────────────
// WHO LMS lookup + Z-score computation (Bug 13)
// ─────────────────────────────────────────────────────────────
//
// WHO Child Growth Standards publish three parameters per
// (gender, metric, age-in-days): L (Box-Cox power), M (median), S
// (coefficient of variation). The Z-score for a raw measurement is:
//
//   Z = ((value / M) ^ L - 1) / (L * S)
//
// This is exact for |Z| <= 3, which is the range WHO certifies. Values
// beyond that are flagged abnormal in the caller, not corrected.

export type WhoGenderKey = "male" | "female";
export type WhoMetricKey = "weight" | "height";

export interface WhoLmsRow {
  readonly gender: WhoGenderKey;
  readonly metricType: WhoMetricKey;
  readonly ageDays: number;
  readonly L: number;
  readonly M: number;
  readonly S: number;
}

/**
 * Nested map keyed by `gender` → `metricType` → `ageDays`.
 *
 * Per-process cache. `loadWhoLmsTable` is idempotent; subsequent calls
 * return the cached map without hitting the DB. Call `clearWhoLmsCache()`
 * between test runs if you mutate `who_growth_data`.
 */
let whoLmsCache: Map<
  WhoGenderKey,
  Map<WhoMetricKey, Map<number, WhoLmsRow>>
> | null = null;

export function clearWhoLmsCache(): void {
  whoLmsCache = null;
}

/**
 * Load every WHO LMS row and index it by `(gender, metricType, ageDays)`.
 *
 * We key on `ageDays` — not `ageMonths` — because the WHO tables are
 * per-day and a month can contain 28-31 distinct LMS rows. `ageMonths` is
 * kept on the row for reporting; it is never a lookup key.
 *
 * Returns a nested Map so callers can do a single `Map.get` per axis
 * instead of building composite string keys.
 */
export async function loadWhoLmsTable(): Promise<
  Map<WhoGenderKey, Map<WhoMetricKey, Map<number, WhoLmsRow>>>
> {
  if (whoLmsCache) return whoLmsCache;

  const rows = await seedDb
    .select({
      gender: whoGrowthData.gender,
      metricType: whoGrowthData.metricType,
      ageDays: whoGrowthData.ageDays,
      lValue: whoGrowthData.L,
      mValue: whoGrowthData.M,
      sValue: whoGrowthData.S,
    })
    .from(whoGrowthData);

  const table = new Map<
    WhoGenderKey,
    Map<WhoMetricKey, Map<number, WhoLmsRow>>
  >();

  for (const row of rows) {
    if (row.ageDays === null) continue;
    const g = row.gender;
    const m = row.metricType as WhoMetricKey;

    let byMetric = table.get(g);
    if (!byMetric) {
      byMetric = new Map();
      table.set(g, byMetric);
    }
    let byDay = byMetric.get(m);
    if (!byDay) {
      byDay = new Map();
      byMetric.set(m, byDay);
    }
    byDay.set(row.ageDays, {
      gender: g,
      metricType: m,
      ageDays: row.ageDays,
      L: row.lValue,
      M: row.mValue,
      S: row.sValue,
    });
  }

  whoLmsCache = table;
  return table;
}

/**
 * Exact Z-score from a single LMS row.
 *
 *   Z = ((value / M) ^ L - 1) / (L * S)
 *
 * `L === 0` is a real WHO case for weight-for-age at some ages; the
 * Box-Cox transform degenerates to `ln(value / M) / S` there.
 */
export function computeZScore(
  lms: Pick<WhoLmsRow, "L" | "M" | "S">,
  value: number
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `computeZScore: value must be finite and > 0, got ${value}`
    );
  }
  if (!Number.isFinite(lms.M) || lms.M <= 0) {
    throw new Error(`computeZScore: M must be finite and > 0, got ${lms.M}`);
  }

  if (lms.L === 0) {
    return Math.log(value / lms.M) / lms.S;
  }
  return ((value / lms.M) ** lms.L - 1) / (lms.L * lms.S);
}

/**
 * Standard-normal CDF approximation (Abramowitz & Stegun 26.2.17).
 *
 * Used to derive a percentile from a Z-score. Accuracy is ~1e-5 across
 * the full range, which is far better than the precision we store.
 */
export function zScoreToPercentile(z: number): number {
  // Clamp to the range where the approximation is well-behaved.
  const zz = Math.max(-6, Math.min(6, z));
  const t = 1 / (1 + 0.2316419 * Math.abs(zz));
  const poly =
    0.31938153 * t -
    0.356563782 * t * t +
    1.781477937 * t * t * t -
    1.821255978 * t * t * t * t +
    1.330274429 * t * t * t * t * t;
  const cdf =
    1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * zz * zz) * poly;
  const pct = (zz >= 0 ? cdf : 1 - cdf) * 100;
  return Number(pct.toFixed(1));
}

/**
 * Find the LMS row for `(gender, metricType, ageDays)`, or `undefined`
 * when the age falls outside the loaded WHO dataset.
 *
 * Prefers an exact `ageDays` match; falls back to the nearest earlier
 * day when the exact day is missing (WHO tables are sampled daily but
 * our loader dedupes by day, so gaps are rare).
 */
export function lookupWhoLms(
  table: Map<WhoGenderKey, Map<WhoMetricKey, Map<number, WhoLmsRow>>>,
  gender: WhoGenderKey,
  metricType: WhoMetricKey,
  ageDays: number
): WhoLmsRow | undefined {
  const byMetric = table.get(gender);
  if (!byMetric) return undefined;
  const byDay = byMetric.get(metricType);
  if (!byDay) return undefined;

  const exact = byDay.get(ageDays);
  if (exact) return exact;

  // Nearest earlier day fallback. Cap the scan at 31 days so a badly
  // incomplete dataset fails loudly instead of returning a 200-day-old row.
  for (let offset = 1; offset <= 31; offset += 1) {
    const candidate = byDay.get(ageDays - offset);
    if (candidate) return candidate;
  }
  return undefined;
}

/**
 * Compute the three growth Z-scores (weight-for-age, height-for-age,
 * BMI-for-age) plus head-circumference Z when the patient is under 36
 * months. Missing LMS rows yield `null` fields rather than fabricated
 * numbers — callers must surface that as "not measured against WHO",
 * not silently write a random value.
 */
export interface GrowthZResult {
  weightForAgeZscore: number | null;
  weightForAgePercentile: number | null;
  heightForAgeZscore: number | null;
  heightForAgePercentile: number | null;
  headCircumferenceZScore: number | null;
  headCircumferencePercentile: number | null;
}

export function computeGrowthZScores(args: {
  table: Map<WhoGenderKey, Map<WhoMetricKey, Map<number, WhoLmsRow>>>;
  gender: WhoGenderKey;
  ageDays: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm: number | null;
}): GrowthZResult {
  const { table, gender, ageDays, weightKg, heightCm, headCircumferenceCm } =
    args;

  const out: GrowthZResult = {
    weightForAgeZscore: null,
    weightForAgePercentile: null,
    heightForAgeZscore: null,
    heightForAgePercentile: null,
    headCircumferenceZScore: null,
    headCircumferencePercentile: null,
  };

  const weightRow = lookupWhoLms(table, gender, "weight", ageDays);
  if (weightRow) {
    const z = computeZScore(weightRow, weightKg);
    out.weightForAgeZscore = Number(z.toFixed(2));
    out.weightForAgePercentile = zScoreToPercentile(z);
  }

  const heightRow = lookupWhoLms(table, gender, "height", ageDays);
  if (heightRow) {
    const z = computeZScore(heightRow, heightCm);
    out.heightForAgeZscore = Number(z.toFixed(2));
    out.heightForAgePercentile = zScoreToPercentile(z);
  }

  // Head circumference is only meaningful under 36 months per WHO.
  //
  // NOTE: This schema stores only 'weight' and 'height' metricType values in
  // who_growth_data. WHO publishes a separate head-circumference-for-age
  // (hcfa) table that is NOT loaded here. Using the height LMS row to compute
  // a head-circ Z-score produces medically meaningless numbers — the M and S
  // parameters are for a completely different measurement.
  //
  // Until a 'head_circumference' metricType is added to the schema and the
  // corresponding WHO hcfa files are loaded by seed-who.ts, head-circ
  // Z-scores are always written as null. The caller (seedGrowthMeasurements)
  // already handles null gracefully.
  if (headCircumferenceCm !== null && ageDays <= 36 * 30.4375) {
    // No WHO hcfa table in this schema — leave headCircumferenceZScore/Percentile null.
    // Do not fall back to the height LMS row; that would silently produce
    // wrong Z-scores. Add hcfa support by extending WhoMetricKey and loading
    // 'hcfa-boys.json' / 'hcfa-girls.json' in seed-who.ts.
    void headCircumferenceCm; // acknowledged — kept in signature for future use
  }

  return out;
}

// ─── Row type aliases ───────────────────────────────────────
export type UserRow = typeof user.$inferSelect;
export type NewUserRow = typeof user.$inferInsert;
export type SessionRow = typeof session.$inferSelect;
export type AccountRow = typeof account.$inferSelect;
export type VerificationRow = typeof verification.$inferSelect;

export type ClinicRow = typeof clinics.$inferSelect;
export type ClinicSettingsRow = typeof clinicSettings.$inferSelect;
export type DepartmentRow = typeof departments.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type CounterRow = typeof counters.$inferSelect;

export type StaffRow = typeof staff.$inferSelect;
export type DoctorRow = typeof doctors.$inferSelect;
export type DoctorScheduleRow = typeof doctorSchedules.$inferSelect;
export type AppointmentRow = typeof appointments.$inferSelect;
export type EncounterRow = typeof encounters.$inferSelect;
export type NewEncounterRow = InferInsertModel<typeof encounters>;

export type DiagnosisRow = typeof diagnoses.$inferSelect;
export type NewDiagnosisRow = InferInsertModel<typeof diagnoses>;
export type GrowthMeasurementRow = typeof growthMeasurements.$inferSelect;
export type NewGrowthMeasurementRow = typeof growthMeasurements.$inferInsert;

export type PatientRow = typeof patients.$inferSelect;
export type NewPatientRow = typeof patients.$inferInsert;
export type GuardianRow = typeof guardians.$inferSelect;
export type PatientAllergyRow = typeof patientAllergies.$inferSelect;
export type PatientChronicConditionRow =
  typeof patientChronicConditions.$inferSelect;
export type PatientDocumentRow = typeof patientDocuments.$inferSelect;
export type MedicalRecordRow = typeof medicalRecords.$inferSelect;

export type PrescriptionRow = typeof prescriptions.$inferSelect;
export type PrescriptionItemRow = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItemRow = InferInsertModel<typeof prescriptionItems>;

export type WardRow = typeof wards.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type BedRow = typeof beds.$inferSelect;
export type AdmissionRow = typeof admissions.$inferSelect;
export type BedAllocationRow = typeof bedAllocations.$inferSelect;
export type ClinicalNoteRow = typeof clinicalNotes.$inferSelect;

export type LabTestRow = typeof labTests.$inferSelect;
export type LabOrderRow = typeof labOrders.$inferSelect;
export type LabOrderItemRow = typeof labOrderItems.$inferSelect;
export type NewLabOrderItemRow = InferInsertModel<typeof labOrderItems>;

export type ChargeCatalogRow = typeof chargeCatalog.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceItemRow = InferInsertModel<typeof invoiceItems>;
export type PaymentRow = typeof payments.$inferSelect;
export type ExpenseRow = typeof expenses.$inferSelect;

export type MedicineRow = typeof medicines.$inferSelect;
export type MedicineBatchRow = typeof medicineBatches.$inferSelect;
export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type DispensationRow = typeof dispensations.$inferSelect;
export type DispensationItemRow = typeof dispensationItems.$inferSelect;

export function resolveRepoRoot(startDir: string): string | null {
  let dir = startDir;
  let previousDir = "";

  while (dir && dir !== previousDir) {
    const hasDocs = fs.existsSync(path.join(dir, "docs", "data"));
    const hasPackages = fs.existsSync(path.join(dir, "packages"));
    if (hasDocs && hasPackages) {
      return dir;
    }
    previousDir = dir;
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Invert the WHO LMS Box-Cox transform: given an LMS row and a target
 * Z-score, produce the anthropometric value that maps to that Z.
 *
 *   value = M * (1 + L*S*Z)^(1/L)     for L ≠ 0
 *   value = M * exp(S*Z)              for L = 0
 */
export function valueFromZScore(
  lms: Pick<WhoLmsRow, "L" | "M" | "S">,
  z: number
): number {
  if (lms.L === 0) return lms.M * Math.exp(lms.S * z);
  return lms.M * (1 + lms.L * lms.S * z) ** (1 / lms.L);
}

/**
 * Draw a plausible Z-score from a normal distribution.
 *
 * The population SD of a healthy child's Z is ~0.6–0.8, not 1.0 — the
 * LMS tables are themselves fits to a reference population, so a child
 * sampled from that population has a slightly narrower Z distribution
 * than a pure standard normal.
 *
 * `sigma = 0.7` puts ~5% of children outside ±2σ, matching real-world
 * anthropometric surveys.
 */
export function sampleZScore(sigma = 0.7): number {
  // Box–Muller. One draw per call is fine; the seeder is not hot.
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
}

export function resolveWhoDataDir(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.WHO_DATA_DIR) return process.env.WHO_DATA_DIR;

  const repoRoot = resolveRepoRoot(import.meta.dirname);
  if (!repoRoot) {
    throw new Error(
      `Could not locate the repo root from ${import.meta.dirname}. ` +
        "Set WHO_DATA_DIR or pass an explicit directory."
    );
  }

  return path.join(repoRoot, "docs", "data");
}
export function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  // Only reachable if `weights` is empty or all-zero.
  return entries[entries.length - 1]![0];
}
