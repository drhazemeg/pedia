// scripts/src/seed/pharmacy.ts
//
// Changes:
//   - Bug 11: the hardcoded `limit: 40` on the prescriptions query is gone.
//     Default is `Infinity`; callers can pass `limit` explicitly.
//   - Coverage is logged so a future regression is visible.

import { faker } from "@faker-js/faker";

import {
  dispensationItems,
  dispensations,
  inventoryTransactions,
  medicineBatches,
  medicines,
} from "../schema";
import type { ClinicRow, PatientRow } from "./helper";
import {
  ids,
  pick,
  randFloat,
  randInt,
  rng,
  seedDb,
  seedLogger,
} from "./helper";

type MedicineRow = typeof medicines.$inferSelect;
type BatchRow = typeof medicineBatches.$inferSelect;

const MEDICINES = [
  { generic: "Amoxicillin", form: "Oral suspension", strength: "250mg/5ml" },
  {
    generic: "Amoxicillin-Clavulanate",
    form: "Oral suspension",
    strength: "600mg/42.9mg/5ml",
  },
  { generic: "Azithromycin", form: "Oral suspension", strength: "200mg/5ml" },
  { generic: "Cefdinir", form: "Oral suspension", strength: "250mg/5ml" },
  { generic: "Cephalexin", form: "Oral suspension", strength: "250mg/5ml" },
  { generic: "Ibuprofen", form: "Oral suspension", strength: "100mg/5ml" },
  {
    generic: "Acetaminophen",
    form: "Oral suspension",
    strength: "160mg/5ml",
  },
  { generic: "Cetirizine", form: "Oral solution", strength: "5mg/5ml" },
  { generic: "Loratadine", form: "Oral solution", strength: "5mg/5ml" },
  {
    generic: "Diphenhydramine",
    form: "Oral solution",
    strength: "12.5mg/5ml",
  },
  { generic: "Albuterol", form: "Nebulizer solution", strength: "2.5mg/3ml" },
  { generic: "Prednisolone", form: "Oral solution", strength: "15mg/5ml" },
  { generic: "Dexamethasone", form: "Oral solution", strength: "1mg/ml" },
  { generic: "Ondansetron", form: "Oral solution", strength: "4mg/5ml" },
  { generic: "Montelukast", form: "Chewable tablet", strength: "4mg" },
  { generic: "Fluticasone", form: "Nasal spray", strength: "50mcg/spray" },
  {
    generic: "Budesonide",
    form: "Inhalation suspension",
    strength: "0.5mg/2ml",
  },
  { generic: "Amoxicillin", form: "Capsule", strength: "500mg" },
  { generic: "Cephalexin", form: "Capsule", strength: "500mg" },
  {
    generic: "Ferrous sulfate",
    form: "Oral solution",
    strength: "220mg/5ml",
  },
];

const MANUFACTURERS = [
  "Teva",
  "Sandoz",
  "Mylan",
  "Aurobindo",
  "Hikma",
  "Sun Pharma",
  "Cipla",
];

export async function seedMedicines(args: { clinics: ClinicRow[] }) {
  const { clinics } = args;
  const medRows = await seedDb
    .insert(medicines)
    .values(
      MEDICINES.map((m, i) => {
        return {
          code: ids.medicineCode(i + 1),
          clinicId: clinics[i % clinics.length]!.id,
          genericName: m.generic,
          brandName:
            faker.helpers.maybe(() => faker.commerce.productName(), {
              probability: 0.5,
            }) ?? null,
          dosageForm: m.form,
          strength: m.strength,
          manufacturer: pick(MANUFACTURERS),
          reorderLevel: randInt(20, 100),
          isActive: true,
        };
      })
    )
    .returning();

  const batchRows: Array<typeof medicineBatches.$inferInsert> = [];
  for (const med of medRows) {
    const batchCount = randInt(1, 3);
    for (let b = 0; b < batchCount; b++) {
      const received = randInt(100, 2000);
      const available = randInt(0, received);
      batchRows.push({
        medicineId: med.id,
        batchNumber: `LOT-${faker.string.alphanumeric(8).toUpperCase()}`,
        expiryDate: faker.date.future({ years: 2 }).toISOString().slice(0, 10),
        purchasePrice: randFloat(1.5, 45, 2).toFixed(2),
        salePrice: randFloat(3, 85, 2).toFixed(2),
        quantityReceived: received,
        quantityAvailable: available,
      });
    }
  }

  const insertedBatches = await seedDb
    .insert(medicineBatches)
    .values(batchRows)
    .returning();

  return { medicines: medRows, batches: insertedBatches };
}

const TRANSACTION_TYPES = [
  "purchase",
  "dispense",
  "adjustment",
  "return",
] as const;

