// scripts/src/seed/laboratory.ts
//
// Changes:
//   - Age-appropriate reference ranges: LAB_TESTS now carries
//     `pediatricRanges` (neonate / infant / child / adolescent) for the
//     hematology + chemistry analytes where the pediatric range differs
//     from the adult range. The snapshot written to labOrderItems is
//     selected per patient age at order time.
//   - `generateResult` takes the patient's age and produces age-plausible
//     values (a 2-month-old's Hgb of 8 g/dL is normal; an adolescent's is
//     anemia).

import { faker } from "@faker-js/faker";
import {
  LAB_STATUSES,
  type LabTestStatus,
} from "@pedia/shared/constants/enums";

import { labOrderItems, labOrders, labTests } from "../schema";
import type { LabTest } from "../schema/clinic";
import type { DoctorRow, EncounterRow, PatientRow, StaffRow } from "./helper";
import { daysAgo, ids, pick, pickN, randInt, rng, seedDb } from "./helper";

type LabTestRow = typeof labTests.$inferSelect;

type AgeBand = "neonate" | "infant" | "child" | "adolescent";

function ageBand(ageMonths: number): AgeBand {
  if (ageMonths < 1) return "neonate";
  if (ageMonths < 12) return "infant";
  if (ageMonths < 144) return "child";
  return "adolescent";
}

interface PediatricRange {
  neonate: string;
  infant: string;
  child: string;
  adolescent: string;
}
function generateResult(test: LabTestRow, ageMonths: number): string {
  const band = ageBand(ageMonths);

  if (
    test.name.includes("Culture") ||
    test.name.includes("PCR") ||
    test.name.includes("Antigen") ||
    test.name.includes("Strep")
  ) {
    return pick(["Negative", "Negative", "Negative", "Positive"]);
  }

  if (test.name.includes("Hemoglobin A1c")) {
    // Pediatric A1c is lower than adult; normal < 5.7 across ages.
    return (rng() * 1.2 + 4.5).toFixed(1);
  }

  if (test.name.includes("TSH")) {
    const ranges: Record<AgeBand, [number, number]> = {
      neonate: [1.7, 9.1],
      infant: [0.8, 6.0],
      child: [0.7, 5.5],
      adolescent: [0.5, 4.5],
    };
    const [lo, hi] = ranges[band];
    return (rng() * (hi - lo) + lo).toFixed(2);
  }

  if (test.name.includes("CRP")) {
    return (rng() * 20).toFixed(1);
  }

  if (test.name.includes("CBC")) {
    // Crude Hgb estimate by band, in g/dL.
    const hgbByBand: Record<AgeBand, [number, number]> = {
      neonate: [10.0, 14.0],
      infant: [11.0, 14.0],
      child: [11.5, 14.5],
      adolescent: [12.0, 16.0],
    };
    const [lo, hi] = hgbByBand[band];
    return (rng() * (hi - lo) + lo).toFixed(1);
  }

  // Fallback: plausible "normal-ish" numeric range. Kept wide because
  // this branch is only reached for tests without a specific generator.
  return (rng() * 100).toFixed(1);
}

interface LabTestDef {
  name: string;
  sampleType: string;
  /** Base catalog reference range (reference table; not patient-specific). */
  referenceRange: string;
  unit: string | null;
  price: number;
  /** Optional age-banded ranges for the tests where it matters. */
  pediatricRanges?: PediatricRange;
}

