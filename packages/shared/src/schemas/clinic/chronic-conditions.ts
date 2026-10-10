// packages/shared/src/schemas/clinic/chronic-conditions.ts
import {
  isoDateSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import {
  conditionSeveritySchema,
  conditionStatusSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const patientChronicConditionSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  condition: z.string().min(1),
  icdCode: z.string().nullable(),
  diagnosedDate: isoDateSchema,
  status: conditionStatusSchema,
  severity: conditionSeveritySchema.nullable(),
  notes: z.string().nullable(),
  ...timestampsShape,
});

export const newPatientChronicConditionSchema = patientChronicConditionSchema
  .omit({
    id: true,
    patientId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: conditionStatusSchema.optional(),
  });

export const patientChronicConditionUpdateSchema =
  newPatientChronicConditionSchema.partial();

export type PatientChronicCondition = z.infer<
  typeof patientChronicConditionSchema
>;
export type NewPatientChronicCondition = z.infer<
  typeof newPatientChronicConditionSchema
>;
