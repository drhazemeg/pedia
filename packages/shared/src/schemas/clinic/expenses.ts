// packages/shared/src/schemas/clinic/expenses.ts
import {
  numericStringSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

import { moneySchema } from "../common";
import { paymentMethodSchema, paymentStatusSchema } from "../enums";
import { paymentSchema } from "./payments";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const expenseSchema = z.object({
  id: uuidSchema,
  expenseNumber: z.string().max(50),
  category: z.string().max(100),
  description: z.string().max(500),
  amount: numericStringSchema,
  expenseDate: dateSchema,
  paymentMethod: z.string().max(50).nullable(),
  vendorName: z.string().max(255).nullable(),
  referenceNumber: z.string().max(255).nullable(),
  recordedById: uuidSchema,
  ...timestampsShape,
});

export const newExpenseSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const expenseUpdateSchema = newExpenseSchema.partial();

export type Expense = z.infer<typeof expenseSchema>;
export type NewExpense = z.infer<typeof newExpenseSchema>;

export const listPaymentsInputSchema = z.object({
  clinicId: z.uuid().optional(),
  invoiceId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  receivedById: z.uuid().optional(),
  receivedFrom: z.coerce.date().optional(),
  receivedTo: z.coerce.date().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  orderBy: z
    .enum(["receivedAt", "amount", "paymentNumber"])
    .default("receivedAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const paginatedPaymentsSchema = z.object({
  data: z.array(paymentSchema),
  total: z.number().int().nonnegative(),
});

export const paymentStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  totalAmount: moneySchema,
  byStatus: z.record(paymentStatusSchema, z.number().int().nonnegative()),
  byMethod: z.record(paymentMethodSchema, z.number().int().nonnegative()),
  today: z.number().int().nonnegative(),
  thisWeek: z.number().int().nonnegative(),
  thisMonth: z.number().int().nonnegative(),
});
