// packages/shared/src/schemas/patient-allergy.ts

import {
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
} from "@pedia/shared/constants";
import { z } from "zod";

import { isoDateSchema } from "../_helper";

export const allergyBadgeSchema = z.object({
  allergen: z.string(),
  severity: z.string(),
  reaction: z.string(),
});

export type AllergyBadge = z.infer<typeof allergyBadgeSchema>;

// ============================================================
// Primitives
// ============================================================

// ============================================================
// Read schema — mirrors the `patient_allergies` table 1:1
// ============================================================

export const patientAllergySchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  allergen: z.string().trim().min(1).max(255),
  category: z.enum(ALLERGY_CATEGORIES),
  severity: z.enum(ALLERGY_SEVERITIES),
  status: z.enum(ALLERGY_STATUSES),
  reaction: z.string().trim().min(1),
  identifiedDate: isoDateSchema.nullable(),
  onsetDate: isoDateSchema.nullable(),
  resolutionDate: isoDateSchema.nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PatientAllergy = z.infer<typeof patientAllergySchema>;

// ============================================================
// Insert schema — what a create endpoint accepts
// ============================================================

/**
 * Removed: `id`, `createdAt`, `updatedAt` (DB defaults), `patientId`
 * (from URL path). `status` is optional because the DB default is
 * `'active'`.
 */
export const newPatientAllergySchema = patientAllergySchema
  .omit({
    id: true,
    patientId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: z.enum(ALLERGY_STATUSES).optional(),
  });

export type NewPatientAllergy = z.infer<typeof newPatientAllergySchema>;

// ============================================================
// Update schema — what a PATCH endpoint accepts
// ============================================================

export const patientAllergyUpdateSchema = newPatientAllergySchema.partial();

export type PatientAllergyUpdate = z.infer<typeof patientAllergyUpdateSchema>;

// ============================================================
// List / filter schemas
// ============================================================

export const patientAllergyListInputSchema = z.object({
  patientId: z.uuid(),
  status: z.enum(ALLERGY_STATUSES).optional(),
  severity: z.enum(ALLERGY_SEVERITIES).optional(),
  category: z.enum(ALLERGY_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PatientAllergyListInput = z.infer<
  typeof patientAllergyListInputSchema
>;
