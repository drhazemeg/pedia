// packages/shared/src/schemas/clinic/payments.ts
import {
  numericStringSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import {
  paymentMethodSchema,
  paymentStatusSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const paymentSchema = z.object({
  id: uuidSchema,
  paymentNumber: z.string().max(50),
  invoiceId: uuidSchema,
  amount: numericStringSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  status: paymentStatusSchema,
  transactionReference: z.string().max(255).nullable(),
  receivedById: uuidSchema,
  receivedAt: z.coerce.date(),
  note: z.string().max(500).nullable(),
  ...timestampsShape,
});

export const newPaymentSchema = paymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const paymentUpdateSchema = newPaymentSchema.partial();

export type Payment = z.infer<typeof paymentSchema>;
export type NewPayment = z.infer<typeof newPaymentSchema>;
