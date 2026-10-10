// packages/shared/src/schemas/clinic/wards.ts
import { uuidSchema } from "@pedia/shared/schemas/_helper";
import { wardTypeSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const wardSchema = z.object({
  id: uuidSchema,
  code: z.string().max(50),
  name: z.string().max(100),
  type: wardTypeSchema,
  isActive: z.boolean(),
});

export const newWardSchema = wardSchema.omit({ id: true });
export const wardUpdateSchema = newWardSchema.partial();

export type Ward = z.infer<typeof wardSchema>;
export type NewWard = z.infer<typeof newWardSchema>;
