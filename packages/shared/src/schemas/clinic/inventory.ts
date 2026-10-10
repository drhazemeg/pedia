// packages/shared/src/schemas/clinic/inventory.ts
import { timestampsShape, uuidSchema } from "@pedia/shared/schemas/_helper";
import { inventoryTransactionTypeSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const inventoryTransactionSchema = z.object({
  id: uuidSchema,
  medicineId: uuidSchema,
  batchId: uuidSchema.nullable(),
  transactionType: inventoryTransactionTypeSchema,
  quantityDelta: z.number().int(),
  referenceType: z.string().max(100),
  referenceId: uuidSchema.nullable(),
  note: z.string().max(500).nullable(),
  performedById: uuidSchema,
  ...timestampsShape,
});

export const newInventoryTransactionSchema = inventoryTransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InventoryTransaction = z.infer<typeof inventoryTransactionSchema>;
export type NewInventoryTransaction = z.infer<
  typeof newInventoryTransactionSchema
>;
