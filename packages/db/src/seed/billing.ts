// scripts/src/seed/billing.ts
//
// Changes:
//   - CHARGES now carries real CPT codes (99213, 99214, 90460, 90670, …)
//     instead of synthetic CHG-0001 identifiers. The chargeCatalog.code
//     column holds the code a billing system can look up.
//   - Invoice line items carry `sourceType: 'cpt'` when the charge has a
//     real CPT code, so downstream reporting can distinguish.

import { faker } from "@faker-js/faker";
import { PAYMENT_METHODS } from "@pedia/shared/constants/enums";

import { db } from "..";
import {
  chargeCatalog,
  expenses,
  type InvoiceStatus,
  invoiceItems,
  invoices,
  payments,
} from "../schema";
import type { InvoiceRow, NewInvoiceItemRow, PatientRow } from "./helper";
import {
  chance,
  daysAgo,
  ids,
  pick,
  pickN,
  pickWeighted,
  randFloat,
  randInt,
  rng,
  seedDb,
} from "./helper";

interface ChargeDef {
  cpt: string | null;
  name: string;
  category: string;
  amount: number;
}
const INVOICE_STATUS_WEIGHTS: Record<InvoiceStatus, number> = {
  paid: 55,
  issued: 20,
  partially_paid: 8,
  overdue: 6,
  draft: 5,
  cancelled: 4,
};

/**
 * Pediatric charge catalog with real CPT codes.
 *
 * Preventive visits: 99381-99395 (age-banded).
 * Office/outpatient E/M: 99202-99215.
 * Immunization administration: 90460 (first component), 90461 (each
 * additional).
 * Common labs/procedures: 36415 (venipuncture), 85025 (CBC w/ diff),
 * 94760 (pulse ox), 94640 (nebulizer treatment).
 */
const CHARGES: readonly ChargeDef[] = [
  // ── Preventive medicine (well-child) ────────────────────────
  {
    cpt: "99381",
    name: "Well-Child Visit — New Patient, Infant",
    category: "Preventive",
    amount: 250,
  },
  {
    cpt: "99382",
    name: "Well-Child Visit — New Patient, 1-4 yrs",
    category: "Preventive",
    amount: 240,
  },
  {
    cpt: "99383",
    name: "Well-Child Visit — New Patient, 5-11 yrs",
    category: "Preventive",
    amount: 230,
  },
  {
    cpt: "99384",
    name: "Well-Child Visit — New Patient, 12-17 yrs",
    category: "Preventive",
    amount: 240,
  },
  {
    cpt: "99391",
    name: "Well-Child Visit — Established, Infant",
    category: "Preventive",
    amount: 200,
  },
  {
    cpt: "99392",
    name: "Well-Child Visit — Established, 1-4 yrs",
    category: "Preventive",
    amount: 190,
  },
  {
    cpt: "99393",
    name: "Well-Child Visit — Established, 5-11 yrs",
    category: "Preventive",
    amount: 185,
  },
  {
    cpt: "99394",
    name: "Well-Child Visit — Established, 12-17 yrs",
    category: "Preventive",
    amount: 195,
  },

  // ── Office/outpatient E/M ───────────────────────────────────
  {
    cpt: "99203",
    name: "New Patient Office Visit, Low Complexity",
    category: "Consultation",
    amount: 180,
  },
  {
    cpt: "99204",
    name: "New Patient Office Visit, Moderate Complexity",
    category: "Consultation",
    amount: 250,
  },
  {
    cpt: "99213",
    name: "Established Patient Office Visit, Low Complexity",
    category: "Consultation",
    amount: 130,
  },
  {
    cpt: "99214",
    name: "Established Patient Office Visit, Moderate Complexity",
    category: "Consultation",
    amount: 190,
  },
  {
    cpt: "99215",
    name: "Established Patient Office Visit, High Complexity",
    category: "Consultation",
    amount: 260,
  },

  // ── Immunization administration + vaccines ──────────────────
  {
    cpt: "90460",
    name: "Immunization Administration — First Component",
    category: "Preventive",
    amount: 40,
  },
  {
    cpt: "90461",
    name: "Immunization Administration — Each Additional",
    category: "Preventive",
    amount: 20,
  },
  {
    cpt: "90670",
    name: "PCV13 Vaccine",
    category: "Preventive",
    amount: 145,
  },
  { cpt: "90707", name: "MMR Vaccine", category: "Preventive", amount: 95 },
  { cpt: "90715", name: "Tdap Vaccine", category: "Preventive", amount: 75 },

  // ── Procedures ──────────────────────────────────────────────
  {
    cpt: "94640",
    name: "Nebulizer Treatment",
    category: "Procedure",
    amount: 85,
  },
  { cpt: "94760", name: "Pulse Oximetry", category: "Procedure", amount: 25 },
  {
    cpt: "12001",
    name: "Wound Dressing — Minor",
    category: "Procedure",
    amount: 120,
  },
  {
    cpt: "12002",
    name: "Wound Dressing — Complex",
    category: "Procedure",
    amount: 280,
  },
  {
    cpt: "96360",
    name: "IV Fluid Administration, Initial Hour",
    category: "Procedure",
    amount: 180,
  },
  { cpt: "15850", name: "Suture Removal", category: "Procedure", amount: 75 },

  // ── Laboratory ──────────────────────────────────────────────
  { cpt: "36415", name: "Venipuncture", category: "Laboratory", amount: 15 },
  {
    cpt: "85025",
    name: "Complete Blood Count with Differential",
    category: "Laboratory",
    amount: 45,
  },
  {
    cpt: "80053",
    name: "Comprehensive Metabolic Panel",
    category: "Laboratory",
    amount: 65,
  },
  {
    cpt: "81003",
    name: "Urinalysis, Automated",
    category: "Laboratory",
    amount: 30,
  },
  {
    cpt: "87880",
    name: "Rapid Strep Test",
    category: "Laboratory",
    amount: 25,
  },

  // ── Imaging ─────────────────────────────────────────────────
  {
    cpt: "71046",
    name: "Chest X-Ray, 2 Views",
    category: "Imaging",
    amount: 220,
  },
  {
    cpt: "76700",
    name: "Abdominal Ultrasound, Complete",
    category: "Imaging",
    amount: 380,
  },
  {
    cpt: "93306",
    name: "Echocardiogram, Complete",
    category: "Imaging",
    amount: 850,
  },

  // ── Room & board ────────────────────────────────────────────
  {
    cpt: "99231",
    name: "General Ward Room — Day",
    category: "Room & Board",
    amount: 400,
  },
  {
    cpt: "99232",
    name: "PICU Room — Day",
    category: "Room & Board",
    amount: 1200,
  },
  {
    cpt: "99468",
    name: "NICU Room — Day",
    category: "Room & Board",
    amount: 1500,
  },
  {
    cpt: "99221",
    name: "Private Room — Day",
    category: "Room & Board",
    amount: 700,
  },

  // ── Nursing & therapy ───────────────────────────────────────
  {
    cpt: "97110",
    name: "Physical Therapy Session",
    category: "Therapy",
    amount: 180,
  },
  {
    cpt: "92507",
    name: "Speech Therapy Session",
    category: "Therapy",
    amount: 175,
  },
  {
    cpt: "97530",
    name: "Occupational Therapy Session",
    category: "Therapy",
    amount: 190,
  },
  { cpt: null, name: "Nursing — Hourly", category: "Nursing", amount: 90 },
];

