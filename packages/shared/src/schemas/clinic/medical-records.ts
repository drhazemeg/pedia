// packages/shared/src/schemas/clinic/medical-records.ts
import {
  textArraySchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import {
  medicalRecordStatusSchema,
  medicalRecordTypeSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const medicalRecordSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable(),
  uploadedById: uuidSchema,
  recordType: medicalRecordTypeSchema,
  status: medicalRecordStatusSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileMimeType: z.string(),
  fileSizeBytes: z.number().int().nullable(),
  externalId: z.string().nullable(),
  externalSystem: z.string().nullable(),
  documentDate: dateSchema.nullable(),
  metadata: z.unknown().nullable(),
  tags: textArraySchema.nullable(),
  ...timestampsShape,
});

export const newMedicalRecordSchema = medicalRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const medicalRecordUpdateSchema = newMedicalRecordSchema.partial();

export type MedicalRecord = z.infer<typeof medicalRecordSchema>;
export type NewMedicalRecord = z.infer<typeof newMedicalRecordSchema>;
