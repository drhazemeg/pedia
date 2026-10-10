// packages/shared/src/schemas/clinic/immunizations.ts
import {
  realSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { immunizationStatusSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const immunizationSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable(),
  vaccineCode: z.string(),
  vaccineName: z.string(),
  targetDisease: z.string(),
  doseNumber: z.number().int().positive(),
  totalDoses: z.number().int().nullable(),
  recommendedAgeLabel: z.string(),
  recommendedAgeMonths: realSchema,
  dueDate: dateSchema,
  administeredDate: dateSchema.nullable(),
  status: immunizationStatusSchema,
  manufacturer: z.string().nullable(),
  brandName: z.string().nullable(),
  batchNumber: z.string().nullable(),
  expiryDate: dateSchema.nullable(),
  administrationSite: z.string().nullable(),
  administrationRoute: z.string().nullable(),
  administeredById: uuidSchema.nullable(),
  adverseReactions: z.string().nullable(),
  parentConsent: z.boolean().nullable(),
  consentFormId: z.string().nullable(),
  notes: z.string().nullable(),
  ...timestampsShape,
});

export const newImmunizationSchema = immunizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const immunizationUpdateSchema = newImmunizationSchema.partial();

export type Immunization = z.infer<typeof immunizationSchema>;
export type NewImmunization = z.infer<typeof newImmunizationSchema>;

export const listInputSchema = z.object({
  query: z.string().trim().min(1).max(100).optional(),
  status: immunizationStatusSchema.optional(),
  dateRange: z.enum(["Due Soon", "Overdue", "Completed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
