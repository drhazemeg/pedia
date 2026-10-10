// packages/shared/src/schemas/clinic/guardians.ts
import { timestampsShape, uuidSchema } from "@pedia/shared/schemas/_helper";
import { guardianRelationshipSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const guardianSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  name: z.string().min(1),
  userId: uuidSchema.nullable(),
  relationship: guardianRelationshipSchema,
  phone: z.string().min(1),
  email: z.string().nullable(),
  address: z.string().nullable(),
  isPrimary: z.boolean(),
  emergencyContact: z.boolean(),
  contactOrder: z.number().int().nullable(),
  notes: z.string().nullable(),
  ...timestampsShape,
});

export const newGuardianSchema = guardianSchema
  .omit({
    id: true,
    patientId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    isPrimary: z.boolean().optional(),
    emergencyContact: z.boolean().optional(),
  });

export const guardianUpdateSchema = newGuardianSchema.partial();

export type Guardian = z.infer<typeof guardianSchema>;
export type NewGuardian = z.infer<typeof newGuardianSchema>;
