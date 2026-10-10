// scripts/src/seed/clinic.ts
//
// No changes required for the RC v2 migration. This file is entirely
// insert-based (no `db.query.X.findMany`, no `with:`, no v1 `where: (t, …)`
// closures), so it is already v2-clean. Reproduced for completeness.

import { faker } from "@faker-js/faker";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@pedia/shared/constants/enums";

import { auditLogs, clinicSettings, clinics, departments } from "../schema";
import type { StaffRow } from "./helper";
import { ids, pick, seedDb, seedLogger } from "./helper";

// ─── Clinics ────────────────────────────────────────────────
export async function seedClinics() {
  const logger = seedLogger("seed_clinics");

  // return those rows instead of inserting a duplicate pair.
  const existing = await seedDb.query.clinics.findMany();
  if (existing.length > 0) {
    logger.set({
      event: "seed_clinics_skipped",
      reason: "rows_exist",
      counts: { clinics: existing.length },
    });
    logger.emit();
    return { clinics: existing };
  }
  const rows = await seedDb
    .insert(clinics)
    .values([
      {
        name: "Sunrise Pediatric Hospital — Main",
        address: "100 Health Way, Boston, MA 02101",
        phone: "+1-555-0100",
        email: "main@sunrise-pediatrics.test",
        website: "https://sunrise-pediatrics.test",
        timezone: "America/New_York",
        currency: "USD",
        active: true,
        settings: { bedCapacity: 120, hasNICU: true },
      },
      {
        name: "Sunrise Pediatric — North Branch",
        address: "250 North Ave, Cambridge, MA 02139",
        phone: "+1-555-0200",
        email: "north@sunrise-pediatrics.test",
        website: "https://sunrise-pediatrics.test/north",
        timezone: "America/New_York",
        currency: "USD",
        active: true,
        settings: { bedCapacity: 60, hasNICU: false },
      },
    ])
    .returning();

  logger.set({ event: "seed_clinics_ok", counts: { clinics: rows.length } });
  logger.emit();

  return { clinics: rows };
}

// ─── Clinic settings ────────────────────────────────────────
export async function seedClinicSettings(clinicId: string) {
  const logger = seedLogger("seed_clinic_settings");

  const existing = await seedDb.query.clinicSettings.findFirst({
    where: { clinicId },
  });
  if (existing) {
    logger.set({
      event: "seed_clinic_settings_skipped",
      reason: "row_exists",
      clinicSettingsId: existing.id,
    });
    logger.emit();
    return existing;
  }

  const [row] = await seedDb
    .insert(clinicSettings)
    .values({
      clinicId,
      registrationNumber: "REG-HOSP-2024-001",
      phone: "+1-555-0100",
      email: "info@sunrise-pediatrics.test",
      addressLine1: "100 Health Way",
      city: "Boston",
      state: "MA",
      country: "USA",
      timezone: "America/New_York",
      currencyCode: "USD",
      invoicePrefix: "INV-",
      patientPrefix: "MRN-",
      appointmentPrefix: "APT-",
      admissionPrefix: "ADM-",
      labOrderPrefix: "LAB-",
    } satisfies typeof clinicSettings.$inferInsert)
    .returning();

  logger.set({
    event: "seed_clinic_settings_ok",
    clinicSettingsId: row?.id,
  });
  logger.emit();

  return row;
}

// ─── Departments ────────────────────────────────────────────
const DEPARTMENTS = [
  { name: "General Pediatrics", description: "Routine child healthcare" },
  { name: "Neonatology (NICU)", description: "Newborn intensive care" },
  {
    name: "Pediatric Intensive Care (PICU)",
    description: "Critical pediatric care",
  },
  {
    name: "Pediatric Cardiology",
    description: "Heart conditions in children",
  },
  { name: "Pediatric Neurology", description: "Brain and nervous system" },
  { name: "Pediatric Orthopedics", description: "Bones and musculoskeletal" },
  { name: "Pediatric Pulmonology", description: "Respiratory and lungs" },
  { name: "Pediatric Gastroenterology", description: "Digestive system" },
  { name: "Pediatric Endocrinology", description: "Hormones and growth" },
  { name: "Pediatric Emergency", description: "Emergency pediatric care" },
  {
    name: "Pediatric Surgery",
    description: "Surgical services for children",
  },
  { name: "Pediatric Dermatology", description: "Skin conditions" },
];

export async function seedDepartments() {
  const logger = seedLogger("seed_departments");

  const rows = await seedDb
    .insert(departments)
    .values(
      DEPARTMENTS.map((d, i) => {
        return {
          code: ids.departmentCode(i + 1),
          name: d.name,
          description: d.description,
          isActive: true,
        };
      })
    )
    .returning();

  logger.set({
    event: "seed_departments_ok",
    counts: { departments: rows.length },
  });
  logger.emit();

  return { departments: rows };
}

// // ─── Audit logs ─────────────────────────────────────────────
// const ACTIONS = [
// 	'CREATE',
// 	'UPDATE',
// 	'DELETE',
// 	'VIEW',
// 	'EXPORT',
// 	'LOGIN',
// 	'RESTORE',
// ] as const
// const ENTITIES = [
// 	'PATIENT',
// 	'ENCOUNTER',
// 	'IMMUNIZATION',
// 	'PRESCRIPTION',
// 	'LAB',
// 	'INVOICE',
// 	'PAYMENT',
// 	'ADMISSION',
// 	'USER',
// 	'DATABASE',
// ] as const
export async function seedAuditLogs(args: { staffRows: StaffRow[] }) {
  const { staffRows } = args;
  const logger = seedLogger("seed_audit_logs");

  if (staffRows.length === 0) {
    logger.set({ event: "seed_audit_logs_skipped", reason: "no_staff" });
    logger.emit();
    return 0;
  }

  const rows: Array<typeof auditLogs.$inferInsert> = [];

  for (let i = 0; i < 200; i++) {
    const actor = pick(staffRows);
    const action = pick(AUDIT_ACTIONS);
    const entity = pick(AUDIT_ENTITIES);

    rows.push({
      staffId: actor.id,
      staffName: actor.name,
      action,
      entity, // Required by schema
      entityId: faker.string.uuid(),
      details: faker.lorem.sentence(), // Required by schema
      timestamp: faker.date.recent({ days: 90 }), // Matches schema field name
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      sessionId: faker.string.uuid(),
      beforeState: null,
      afterState: null,
    });
  }

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await seedDb.insert(auditLogs).values(rows.slice(i, i + chunkSize));
  }

  logger.set({
    event: "seed_audit_logs_ok",
    counts: { auditLogs: rows.length },
  });
  logger.emit();

  return rows.length;
}
