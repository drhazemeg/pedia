// packages/shared/src/schemas/clinic/dispensations.ts
import {
  numericStringSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

export const dispensationSchema = z.object({
  id: uuidSchema,
  prescriptionId: uuidSchema,
  patientId: uuidSchema,
  dispensedById: uuidSchema,
  dispensedAt: z.coerce.date(),
  ...timestampsShape,
});

export const newDispensationSchema = dispensationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const dispensationItemSchema = z.object({
  id: uuidSchema,
  dispensationId: uuidSchema,
  prescriptionItemId: uuidSchema,
  medicineId: uuidSchema,
  batchId: uuidSchema,
  quantity: z.number().int().positive(),
  unitPriceSnapshot: numericStringSchema,
});

export const newDispensationItemSchema = dispensationItemSchema.omit({
  id: true,
});

export type Dispensation = z.infer<typeof dispensationSchema>;
export type NewDispensation = z.infer<typeof newDispensationSchema>;
export type DispensationItem = z.infer<typeof dispensationItemSchema>;
export type NewDispensationItem = z.infer<typeof newDispensationItemSchema>;