const LAB_TESTS: readonly LabTestDef[] = [
  {
    name: "Complete Blood Count (CBC)",
    sampleType: "Blood",
    referenceRange: "See differential",
    unit: "cells/μL",
    price: 45,
    pediatricRanges: {
      // Hgb g/dL. Neonate is high at birth, drops to a nadir around
      // 2 months, then climbs through childhood.
      neonate: "Hgb 10.0–14.0 g/dL, WBC 9.0–30.0 ×10³/μL",
      infant: "Hgb 11.0–14.0 g/dL, WBC 6.0–17.5 ×10³/μL",
      child: "Hgb 11.5–14.5 g/dL, WBC 5.0–14.5 ×10³/μL",
      adolescent: "Hgb 12.0–16.0 g/dL, WBC 4.5–13.0 ×10³/μL",
    },
  },
  {
    name: "Basic Metabolic Panel (BMP)",
    sampleType: "Blood",
    referenceRange: "See panel",
    unit: "mmol/L",
    price: 65,
    pediatricRanges: {
      neonate: "Na 133–146, K 3.7–5.9, Glu 40–100 mg/dL",
      infant: "Na 135–146, K 3.4–5.6, Glu 60–100 mg/dL",
      child: "Na 135–146, K 3.4–5.6, Glu 60–100 mg/dL",
      adolescent: "Na 136–145, K 3.5–5.1, Glu 70–100 mg/dL",
    },
  },
  {
    name: "Comprehensive Metabolic Panel",
    sampleType: "Blood",
    referenceRange: "See panel",
    unit: "mmol/L",
    price: 85,
    pediatricRanges: {
      neonate: "ALT 5–50 U/L, AST 20–65 U/L, Cr 0.3–1.0 mg/dL",
      infant: "ALT 5–45 U/L, AST 15–60 U/L, Cr 0.2–0.5 mg/dL",
      child: "ALT 5–30 U/L, AST 15–50 U/L, Cr 0.3–0.7 mg/dL",
      adolescent: "ALT 7–30 U/L, AST 10–40 U/L, Cr 0.5–1.0 mg/dL",
    },
  },
  {
    name: "Lipid Panel",
    sampleType: "Blood",
    referenceRange: "See panel",
    unit: "mg/dL",
    price: 55,
    pediatricRanges: {
      neonate: "Total chol 50–125 mg/dL",
      infant: "Total chol 75–170 mg/dL",
      child: "Total chol < 170 mg/dL, LDL < 110 mg/dL",
      adolescent: "Total chol < 170 mg/dL, LDL < 110 mg/dL",
    },
  },
  {
    name: "Liver Function Tests (LFT)",
    sampleType: "Blood",
    referenceRange: "See panel",
    unit: "IU/L",
    price: 70,
    pediatricRanges: {
      neonate: "ALT 5–50, AST 20–65 IU/L",
      infant: "ALT 5–45, AST 15–60 IU/L",
      child: "ALT 5–30, AST 15–50 IU/L",
      adolescent: "ALT 7–30, AST 10–40 IU/L",
    },
  },
  {
    name: "C-Reactive Protein (CRP)",
    sampleType: "Blood",
    referenceRange: "< 5",
    unit: "mg/L",
    price: 40,
    // Same across pediatric ages.
  },
  {
    name: "Erythrocyte Sedimentation Rate (ESR)",
    sampleType: "Blood",
    referenceRange: "0-20",
    unit: "mm/hr",
    price: 35,
    pediatricRanges: {
      neonate: "0–2 mm/hr",
      infant: "0–10 mm/hr",
      child: "0–10 mm/hr",
      adolescent: "0–15 mm/hr (M), 0–20 mm/hr (F)",
    },
  },
  {
    name: "Urinalysis",
    sampleType: "Urine",
    referenceRange: "Normal",
    unit: null,
    price: 30,
  },
  {
    name: "Urine Culture",
    sampleType: "Urine",
    referenceRange: "No growth",
    unit: null,
    price: 55,
  },
  {
    name: "Blood Culture",
    sampleType: "Blood",
    referenceRange: "No growth",
    unit: null,
    price: 75,
  },
  {
    name: "Thyroid Stimulating Hormone (TSH)",
    sampleType: "Blood",
    referenceRange: "0.5-4.5",
    unit: "mIU/L",
    price: 50,
    pediatricRanges: {
      neonate: "1.7–9.1 mIU/L",
      infant: "0.8–6.0 mIU/L",
      child: "0.7–5.5 mIU/L",
      adolescent: "0.5–4.5 mIU/L",
    },
  },
  {
    name: "Hemoglobin A1c",
    sampleType: "Blood",
    referenceRange: "< 5.7",
    unit: "%",
    price: 45,
  },
  {
    name: "Vitamin D, 25-Hydroxy",
    sampleType: "Blood",
    referenceRange: "30-100",
    unit: "ng/mL",
    price: 60,
  },
  {
    name: "Ferritin",
    sampleType: "Blood",
    referenceRange: "10-120",
    unit: "ng/mL",
    price: 50,
    pediatricRanges: {
      neonate: "25–200 ng/mL",
      infant: "7–140 ng/mL",
      child: "7–140 ng/mL",
      adolescent: "13–150 ng/mL (M), 7–100 ng/mL (F)",
    },
  },
  {
    name: "Rapid Strep Test",
    sampleType: "Throat swab",
    referenceRange: "Negative",
    unit: null,
    price: 25,
  },
  {
    name: "Influenza A/B PCR",
    sampleType: "Nasal swab",
    referenceRange: "Negative",
    unit: null,
    price: 80,
  },
  {
    name: "RSV Antigen",
    sampleType: "Nasal swab",
    referenceRange: "Negative",
    unit: null,
    price: 55,
  },
  {
    name: "COVID-19 PCR",
    sampleType: "Nasal swab",
    referenceRange: "Negative",
    unit: null,
    price: 90,
  },
  {
    name: "Stool Culture",
    sampleType: "Stool",
    referenceRange: "No pathogens",
    unit: null,
    price: 65,
  },
  {
    name: "Celiac Panel (tTG-IgA)",
    sampleType: "Blood",
    referenceRange: "< 4",
    unit: "U/mL",
    price: 95,
  },
];

