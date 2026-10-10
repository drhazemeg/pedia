import {
  ACTIVE_STATUSES,
  BLOOD_GROUPS,
  DELIVERY_METHODS,
  GENDERS,
} from "@pedia/shared/constants";
import { z } from "zod";

import { isoDateSchema } from "../_helper";
import { activeStatusSchema } from "../enums";
import { allergyBadgeSchema, patientAllergySchema } from "./allergies";
import { patientChronicConditionSchema } from "./chronic-conditions";

// ============================================================
// Primitives
// ============================================================

/** Kept as an alias for backwards compatibility. */
export const dobSchema = isoDateSchema;

export const mrnSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(
    /^[A-Za-z0-9-]+$/,
    "MRN may only contain letters, digits, and hyphens"
  );

export const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[+()\d\s-]+$/, "Invalid phone number");

// Rules:
//   * Every field on the DB table appears here.
//   * Every field here appears on the DB table.
//   * Nullability matches the DB column exactly.
//
// If you add a column to `patients`, add it here in the same PR.

export const patientSchema = z.object({
  id: z.uuid(),
  mrn: mrnSchema,
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  dateOfBirth: isoDateSchema,
  gender: z.enum(GENDERS),
  bloodGroup: z.enum(BLOOD_GROUPS),

  // Birth / perinatal — all nullable in DB (defaults apply on insert only)
  gestationWeeksAtBirth: z.number().nonnegative().max(45).nullable(),
  birthWeightKg: z.number().nonnegative().nullable(),
  birthLengthCm: z.number().nonnegative().nullable(),
  birthHeadCircumferenceCm: z.number().nonnegative().nullable(),
  deliveryMethod: z.enum(DELIVERY_METHODS).nullable(),
  preferredLanguage: z.string().max(50).nullable(),

  // Status
  activeStatus: z.enum(ACTIVE_STATUSES),
  isActive: z.boolean(),

  // Contact
  contactNumber: z.string().max(50).nullable(),
  email: z.email().max(255).nullable(),
  notes: z.string().nullable(),

  // Denormalised allergy badge (jsonb). Nullable in DB.
  allergies: z.array(allergyBadgeSchema).nullable(),

  // Relations (FK columns only — joined objects live on
  // `patientWithRelationsSchema` below)
  userId: z.uuid().nullable(),
  pediatricianId: z.uuid().optional(),
  clinicId: z.uuid().optional(),

  // Timestamps
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Patient = z.infer<typeof patientSchema>;

// ============================================================
// Insert schema
// ============================================================
//
// Server-derived fields are omitted:
//   * id, createdAt, updatedAt
//   * isActive        (server sets based on activeStatus)
//   * allergies       (denormalised badge, written by triggers/derivation)
//   * userId          (derived from session in the router)
//
// Defaulted columns (`bloodGroup`, `activeStatus`, `preferredLanguage`,
// `gestationWeeksAtBirth`, `deliveryMethod`) become optional so the caller
// can omit them and let the DB default apply.

export const newPatientSchema = patientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  allergies: true,
  userId: true,
});

export type NewPatient = z.infer<typeof newPatientSchema>;

// ============================================================
// Update schema
// ============================================================

export const patientUpdateSchema = newPatientSchema
  .omit({ mrn: true })
  .partial();

export type PatientUpdate = z.infer<typeof patientUpdateSchema>;

// ============================================================
// List / filter schemas
// ============================================================

export const patientListSortSchema = z.enum([
  "firstName",
  "lastName",
  "createdAt",
  "dateOfBirth",
]);

export const patientListInputSchema = z.object({
  clinicId: z.uuid(),
  q: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  activeStatus: z.enum(ACTIVE_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  pediatricianId: z.uuid().optional(),
  ageMinMonths: z.coerce.number().int().nonnegative().optional(),
  ageMaxMonths: z.coerce.number().int().nonnegative().optional(),
  hasAllergies: z.boolean().optional(),
  hasChronicConditions: z.boolean().optional(),
  orderBy: patientListSortSchema.default("lastName"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PatientListInput = z.infer<typeof patientListInputSchema>;

// ============================================================
// Projection — relations
// ============================================================

export const patientPediatricianSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  title: z.string(),
  specialty: z.string().nullable(),
});

export const patientGuardianSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: z.email().nullable(),
  isPrimary: z.boolean(),
  emergencyContact: z.boolean(),
  contactOrder: z.number().int().nullable(),
});

