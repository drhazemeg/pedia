// packages/shared/src/schemas/clinic/medicines.ts
import {
  numericStringSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const medicineSchema = z.object({
  id: uuidSchema,
  code: z.string().max(50),
  genericName: z.string().max(255),
  brandName: z.string().max(255).nullable(),
  dosageForm: z.string().max(100),
  strength: z.string().max(100),
  manufacturer: z.string().max(255).nullable(),
  reorderLevel: z.number().int().nonnegative(),
  isActive: z.boolean(),
  ...timestampsShape,
});

export const newMedicineSchema = medicineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const medicineUpdateSchema = newMedicineSchema.partial();

export const medicineBatchSchema = z.object({
  id: uuidSchema,
  medicineId: uuidSchema,
  batchNumber: z.string().max(100),
  expiryDate: dateSchema,
  purchasePrice: numericStringSchema,
  salePrice: numericStringSchema,
  quantityReceived: z.number().int().nonnegative(),
  quantityAvailable: z.number().int().nonnegative(),
  ...timestampsShape,
});

export const newMedicineBatchSchema = medicineBatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Medicine = z.infer<typeof medicineSchema>;
export type NewMedicine = z.infer<typeof newMedicineSchema>;
export type MedicineBatch = z.infer<typeof medicineBatchSchema>;
export type NewMedicineBatch = z.infer<typeof newMedicineBatchSchema>;
