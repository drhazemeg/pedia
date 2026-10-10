// src/routers/invoice.ts

import { ORPCError } from "@orpc/server";
import { invoiceRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.string(),
  total: z.string(),
  chargeId: z.string().optional(),
});

const invoiceSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  encounterId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issuedAt: z.date().optional(),
  dueDate: z.date().optional(),
  status: z
    .enum(["draft", "issued", "paid", "partially_paid", "overdue", "cancelled"])
    .optional(),
  subtotal: z.string(),
  taxTotal: z.string().optional(),
  discountTotal: z.string().optional(),
  grandTotal: z.string(),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  invoiceId: z.string(),
  patientId: z.string(),
  amount: z.string(),
  method: z.enum(["cash", "card", "insurance", "transfer", "other"]),
  status: z
    .enum(["pending", "completed", "failed", "refunded"])
    .default("completed"),
  receivedAt: z.date().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const invoice = await invoiceRepository.findById(input);
    if (!invoice) {
      throw new ORPCError("NOT_FOUND", {
        message: "Invoice not found",
      });
    }
    return invoice;
  }),

  getByNumber: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const invoice = await invoiceRepository.findByNumber(input);
    if (!invoice) {
      throw new ORPCError("NOT_FOUND", {
        message: "Invoice not found",
      });
    }
    return invoice;
  }),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return invoiceRepository.findByPatient(patientId, options);
    }),

  getByDateRange: staffProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .handler(async ({ input }) =>
      invoiceRepository.getByDateRange(input.startDate, input.endDate)
    ),

  getStats: adminProcedure.handler(async () => invoiceRepository.getStats()),

  // ─── Mutations ───

  create: doctorProcedure
    .input(
      z.object({
        invoice: invoiceSchema,
        items: z.array(invoiceItemSchema),
      })
    )
    .handler(async ({ input }) => {
      const { id: _id, ...invoiceData } = input.invoice;
      void _id;
      const normalizedItems = input.items.map((item) => ({
        descriptionSnapshot: item.description,
        quantity: String(item.quantity),
        unitPrice: item.unitPrice,
        lineTotal: item.total,
        chargeId: item.chargeId,
      }));
      return invoiceRepository.create(
        invoiceData as Parameters<typeof invoiceRepository.create>[0],
        normalizedItems as Parameters<typeof invoiceRepository.create>[1]
      );
    }),

  recordPayment: doctorProcedure
    .input(paymentSchema)
    .handler(async ({ input }) => {
      const paymentMethod =
        input.method === "transfer" ? "bank_transfer" : input.method;

      return invoiceRepository.recordPayment({
        ...input,
        paymentNumber:
          input.reference ?? `INV-${input.invoiceId}-${Date.now()}`,
        receivedById: "system",
        paymentMethod,
        note: input.notes ?? null,
      } as Parameters<typeof invoiceRepository.recordPayment>[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: invoiceSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await invoiceRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Invoice not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await invoiceRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Invoice not found",
      });
    }
    return { success: true };
  }),
};

export type InvoiceRouter = typeof invoiceRouter;