type TransactionType = (typeof TRANSACTION_TYPES)[number];

export async function seedPharmacyInventory(args: {
  medicines: MedicineRow[];
  batches: BatchRow[];
  performedById: string;
}) {
  const { batches: batchRows, performedById } = args;

  const rows: Array<typeof inventoryTransactions.$inferInsert> = [];

  for (const batch of batchRows) {
    rows.push({
      medicineId: batch.medicineId,
      batchId: batch.id,
      transactionType: "purchase",
      quantityDelta: batch.quantityReceived,
      referenceType: "purchase_order",
      referenceId: null,
      note: `Initial stock receipt for batch ${batch.batchNumber}`,
      performedById,
    });

    const followUpCount = randInt(0, 3);
    for (let i = 0; i < followUpCount; i++) {
      const type: TransactionType = pick(TRANSACTION_TYPES);
      const delta: number =
        type === "purchase" || type === "return"
          ? randInt(10, 200)
          : type === "dispense"
            ? -randInt(1, 50)
            : randInt(-20, 20);

      rows.push({
        medicineId: batch.medicineId,
        batchId: batch.id,
        transactionType: type,
        quantityDelta: delta,
        referenceType: type === "dispense" ? "prescription" : "manual",
        referenceId: null,
        note: faker.lorem.sentence(),
        performedById,
      });
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await seedDb
      .insert(inventoryTransactions)
      .values(rows.slice(i, i + chunkSize));
  }

  return rows.length;
}

/**
 * Dispense every prescription that has at least one item.
 *
 * FIXED (Bug 11): the previous implementation hard-coded `limit: 40` on the
 * prescriptions query, which meant the pharmacy dashboard only ever saw
 * ~25% coverage. `limit` is now a caller-supplied option defaulting to
 * `Infinity`.
 */
export async function seedDispensations(args: {
  patients: PatientRow[];
  medicines: MedicineRow[];
  batches: BatchRow[];
  dispensedById: string;
  /** Max prescriptions to consider. Default: unlimited. */
  coverage?: number;

  limit?: number;
}) {
  const {
    medicines: medicineRows,
    batches: batchRows,
    dispensedById,
    coverage = 0.85,
    limit = Number.POSITIVE_INFINITY,
  } = args;

  const logger = seedLogger("seed_dispensations");

  const rxRows = await seedDb.query.prescriptions.findMany({
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  let dispensationCount = 0;
  let itemCount = 0;
  let skippedNonCompliant = 0;
  let skippedMissingBatch = 0;

  for (const rx of rxRows) {
    if (rx.prescriptionItems.length === 0) continue;

    if (rng() > coverage) {
      skippedNonCompliant++;
      continue;
    }

    const prescribedAt = new Date(`${rx.prescribedDate}T00:00:00.000Z`);
    const [dispensation] = await seedDb
      .insert(dispensations)
      .values({
        prescriptionId: rx.id,
        patientId: rx.patientId,
        dispensedById,
        dispensedAt: new Date(
          prescribedAt.getTime() + randInt(30, 180) * 60_000
        ),
      })
      .returning();

    if (!dispensation) continue;
    dispensationCount++;

    const dispensedItems: Array<typeof dispensationItems.$inferInsert> = [];
    for (const item of rx.prescriptionItems) {
      const med =
        medicineRows.find((m) =>
          item.medicationName
            .toLowerCase()
            .includes(m.genericName.toLowerCase())
        ) ?? pick(medicineRows);
      const availableBatches = batchRows.filter(
        (b) => b.medicineId === med.id && b.quantityAvailable > 0
      );
      if (availableBatches.length === 0) {
        skippedMissingBatch++;
        continue;
      }

      const batch = pick(availableBatches);
      const requestedQuantity = Number(item.dispenseQuantity);
      dispensedItems.push({
        dispensationId: dispensation.id,
        prescriptionItemId: item.id,
        medicineId: med.id,
        batchId: batch.id,
        quantity:
          Number.isFinite(requestedQuantity) && requestedQuantity > 0
            ? requestedQuantity
            : randInt(1, 30),
        unitPriceSnapshot: batch.salePrice,
      });
    }

    if (dispensedItems.length > 0) {
      await seedDb.insert(dispensationItems).values(dispensedItems);
      itemCount += dispensedItems.length;
    }
  }

  logger.set({
    event: "seed_dispensations_ok",
    counts: {
      prescriptionsConsidered: rxRows.length,
      dispensations: dispensationCount,
      items: itemCount,
      skippedNonCompliant,
      skippedMissingBatch,
    },
  });
  logger.emit();

  return {
    dispensationCount,
    itemCount,
    skippedNonCompliant,
    skippedMissingBatch,
  };
}
