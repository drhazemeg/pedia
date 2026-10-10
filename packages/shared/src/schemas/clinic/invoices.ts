import {
  numericStringSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { invoiceStatusSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

import { INVOICE_STATUSES } from "../../constants";
import { moneySchema } from "../common";
import { paymentSchema } from "./payments";

export const invoiceSchema = z.object({
  id: uuidSchema,
  invoiceNumber: z.string().max(50),
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable(),
  admissionId: uuidSchema.nullable(),
  status: invoiceStatusSchema,
  currencyCode: z.string().max(10),
  subtotal: numericStringSchema,
  discountTotal: numericStringSchema,
  taxTotal: numericStringSchema,
  grandTotal: numericStringSchema,
  amountPaid: numericStringSchema,
  balanceDue: numericStringSchema,
  issuedAt: z.coerce.date().nullable(),
  dueAt: z.coerce.date().nullable(),
  createdById: uuidSchema,
  ...timestampsShape,
});

export const newInvoiceSchema = invoiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const invoiceUpdateSchema = newInvoiceSchema.partial();

export const invoiceItemSchema = z.object({
  id: z.uuid(),
  invoiceId: z.uuid(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  descriptionSnapshot: z.string(),
  quantity: moneySchema, // numeric → string
  unitPrice: moneySchema, // money() → string
  discountAmount: moneySchema, // <-- was z.number(), now string
  taxAmount: moneySchema, // <-- was z.number(), now string
  lineTotal: moneySchema, // money() → string
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export const newInvoiceItemSchema = invoiceItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type NewInvoice = z.infer<typeof newInvoiceSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type NewInvoiceItem = z.infer<typeof newInvoiceItemSchema>;

export const listInvoicesInputSchema = z.object({
  clinicId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  issuedFrom: z.coerce.date().optional(),
  issuedTo: z.coerce.date().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  overdueOnly: z.boolean().optional(),
  unpaidOnly: z.boolean().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  orderBy: z.enum(["invoiceNumber", "issuedAt", "dueDate"]).default("issuedAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const paginatedInvoicesSchema = z.object({
  data: z.array(invoiceSchema),
  total: z.number().int().nonnegative(),
});

export const invoiceStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  draft: z.number().int().nonnegative(),
  issued: z.number().int().nonnegative(),
  partiallyPaid: z.number().int().nonnegative(),
  paid: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  refunded: z.number().int().nonnegative(),
  totalBilled: moneySchema,
  totalCollected: moneySchema,
  totalOutstanding: moneySchema,
  overdueAmount: moneySchema,
});

export const invoiceWithDetailsSchema = invoiceSchema.extend({
  items: z.array(invoiceItemSchema),
  payments: z.array(paymentSchema),
});