export const patientWithRelationsSchema = patientSchema.extend({
  pediatrician: patientPediatricianSchema.nullable(),
  guardians: z.array(patientGuardianSchema),
  // NOTE: this *overwrites* the denormalised badge with the full relation
  // rows. That is intentional — relations are the source of truth.
  allergies: z.array(patientAllergySchema),
  chronicConditions: z.array(patientChronicConditionSchema),
});

export type PatientWithRelations = z.infer<typeof patientWithRelationsSchema>;

export const patientSummarySchema = patientSchema.pick({
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
});

export type PatientSummary = z.infer<typeof patientSummarySchema>;

// ============================================================
// Form values
// ============================================================

export const patientFormGuardianSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(255),
  relationship: z.string().min(1).max(100),
  phone: phoneSchema,
  email: z.email().max(255).nullable().optional(),
  isPrimary: z.boolean(),
  emergencyContact: z.boolean(),
  contactOrder: z.number().int().nullable().optional(),
});

export const patientFormAllergySchema = z.object({
  id: z.uuid().optional(),
  allergen: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  severity: z.string().min(1).max(50),
  status: z.string().min(1).max(50),
  reaction: z.string().min(1).max(500),
});

export const patientFormChronicConditionSchema = z.object({
  id: z.uuid().optional(),
  condition: z.string().min(1).max(255),
  icdCode: z.string().max(50).nullable().optional(),
  diagnosedDate: isoDateSchema,
  status: z.string().min(1).max(50),
  severity: z.string().max(50).nullable().optional(),
});

export const patientFormValuesSchema = newPatientSchema.extend({
  guardians: z.array(patientFormGuardianSchema),
  allergies: z.array(patientFormAllergySchema),
  chronicConditions: z.array(patientFormChronicConditionSchema),
});

export type PatientFormValues = z.infer<typeof patientFormValuesSchema>;

export const patientFormSchema = patientFormValuesSchema;

// ============================================================
// Search params (URL-driven list view)
// ============================================================

export const patientsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(100).optional(),
  // Use the canonical enum, not a hard-coded duplicate.
  activeStatus: z.enum(ACTIVE_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  pediatricianId: z.uuid().optional(),
  hasAllergies: z.coerce.boolean().optional(),
  hasChronicConditions: z.coerce.boolean().optional(),
  orderBy: patientListSortSchema.default("lastName"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
});

export type PatientsSearch = z.infer<typeof patientsSearchSchema>;

/**
 * Strip URL-search defaults before handing to the API — keeps URLs clean.
 * The API's wire schema uses `q`; the URL schema uses `query`. This function
 * is the single translation point.
 */
export function toApiInput(s: PatientsSearch, clinicId: string) {
  return {
    clinicId,
    page: s.page,
    limit: s.limit,
    q: s.query,
    activeStatus: s.activeStatus,
    gender: s.gender,
    pediatricianId: s.pediatricianId,
    hasAllergies: s.hasAllergies,
    hasChronicConditions: s.hasChronicConditions,
    orderBy: s.orderBy,
    orderDirection: s.orderDirection,
  };
}

// ============================================================
// Alternate list input (kept for compatibility)
// ============================================================

export const listPatientsInputSchema = z.object({
  clinicId: z.uuid().optional(),
  activeStatus: activeStatusSchema.optional(),
  gender: z.enum(GENDERS).optional(),
  pediatricianId: z.uuid().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  ageMin: z.coerce.number().int().min(0).max(240).optional(),
  ageMax: z.coerce.number().int().min(0).max(240).optional(),
  hasAllergies: z.boolean().optional(),
  hasChronicConditions: z.boolean().optional(),
  orderBy: patientListSortSchema.default("lastName"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPatientsInput = z.infer<typeof listPatientsInputSchema>;

// ============================================================
// Pagination & stats
// ============================================================

export const paginatedPatientsSchema = z.object({
  data: z.array(patientSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

export type PaginatedPatients = z.infer<typeof paginatedPatientsSchema>;

export const patientStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  inactive: z.number().int().nonnegative(),
  byGender: z.object({
    male: z.number().int().nonnegative(),
    female: z.number().int().nonnegative(),
    // Present in GENDERS; keep stats aligned with the enum.
    other: z.number().int().nonnegative(),
  }),
  byAgeGroup: z.object({
    Neonate: z.number().int().nonnegative(),
    Infant: z.number().int().nonnegative(),
    Toddler: z.number().int().nonnegative(),
    Preschooler: z.number().int().nonnegative(),
    "School Age": z.number().int().nonnegative(),
    Adolescent: z.number().int().nonnegative(),
  }),
  withAllergies: z.number().int().nonnegative(),
  withChronicConditions: z.number().int().nonnegative(),
});

export type PatientStats = z.infer<typeof patientStatsSchema>;
