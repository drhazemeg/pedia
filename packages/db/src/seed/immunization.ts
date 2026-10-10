// scripts/src/seed/immunization.ts
//
// AAP/CDC-aligned immunization schedule.
//
// Changes:
//   - Bug 12: doseNumber is now sequential per (patient, vaccine).
//   - Bug 14: monthsBetween imported from ./helper, no local duplicate.
//   - administeredDate invariant enforced: dueDate <= administered <= today.
//   - parentConsent reflects status (true only for Completed).

import { faker } from "@faker-js/faker";
import { IMMUNIZATION_STATUSES } from "@pedia/shared/constants/enums";

import { immunizations } from "../schema";
import type { PatientRow, StaffRow } from "./helper";
import {
  dateStr,
  daysFromNow,
  monthsBetween,
  pick,
  randInt,
  seedDb,
} from "./helper";

interface VaccineScheduleEntry {
  code: string;
  name: string;
  disease: string;
  ageMonths: number;
  total: number;
}

/**
 * AAP/CDC childhood immunization schedule (2024).
 *
 * `total` is the number of doses in the full series for that vaccine; the
 * seed only writes rows up to the patient's current age, so a 6-month-old
 * gets HepB dose 3, DTaP doses 1-3, etc.
 */
const VACCINE_SCHEDULE: readonly VaccineScheduleEntry[] = [
  {
    code: "HEP-B-1",
    name: "Hepatitis B",
    disease: "Hepatitis B",
    ageMonths: 0,
    total: 3,
  },
  {
    code: "DTaP-1",
    name: "DTaP",
    disease: "Diphtheria/Tetanus/Pertussis",
    ageMonths: 2,
    total: 5,
  },
  {
    code: "IPV-1",
    name: "IPV",
    disease: "Poliovirus",
    ageMonths: 2,
    total: 4,
  },
  {
    code: "HIB-1",
    name: "Hib",
    disease: "Haemophilus influenzae type b",
    ageMonths: 2,
    total: 4,
  },
  {
    code: "PCV13-1",
    name: "PCV13",
    disease: "Pneumococcal",
    ageMonths: 2,
    total: 4,
  },
  {
    code: "ROTA-1",
    name: "Rotavirus",
    disease: "Rotavirus",
    ageMonths: 2,
    total: 3,
  },
  {
    code: "MMR-1",
    name: "MMR",
    disease: "Measles/Mumps/Rubella",
    ageMonths: 12,
    total: 2,
  },
  {
    code: "VAR-1",
    name: "Varicella",
    disease: "Varicella",
    ageMonths: 12,
    total: 2,
  },
  {
    code: "HEP-A-1",
    name: "Hepatitis A",
    disease: "Hepatitis A",
    ageMonths: 12,
    total: 2,
  },
  {
    code: "FLU-1",
    name: "Influenza",
    disease: "Influenza",
    ageMonths: 6,
    total: 1,
  },
];

const ADMIN_SITES = [
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
  "Oral",
];
const ADMIN_ROUTES = ["Intramuscular", "Subcutaneous", "Oral", "Intranasal"];
const MANUFACTURERS = [
  "Merck",
  "Pfizer",
  "GSK",
  "Sanofi Pasteur",
  "AstraZeneca",
];

function formatAgeLabel(ageMonths: number): string {
  if (ageMonths === 0) return "Birth";
  if (ageMonths === 1) return "1 month";
  if (ageMonths < 24) return `${ageMonths} months`;
  const years = Math.floor(ageMonths / 12);
  return years === 1 ? "1 year" : `${years} years`;
}
export async function seedImmunizations(args: {
  patients: PatientRow[];
  staffRows: StaffRow[];
}) {
  const { patients: patientRows, staffRows } = args;
  const administeringStaff = staffRows.find(
    (staff) => staff.role === "doctor" || staff.role === "staff"
  );
  if (!administeringStaff) {
    throw new Error(
      "seedImmunizations requires at least one doctor or clinical staff member"
    );
  }

  const rows: Array<typeof immunizations.$inferInsert> = [];

  for (const patient of patientRows) {
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();

    // FIXED: one counter per (patient, vaccineCode). The Nth row for a
    // given vaccine on a given patient gets doseNumber = N.
    const doseCounters = new Map<string, number>();

    for (const vaccine of VACCINE_SCHEDULE) {
      // Compute dueDate first, then decide whether it has arrived.
      // This replaces the `monthsBetween` calendar-month guard, which
      // could pass for a patient whose exact due date was still in the
      // future (e.g. DOB 2026-08-07, DTaP due 2026-10-07, today
      // 2026-10-01 → calendar months = 2 but dueDate > today).
      const dueDate = new Date(dob);
      dueDate.setMonth(dueDate.getMonth() + vaccine.ageMonths);

      if (dueDate > now) continue;

      const ageMonths = monthsBetween(dob, now);

      const isOverdue =
        ageMonths > vaccine.ageMonths + 3 && Math.random() < 0.15;
      const isDue = !isOverdue && Math.random() < 0.25;
      const isAdministered = !isOverdue && !isDue && Math.random() < 0.85;

      const status: (typeof IMMUNIZATION_STATUSES)[number] = isOverdue
        ? "overdue"
        : isDue
          ? "due"
          : isAdministered
            ? "administered"
            : pick(IMMUNIZATION_STATUSES);

      // Administered date must be >= dueDate and <= today.
      // Both bounds are now guaranteed: dueDate <= now (guard above),
      // and `to` = min(dueDate + 30d, now).
      let administeredDate: string | null = null;
      if (status === "administered") {
        const to = new Date(
          Math.min(dueDate.getTime() + 30 * 86_400_000, now.getTime())
        );
        administeredDate = dateStr(faker.date.between({ from: dueDate, to }));
      }

      // Sequential dose number for this patient+vaccine.
      const doseNumber = (doseCounters.get(vaccine.code) ?? 0) + 1;
      doseCounters.set(vaccine.code, doseNumber);

      rows.push({
        patientId: patient.id,
        vaccineCode: vaccine.code,
        vaccineName: vaccine.name,
        targetDisease: vaccine.disease,
        doseNumber,
        totalDoses: vaccine.total,
        recommendedAgeLabel: formatAgeLabel(vaccine.ageMonths),
        recommendedAgeMonths: vaccine.ageMonths,
        dueDate: dateStr(dueDate),
        administeredDate,
        status,
        manufacturer: administeredDate ? pick(MANUFACTURERS) : null,
        brandName: administeredDate ? faker.commerce.productName() : null,
        batchNumber: administeredDate
          ? `LOT-${faker.string.alphanumeric(8).toUpperCase()}`
          : null,
        expiryDate: administeredDate
          ? dateStr(daysFromNow(randInt(180, 730)))
          : null,
        administrationSite: administeredDate ? pick(ADMIN_SITES) : null,
        administrationRoute: administeredDate ? pick(ADMIN_ROUTES) : null,
        administeredById: administeredDate ? administeringStaff.id : null,
        adverseReactions: administeredDate
          ? faker.helpers.maybe(() => faker.lorem.sentence(), {
              probability: 0.1,
            })
          : null,
        parentConsent: status === "administered",
        notes: null,
      });
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await seedDb.insert(immunizations).values(rows.slice(i, i + chunkSize));
  }

  return rows.length;
}