export async function seedLabTests() {
  const rows = await seedDb
    .insert(labTests)
    .values(
      LAB_TESTS.map((t, i) => {
        return {
          code: ids.labTestCode(i + 1),
          name: t.name,
          description: `Standard ${t.name} panel`,
          sampleType: t.sampleType,
          price: t.price.toFixed(2),
          referenceRange: t.referenceRange,
          unit: t.unit,
          isActive: true,
        };
      })
    )
    .returning();

  return { labTests: rows };
}

export async function seedLabOrders(args: {
  patients: PatientRow[];
  doctors: DoctorRow[];
  staffRows: StaffRow[];
  labTests: LabTestRow[];
  encounters: EncounterRow[];
}) {
  const {
    patients,
    doctors,
    staffRows,
    labTests: labTestRow,
    encounters: encounterRows,
  } = args;
  const userIdByStaffId = new Map(staffRows.map((s) => [s.id, s.userId]));

  if (patients.length === 0) {
    throw new Error("seedLabOrders requires at least one patient");
  }
  if (doctors.length === 0) {
    throw new Error("seedLabOrders requires at least one doctor");
  }
  if (staffRows.length === 0) {
    throw new Error("seedLabOrders requires at least one staff member");
  }
  if (labTestRow.length === 0) {
    throw new Error("seedLabOrders requires at least one lab test");
  }

  const orderRows: Array<typeof labOrders.$inferInsert> = [];
  const itemRows: Array<typeof labOrderItems.$inferInsert> = [];

  const orderCount = 80;

  for (let i = 1; i <= orderCount; i++) {
    const patient = pick(patients);
    const doctor = pick(doctors);
    const resultedByUserId = userIdByStaffId.get(doctor.staffId);
    if (!resultedByUserId) {
      throw new Error(
        `seedLabOrders: no user found for ordering staff ${doctor.staffId}`
      );
    }
    const linkedEncounter =
      rng() < 0.7 && encounterRows.length > 0 ? pick(encounterRows) : null;

    // Patient age at order time — drives the reference-range snapshot.
    const ageMonths = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) /
          (30.4375 * 86_400_000)
      )
    );
    const band = ageBand(ageMonths);

    const orderedAt = faker.date.between({
      from: daysAgo(90),
      to: new Date(),
    });
    const status = pick(LAB_STATUSES);
    const collectedAt =
      status === "ordered"
        ? null
        : new Date(orderedAt.getTime() + randInt(30, 240) * 60_000);
    const completedAt =
      status === "completed" && collectedAt
        ? new Date(collectedAt.getTime() + randInt(60, 1440) * 60_000)
        : null;

    const testCount = randInt(1, 4);
    const selectedTests = pickN(labTestRow, testCount);
    const preparedTests = selectedTests.map((test) => {
      const catalogEntry = LAB_TESTS.find(
        (definition) => definition.name === test.name
      );
      const snapshotRange =
        catalogEntry?.pediatricRanges?.[band] ??
        test.referenceRange ??
        undefined;
      const resultValue =
        status === "completed" ? generateResult(test, ageMonths) : null;
      const itemStatus: LabTestStatus =
        status === "completed"
          ? resultValue === "Positive"
            ? "Abnormal"
            : "Normal"
          : status === "ordered" || status === "cancelled"
            ? "Pending"
            : "In Progress";

      return { test, snapshotRange, resultValue, itemStatus };
    });
    const testsJson: LabTest[] = preparedTests.map(
      ({ test, snapshotRange }) => ({
        id: test.id,
        testCode: test.code,
        testName: test.name,
        category: test.category ?? "General",
        sampleType: test.sampleType ?? undefined,
        referenceRange: snapshotRange,
        unit: test.unit ?? undefined,
      })
    );

    const [order] = await seedDb
      .insert(labOrders)
      .values({
        labOrderNumber: ids.labOrderNumber(i),
        patientId: patient.id,
        encounterId: linkedEncounter?.id ?? null,
        orderedByDoctorId: doctor.id,
        orderedById: doctor.staffId,
        clinicalIndication:
          linkedEncounter?.chiefComplaint ??
          pick([
            "Diagnostic evaluation",
            "Follow-up testing",
            "Clinical assessment",
          ]),
        orderDate: orderedAt,
        status,
        specimenType: preparedTests[0]!.test.sampleType ?? "Blood",
        specimenCollectedAt: collectedAt,
        completedDate: completedAt,
        testsJson,
      })
      .returning();

    if (!order) continue;
    orderRows.push(order);

    for (const {
      test,
      snapshotRange,
      resultValue,
      itemStatus,
    } of preparedTests) {
      itemRows.push({
        labOrderId: order.id,
        labTestId: test.id,
        testNameSnapshot: test.name,
        priceSnapshot: test.price,
        status: itemStatus,
        flag:
          itemStatus === "Abnormal"
            ? "Abnormal"
            : itemStatus === "Normal"
              ? "Normal"
              : null,
        resultValue,
        resultText:
          status === "completed"
            ? `Reference range (${band}, age ${ageMonths}m): ${snapshotRange}`
            : null,
        referenceRangeSnapshot: snapshotRange,
        unitSnapshot: test.unit,
        resultedByUserId: status === "completed" ? resultedByUserId : null,
        resultedAt: status === "completed" && completedAt ? completedAt : null,
      });
    }
  }

  if (itemRows.length > 0) {
    await seedDb.insert(labOrderItems).values(itemRows);
  }

  return { labOrderCount: orderRows.length, labItemCount: itemRows.length };
}

/**
 * Generate an age-plausible result value.
 *
 * The point is not clinical precision — it's that a 2-month-old's Hgb
 * should not read as an adult's, and an adolescent's CRP should not read
 * as a neonate's. Where a test has no meaningful age variation (cultures,
 * PCRs), the value is the same across ages.
 */