export async function seedChargeCatalog() {
  const rows = await db
    .insert(chargeCatalog)
    .values(
      CHARGES.map((c, i) => {
        return {
          // Real CPT when available; synthetic fallback for the
          // handful of line items with no CPT (e.g. hourly nursing).
          code: c.cpt ?? ids.chargeCode(i + 1),
          name: c.name,
          category: c.category,
          defaultAmount: c.amount.toFixed(2),
          isActive: true,
        };
      })
    )
    .returning();

  return rows.length;
}

export async function seedInvoices(args: {
  patients: PatientRow[];
  createdById: string;
}) {
  const { patients, createdById } = args;

  const catalogItems = (await seedDb.query.chargeCatalog.findMany()) as Array<
    typeof chargeCatalog.$inferSelect
  >;
  if (catalogItems.length === 0) {
    throw new Error("Charge catalog must be seeded before invoices");
  }

  const invoiceCount = 60;
  const invoiceRows: InvoiceRow[] = [];
  const itemRows: NewInvoiceItemRow[] = [];

  for (let i = 1; i <= invoiceCount; i++) {
    const patient = pick(patients);
    const status = pickWeighted(INVOICE_STATUS_WEIGHTS);
    const issuedAt =
      status === "draft"
        ? null
        : faker.date.between({ from: daysAgo(120), to: new Date() });
    const createdAt = issuedAt ?? daysAgo(randInt(1, 120));

    const lineCount = randInt(1, 6);
    const selectedCharges = pickN(catalogItems, lineCount) as Array<
      typeof chargeCatalog.$inferSelect
    >;

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const lineItems: NewInvoiceItemRow[] = [];

    for (const charge of selectedCharges) {
      const quantity = randInt(1, 3);
      const unitPrice = Number(charge.defaultAmount);
      const discount = chance(0.15)
        ? Number((unitPrice * quantity * 0.1).toFixed(2))
        : 0;
      const tax = Number(((unitPrice * quantity - discount) * 0.05).toFixed(2));
      const lineTotal = Number(
        (unitPrice * quantity - discount + tax).toFixed(2)
      );

      subtotal += unitPrice * quantity;
      discountTotal += discount;
      taxTotal += tax;

      // CPT codes are 5 digits; synthetic CHG- codes are not.
      const isCpt = /^\d{5}$/.test(charge.code);

      lineItems.push({
        invoiceId: "",
        sourceType: isCpt ? "cpt" : "charge_catalog",
        sourceId: charge.id,
        descriptionSnapshot: isCpt
          ? `${charge.code} — ${charge.name}`
          : charge.name,
        quantity: quantity.toFixed(2),
        unitPrice: unitPrice.toFixed(2),
        discountAmount: discount.toFixed(2),
        taxAmount: tax.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));
    const amountPaid =
      status === "paid"
        ? grandTotal
        : status === "partially_paid"
          ? Number((grandTotal * (rng() * 0.6 + 0.2)).toFixed(2))
          : 0;
    const balanceDue = Number((grandTotal - amountPaid).toFixed(2));

    const [invoice] = await seedDb
      .insert(invoices)
      .values({
        invoiceNumber: ids.invoiceNumber(i),
        patientId: patient.id,
        encounterId: null,
        admissionId: null,
        status,
        currencyCode: "USD",
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        issuedAt,
        dueAt: issuedAt ? new Date(issuedAt.getTime() + 30 * 86_400_000) : null,
        createdById,
        createdAt,
      })
      .returning();

    if (!invoice) continue;
    invoiceRows.push(invoice);

    for (const item of lineItems) {
      itemRows.push({
        ...item,
        invoiceId: invoice.id,
      });
    }
  }

  if (itemRows.length > 0) {
    await seedDb.insert(invoiceItems).values(itemRows);
  }

  return { invoices: invoiceRows, itemCount: itemRows.length };
}

export async function seedPayments(args: {
  invoices: InvoiceRow[];
  receivedById: string;
}) {
  const { invoices: invoiceRow, receivedById } = args;

  const rows: Array<typeof payments.$inferInsert> = [];

  let counter = 1;
  for (const invoice of invoiceRow) {
    if (invoice.status === "draft" || invoice.status === "issued") continue;
    if (Number(invoice.amountPaid) === 0) continue;

    const paymentCount = randInt(1, 2);
    const total = Number(invoice.amountPaid);
    let remaining = total;

    for (let i = 0; i < paymentCount; i++) {
      const isLast = i === paymentCount - 1;
      const amount = isLast
        ? remaining
        : Number((total / paymentCount + randInt(-20, 20)).toFixed(2));
      if (amount <= 0) continue;
      remaining -= amount;

      rows.push({
        paymentNumber: ids.paymentNumber(counter++),
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        amount: amount.toFixed(2),
        paymentMethod: pick(PAYMENT_METHODS),
        status: "completed",
        transactionReference: faker.string.alphanumeric(16).toUpperCase(),
        receivedById,
        receivedAt: invoice.issuedAt
          ? new Date(invoice.issuedAt.getTime() + randInt(1, 30) * 86_400_000)
          : new Date(),
        note: null,
      });
    }
  }

  if (rows.length > 0) {
    await seedDb.insert(payments).values(rows);
  }

  return rows.length;
}

const EXPENSE_CATEGORIES = [
  "Medical Supplies",
  "Pharmaceuticals",
  "Equipment Maintenance",
  "Utilities",
  "Staff Salaries",
  "Rent",
  "Insurance",
  "IT Services",
  "Cleaning Services",
  "Training",
];

const VENDORS = [
  "MedSupply Co.",
  "PharmaDirect",
  "BioTech Solutions",
  "CityPower Utilities",
  "CleanPro Services",
  "TechCare IT",
  "SafeGuard Insurance",
  "Office Depot",
  "LabCorp Supplies",
  "HealthTech Equipment",
];

export async function seedExpenses(args: { recordedById: string }) {
  const { recordedById } = args;

  const rows: Array<typeof expenses.$inferInsert> = [];

  for (let i = 1; i <= 40; i++) {
    const expenseDate = daysAgo(randInt(1, 180));
    rows.push({
      expenseNumber: ids.expenseNumber(i),
      category: pick(EXPENSE_CATEGORIES),
      description: faker.commerce.productDescription(),
      amount: randFloat(50, 5000, 2).toFixed(2),
      expenseDate: expenseDate.toISOString().slice(0, 10),
      paymentMethod: pick(PAYMENT_METHODS),
      vendorName: pick(VENDORS),
      referenceNumber: `REF-${faker.string.alphanumeric(10).toUpperCase()}`,
      recordedById,
    });
  }

  await seedDb.insert(expenses).values(rows);

  return rows.length;
}
