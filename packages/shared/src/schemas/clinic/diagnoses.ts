import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

export const diagnosisSchema = z.object({
  id: z.string(),
  encounterId: z.string(),
  patientId: z.string(),
  code: z.string().max(50).nullable(),
  description: z.string().min(1),
  isPrimary: z.boolean(),
  ...timestampsShape,
});

export const newDiagnosisSchema = diagnosisSchema
  .omit({
    id: true,
    patientId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    code: z.string().max(50).nullable().optional(),
    isPrimary: z.boolean().optional(),
  });

export const diagnosisUpdateSchema = newDiagnosisSchema.partial();

export type Diagnosis = z.infer<typeof diagnosisSchema>;
export type NewDiagnosis = z.infer<typeof newDiagnosisSchema>;
