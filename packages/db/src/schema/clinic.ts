// src/lib/db/schema/clinic.schema.ts

import { createId } from "@pedia/shared";
import type {
  ACTIVE_STATUSES,
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
  APPOINTMENT_STATUSES,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  BED_STATUSES,
  BLOOD_GROUPS,
  CONDITION_SEVERITIES,
  CONDITION_STATUSES,
  DELIVERY_METHODS,
  ENCOUNTER_STATUSES,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  IMMUNIZATION_STATUSES,
  INVENTORY_TRANSACTION_TYPES,
  INVOICE_STATUSES,
  LAB_PRIORITIES,
  LAB_STATUSES,
  LAB_TEST_FLAGS,
  LAB_TEST_STATUSES,
  MEDICAL_RECORD_STATUSES,
  MEDICAL_RECORD_TYPES,
  METRIC_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRESCRIPTION_STATUSES,
  ROOM_TYPES,
  VISIT_TYPES,
  WARD_TYPES,
} from "@pedia/shared/constants/enums";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import type { ROLES } from "./enums";
import { money, timestamps } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Shared JSON aliases
// ─────────────────────────────────────────────────────────────────────────────
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

// ─────────────────────────────────────────────────────────────────────────────
// Domain types (used by jsonb columns)
// ─────────────────────────────────────────────────────────────────────────────
export type PrescriptionItem = {
  id: string;
  medicationName: string;
  genericName?: string;
  form: string;
  route: string;
  frequency: string;
  durationDays: number;
  dose?: string;
  dosePerKg?: number;
  calculatedDoseMg?: number;
  calculatedLiquidDoseMl: number;
  concentration?: string;
  dispenseQuantity?: string;
  refills?: number;
  substitutionAllowed?: boolean;
  patientWeightKg?: number;
  instructions?: string;
  warnings?: string;
  notes?: string;
};

export type LabTest = {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  sampleType?: string;
  referenceRange?: string;
  unit?: string;
  result?: string;
  flag?: (typeof LAB_TEST_FLAGS)[number];
  status?: (typeof LAB_TEST_STATUSES)[number];
  isAbnormal?: boolean;
  completedAt?: string;
  notes?: string;
};

export type SubjectiveData = {
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string;
  socialHistory?: string;
  feedingAndNutrition?: string;
  sleepAndBehavior?: string;
  developmentalMilestones?: string;
  reviewOfSystems?: Record<string, string>;
};

export type ObjectiveData = {
  generalAppearance?: string;
  clinicalFindings?: string;
  physicalExamination?: Record<string, string>;
  physicalExam?: JsonValue;
  notes?: string;
};

export type DiagnosisItem = {
  id?: string;
  icdCode?: string;
  name: string;
  primary?: boolean;
};

export type AssessmentData = {
  clinicalImpression?: string;
  summary?: string;
  primaryDiagnosis?: string;
  primaryIcd10?: string;
  diagnoses?: DiagnosisItem[];
  secondaryDiagnoses?: string[];
};

export type PlanData = {
  treatments?: string[];
  treatmentAndInterventions?: string;
  medications?: string[];
  medicationsSummary?: string;
  investigations?: string[];
  patientEducation?: string[];
  anticipatoryGuidance?: string;
  redFlagWarnings?: string;
  followUpDate?: string | null;
  notes?: string;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. CLINICS
// ═════════════════════════════════════════════════════════════════════════════
export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").unique(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    logo: text("logo"),
    timezone: text("timezone").default("UTC"),
    currency: text("currency").default("USD"),
    active: boolean("active").notNull().default(true),
    settings: jsonb("settings").$type<Record<string, JsonValue>>().default({}),
    ...timestamps,
  },
  (table) => [
    index("idx_clinics_name").on(table.name),
    index("idx_clinics_active").on(table.active),
  ]
);

export const clinicSettings = pgTable("clinic_settings", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" })
    .unique(),
  registrationNumber: varchar("registration_number", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  addressLine1: varchar("address_line1", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  currencyCode: varchar("currency_code", { length: 10 })
    .default("USD")
    .notNull(),
  invoicePrefix: varchar("invoice_prefix", { length: 10 }).default("INV-"),
  patientPrefix: varchar("patient_prefix", { length: 10 }).default("PT-"),
  appointmentPrefix: varchar("appointment_prefix", { length: 10 }).default(
    "APT-"
  ),
  admissionPrefix: varchar("admission_prefix", { length: 10 }).default("ADM-"),
  labOrderPrefix: varchar("lab_order_prefix", { length: 10 }).default("LAB-"),
  ...timestamps,
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. REFERENCE / CATALOG
// ═════════════════════════════════════════════════════════════════════════════
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").default(0).notNull(),
  ...timestamps,
});

export const departments = pgTable(
  "departments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "cascade",
    }),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("departments_code_key").on(table.code),
    unique("departments_name_key").on(table.name),
    index("idx_departments_clinic").on(table.clinicId),
    index("idx_departments_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 3. STAFF & DOCTORS
// ═════════════════════════════════════════════════════════════════════════════
export const staff = pgTable(
  "staff",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    title: text("title").notNull(),
    role: text("role").notNull().$type<(typeof ROLES)[number]>(),
    licenseNumber: text("license_number").notNull(),
    avatarColor: text("avatar_color").notNull(),
    pinHash: text("pin_hash"),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").unique().notNull(),
    phone: varchar("phone", { length: 32 }),
    bio: text("bio"),
    isActive: boolean("is_active").notNull().default(true),
    specialty: text("specialty").default("General Pediatrics"),
    department: text("department").default("General"),
    ...timestamps,
  },
  (table) => [
    index("idx_staff_email").on(table.email),
    index("idx_staff_role").on(table.role),
    index("idx_staff_user_id").on(table.userId),
    index("idx_staff_clinic").on(table.clinicId),
    index("idx_staff_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ]
);

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" })
      .unique(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    doctorCode: varchar("doctor_code", { length: 50 }).notNull(),
    registrationNumber: varchar("registration_number", {
      length: 100,
    }).notNull(),
    specialization: varchar("specialization", { length: 255 }).notNull(),
    qualification: varchar("qualification", { length: 255 }),
    consultationFee: money("consultation_fee"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("doctors_doctor_code_key").on(table.doctorCode),
    unique("doctors_registration_number_key").on(table.registrationNumber),
    index("idx_doctors_department").on(table.departmentId),
    index("idx_doctors_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ]
);

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_doctor_schedules_doctor").on(table.doctorId),
    unique("doctor_schedules_unique").on(
      table.doctorId,
      table.dayOfWeek,
      table.startTime
    ),
    check(
      "doctor_schedules_time_order",
      sql`${table.endTime} > ${table.startTime}`
    ),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 4. PATIENTS
// ═════════════════════════════════════════════════════════════════════════════
export const patients = pgTable(
  "patients",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    mrn: text("mrn").unique().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: text("gender").notNull().$type<(typeof GENDERS)[number]>(),
    bloodGroup: text("blood_group")
      .notNull()
      .default("Unknown")
      .$type<(typeof BLOOD_GROUPS)[number]>(),
    gestationWeeksAtBirth: real("gestation_weeks_at_birth").default(40),
    birthWeightKg: real("birth_weight_kg"),
    birthLengthCm: real("birth_length_cm"),
    birthHeadCircumferenceCm: real("birth_head_circ_cm"),
    deliveryMethod:
      text("delivery_method").$type<(typeof DELIVERY_METHODS)[number]>(),
    preferredLanguage: text("preferred_language").default("English"),
    activeStatus: text("active_status")
      .notNull()
      .default("Active")
      .$type<(typeof ACTIVE_STATUSES)[number]>(),
    notes: text("notes"),

    // Contact
    contactNumber: text("contact_number"),
    email: text("email").unique(),

    // Fast "does this patient have any allergies?" badge — kept in sync by trigger or app
    allergies: jsonb("allergies")
      .$type<Array<{ allergen: string; severity: string; reaction: string }>>()
      .default([]),

    // Relations
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    pediatricianId: uuid("pediatrician_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),

    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("idx_patients_mrn").on(table.mrn),
    index("idx_patients_dob").on(table.dateOfBirth),
    index("idx_patients_pediatrician_active").on(
      table.pediatricianId,
      table.activeStatus
    ),
    index("idx_patients_user_id").on(table.userId),
    index("idx_patients_clinic_id").on(table.clinicId),
    // Partial: roster list for active patients
    index("idx_patients_name_active_partial")
      .on(table.lastName, table.firstName)
      .where(sql`${table.activeStatus} = 'Active'`),
    check("patients_dob_not_future", sql`${table.dateOfBirth} <= CURRENT_DATE`),
  ]
);

export const guardians = pgTable(
  "guardians",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    relationship: text("relationship")
      .notNull()
      .$type<(typeof GUARDIAN_RELATIONSHIPS)[number]>(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    isPrimary: boolean("is_primary").notNull().default(true),
    emergencyContact: boolean("emergency_contact").notNull().default(true),
    contactOrder: integer("contact_order").default(1),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_guardians_patient_primary").on(table.patientId, table.isPrimary),
    index("idx_guardians_user_id").on(table.userId),
  ]
);

export const patientAllergies = pgTable(
  "patient_allergies",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    allergen: text("allergen").notNull(),
    category: text("category")
      .notNull()
      .$type<(typeof ALLERGY_CATEGORIES)[number]>(),
    severity: text("severity")
      .notNull()
      .$type<(typeof ALLERGY_SEVERITIES)[number]>(),
    reaction: text("reaction").notNull(),
    identifiedDate: date("identified_date", { mode: "string" }),
    onsetDate: date("onset_date", { mode: "string" }),
    resolutionDate: date("resolution_date", { mode: "string" }),
    status: text("status")
      .notNull()
      .default("Active")
      .$type<(typeof ALLERGY_STATUSES)[number]>(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_allergies_patient_status").on(table.patientId, table.status),
    index("idx_allergies_category").on(table.category),
    index("idx_allergies_severity").on(table.severity),
  ]
);

export const patientChronicConditions = pgTable(
  "patient_chronic_conditions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    condition: text("condition").notNull(),
    icdCode: text("icd_code"),
    diagnosedDate: date("diagnosed_date", { mode: "string" }).notNull(),
    status: text("status")
      .notNull()
      .default("Active")
      .$type<(typeof CONDITION_STATUSES)[number]>(),
    severity: text("severity").$type<(typeof CONDITION_SEVERITIES)[number]>(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_conditions_patient_status").on(table.patientId, table.status),
    index("idx_conditions_icd").on(table.icdCode),
  ]
);

export const patientDocuments = pgTable(
  "patient_documents",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    documentType: text("document_type")
      .notNull()
      .$type<(typeof MEDICAL_RECORD_TYPES)[number]>(),
    title: varchar("title", { length: 255 }).notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    uploadedById: uuid("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_patient_documents_patient").on(table.patientId),
    index("idx_patient_documents_uploaded_by_id").on(table.uploadedById),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 5. APPOINTMENTS
// ═════════════════════════════════════════════════════════════════════════════
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    appointmentNumber: varchar("appointment_number", { length: 50 })
      .notNull()
      .unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, {
      onDelete: "set null",
    }),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    appointmentDate: timestamp("appointment_date", {
      withTimezone: true,
    }).notNull(),
    status: text("status")
      .notNull()
      .$type<(typeof APPOINTMENT_STATUSES)[number]>(),
    type: text("type").notNull().$type<(typeof VISIT_TYPES)[number]>(),
    priority: text("priority")
      .default("Normal")
      .$type<"Normal" | "Urgent" | "Emergency">(),
    reason: varchar("reason", { length: 255 }),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    bookedById: uuid("booked_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("idx_appointments_staff_time").on(table.staffId, table.startTime),
    index("idx_appointments_patient_time").on(table.patientId, table.startTime),
    index("idx_appointments_status").on(table.status),
    index("idx_appointments_doctor_time").on(table.doctorId, table.startTime),
    index("idx_appointments_status_start").on(table.status, table.startTime),
    check(
      "appointments_time_order",
      sql`${table.endTime} > ${table.startTime}`
    ),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 6. ENCOUNTERS & CLINICAL NOTES
// ═════════════════════════════════════════════════════════════════════════════
export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    encounterNumber: varchar("encounter_number", { length: 50 })
      .notNull()
      .unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .references(() => appointments.id, { onDelete: "set null" })
      .unique(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    providerName: text("provider_name").notNull(),
    doctorId: uuid("doctor_id").references(() => doctors.id, {
      onDelete: "set null",
    }),
    encounterDate: timestamp("encounter_date", {
      withTimezone: true,
    }).notNull(),
    visitType: text("visit_type")
      .notNull()
      .$type<(typeof VISIT_TYPES)[number]>(),
    chiefComplaint: text("chief_complaint").notNull(),
    status: text("status")
      .notNull()
      .default("Completed")
      .$type<(typeof ENCOUNTER_STATUSES)[number]>(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedById: uuid("signed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    durationMinutes: integer("duration_minutes"),
    followUpDate: date("follow_up_date", { mode: "string" }),
    notes: text("notes"),

    // SOAP
    subjectiveJson: jsonb("subjective_json").notNull().$type<SubjectiveData>(),
    objectiveJson: jsonb("objective_json").notNull().$type<ObjectiveData>(),
    assessmentJson: jsonb("assessment_json").notNull().$type<AssessmentData>(),
    planJson: jsonb("plan_json").notNull().$type<PlanData>(),

    ...timestamps,
  },
  (table) => [
    index("idx_encounters_patient_date").on(
      table.patientId,
      table.encounterDate
    ),
    index("idx_encounters_provider_date").on(
      table.providerId,
      table.encounterDate
    ),
    index("idx_encounters_type").on(table.visitType),
    index("idx_encounters_status").on(table.status),
  ]
);

export const diagnoses = pgTable(
  "diagnoses",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }),
    description: text("description").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_diagnoses_encounter").on(table.encounterId),
    index("idx_diagnoses_patient").on(table.patientId),
    index("idx_diagnoses_code").on(table.code),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 7. VITALS & GROWTH
// ═════════════════════════════════════════════════════════════════════════════
export const vitals = pgTable(
  "vitals",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    temperatureC: real("temperature_c").notNull(),
    temperatureMethod: text("temperature_method").default("Axillary"),
    heartRateBpm: integer("heart_rate_bpm").notNull(),
    respiratoryRateBpm: integer("respiratory_rate_bpm").notNull(),
    systolicBp: integer("systolic_bp"),
    diastolicBp: integer("diastolic_bp"),
    meanArterialPressure: integer("mean_arterial_pressure"),
    oxygenSaturationPercent: integer("oxygen_saturation_percent").notNull(),
    painScore: integer("pain_score").default(0),
    painScaleType: text("pain_scale_type").default("Wong-Baker"),
    weightKg: real("weight_kg"),
    heightCm: real("height_cm"),
    headCircumferenceCm: real("head_circumference_cm"),
    bmi: real("bmi"),
    notes: text("notes"),
    recordedById: uuid("recorded_by_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_vitals_patient_date").on(table.patientId, table.recordedAt),
    index("idx_vitals_encounter").on(table.encounterId),
    check(
      "vitals_plausible",
      sql`${table.temperatureC} BETWEEN 25 AND 45
				AND ${table.heartRateBpm} BETWEEN 20 AND 300
				AND ${table.oxygenSaturationPercent} BETWEEN 0 AND 100`
    ),
  ]
);

export const growthMeasurements = pgTable(
  "growth_measurements",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    ageMonths: real("age_months").notNull(),
    ageDays: integer("age_days"),
    weightKg: real("weight_kg").notNull(),
    heightCm: real("height_cm").notNull(),
    headCircumferenceCm: real("head_circumference_cm"),
    bmi: real("bmi").notNull(),
    weightForAgeZScore: real("weight_for_age_zscore"),
    weightForAgePercentile: real("weight_for_age_percentile"),
    heightForAgeZScore: real("height_for_age_zscore"),
    heightForAgePercentile: real("height_for_age_percentile"),
    bmiForAgeZScore: real("bmi_for_age_zscore"),
    bmiForAgePercentile: real("bmi_for_age_percentile"),
    headCircumferenceZScore: real("head_circumference_zscore"),
    headCircumferencePercentile: real("head_circumference_percentile"),
    weightVelocity: real("weight_velocity"),
    heightVelocity: real("height_velocity"),
    recordedById: uuid("recorded_by_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_growth_patient_age").on(table.patientId, table.ageMonths),
    index("idx_growth_patient_recorded").on(table.patientId, table.recordedAt),
    index("idx_growth_encounter").on(table.encounterId),
  ]
);

export const whoGrowthData = pgTable(
  "who_growth_data",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    gender: text("gender").notNull().$type<"male" | "female">(),
    metricType: text("metric_type")
      .notNull()
      .$type<(typeof METRIC_TYPES)[number]>(),
    ageDays: integer("age_days"),
    ageMonths: real("age_months").notNull(),
    // LMS
    L: real("l_value").notNull(),
    M: real("m_value").notNull(),
    S: real("s_value").notNull(),
    // SD grid
    sd4neg: real("sd_4neg"),
    sd3neg: real("sd_3neg"),
    sd2neg: real("sd_2neg"),
    sd1neg: real("sd_1neg"),
    sd0: real("sd_0"),
    sd1: real("sd_1"),
    sd2: real("sd_2"),
    sd3: real("sd_3"),
    sd4: real("sd_4"),
    dataSource: text("data_source").default("WHO"),
    version: text("version").default("2006"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("who_gender_metric_age_idx").on(
      table.gender,
      table.metricType,
      table.ageMonths
    ),
    index("who_gender_idx").on(table.gender),
    index("who_metric_idx").on(table.metricType),
    index("who_age_idx").on(table.ageMonths),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 8. IMMUNIZATIONS
// ═════════════════════════════════════════════════════════════════════════════
export const immunizations = pgTable(
  "immunizations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    vaccineCode: text("vaccine_code").notNull(),
    vaccineName: text("vaccine_name").notNull(),
    targetDisease: text("target_disease").notNull(),
    doseNumber: integer("dose_number").notNull(),
    totalDoses: integer("total_doses"),
    recommendedAgeLabel: text("recommended_age_label").notNull(),
    recommendedAgeMonths: real("recommended_age_months").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    administeredDate: date("administered_date", { mode: "string" }),
    status: text("status")
      .notNull()
      .default("Due")
      .$type<(typeof IMMUNIZATION_STATUSES)[number]>(),
    manufacturer: text("manufacturer"),
    brandName: text("brand_name"),
    batchNumber: text("batch_number"),
    expiryDate: date("expiry_date", { mode: "string" }),
    administrationSite: text("administration_site"),
    administrationRoute: text("administration_route"),
    administeredById: uuid("administered_by").references(() => staff.id, {
      onDelete: "set null",
    }),
    adverseReactions: text("adverse_reactions"),
    parentConsent: boolean("parent_consent").default(false),
    consentFormId: uuid("consent_form_id"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("idx_immunizations_patient_status").on(table.patientId, table.status),
    index("idx_immunizations_due_date").on(table.dueDate),
    index("idx_immunizations_vaccine_code").on(table.vaccineCode),
    index("idx_immunizations_patient_administered").on(
      table.patientId,
      table.administeredDate
    ),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 9. PRESCRIPTIONS
// ═════════════════════════════════════════════════════════════════════════════
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    rxNumber: text("rx_number").unique().notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => doctors.id, {
      onDelete: "set null",
    }),
    prescriberId: uuid("prescriber_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    prescriberName: text("prescriber_name").notNull(),
    prescriberLicense: text("prescriber_license").notNull(),
    prescribedDate: date("prescribed_date", { mode: "string" }).notNull(),
    patientWeightKg: real("patient_weight_kg").notNull(),
    diagnosis: text("diagnosis"),
    prescriptionItems: jsonb("prescription_items")
      .notNull()
      .$type<PrescriptionItem[]>(),
    notes: text("notes"),
    status: text("status")
      .notNull()
      .default("Active")
      .$type<(typeof PRESCRIPTION_STATUSES)[number]>(),
    filledAt: timestamp("filled_at", { withTimezone: true }),
    filledById: uuid("filled_by").references(() => user.id, {
      onDelete: "set null",
    }),
    discontinuedAt: timestamp("discontinued_at", { withTimezone: true }),
    discontinuedReason: text("discontinued_reason"),
    ...timestamps,
  },
  (table) => [
    index("idx_prescriptions_patient_status").on(table.patientId, table.status),
    index("idx_prescriptions_prescriber").on(table.prescriberId),
    index("idx_prescriptions_doctor").on(table.doctorId),
    index("idx_prescriptions_rx_number").on(table.rxNumber),
    index("idx_prescriptions_encounter").on(table.encounterId),
    // Partial: active Rx per patient is the dominant read
    index("idx_prescriptions_patient_active")
      .on(table.patientId)
      .where(sql`${table.status} = 'Active'`),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 10. PHARMACY / INVENTORY
// ═════════════════════════════════════════════════════════════════════════════
export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull().unique(),
    genericName: varchar("generic_name", { length: 255 }).notNull(),
    brandName: varchar("brand_name", { length: 255 }),
    dosageForm: varchar("dosage_form", { length: 100 }).notNull(),
    strength: varchar("strength", { length: 100 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }),
    reorderLevel: integer("reorder_level").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_medicines_generic_name").on(table.genericName),
    index("idx_medicines_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ]
);

export const medicineBatches = pgTable(
  "medicine_batches",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    batchNumber: varchar("batch_number", { length: 100 }).notNull(),
    expiryDate: date("expiry_date", { mode: "string" }).notNull(),
    purchasePrice: money("purchase_price", 10, 2).notNull(),
    salePrice: money("sale_price", 10, 2).notNull(),
    quantityReceived: integer("quantity_received").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_medicine_batches_expiry").on(table.expiryDate),
    unique("medicine_batches_medicine_id_batch_number_unique").on(
      table.medicineId,
      table.batchNumber
    ),
    check(
      "medicine_batches_qty_nonneg",
      sql`${table.quantityAvailable} >= 0 AND ${table.quantityReceived} >= 0`
    ),
  ]
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => medicineBatches.id, {
      onDelete: "set null",
    }),
    transactionType: text("transaction_type")
      .notNull()
      .$type<(typeof INVENTORY_TRANSACTION_TYPES)[number]>(),
    quantityDelta: integer("quantity_delta").notNull(),
    referenceType: varchar("reference_type", { length: 100 }).notNull(),
    referenceId: uuid("reference_id"),
    note: varchar("note", { length: 500 }),
    performedById: uuid("performed_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_inventory_batch").on(table.batchId),
    index("idx_inventory_medicine_created").on(
      table.medicineId,
      table.createdAt
    ),
  ]
);

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id").references(() => medicines.id, {
      onDelete: "set null",
    }),
    medicineNameSnapshot: varchar("medicine_name_snapshot", {
      length: 255,
    }).notNull(),
    dosage: varchar("dosage", { length: 100 }).notNull(),
    route: varchar("route", { length: 100 }),
    frequency: varchar("frequency", { length: 100 }).notNull(),
    duration: varchar("duration", { length: 100 }).notNull(),
    quantity: integer("quantity"),
    instructions: text("instructions"),
    ...timestamps,
  },
  (table) => [
    index("idx_prescription_items_prescription").on(table.prescriptionId),
    index("idx_prescription_items_medicine").on(table.medicineId),
  ]
);

export const dispensations = pgTable(
  "dispensations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    dispensedById: uuid("dispensed_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    dispensedAt: timestamp("dispensed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_dispensations_prescription").on(table.prescriptionId),
    index("idx_dispensations_patient").on(table.patientId),
  ]
);

export const dispensationItems = pgTable(
  "dispensation_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dispensationId: uuid("dispensation_id")
      .notNull()
      .references(() => dispensations.id, { onDelete: "cascade" }),
    prescriptionItemId: uuid("prescription_item_id")
      .notNull()
      .references(() => prescriptionItems.id, { onDelete: "restrict" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => medicineBatches.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceSnapshot: money("unit_price_snapshot", 10, 2).notNull(),
  },
  (table) => [
    index("idx_dispensation_items_dispensation").on(table.dispensationId),
    index("idx_dispensation_items_batch").on(table.batchId),
    index("idx_dispensation_items_medicine").on(table.medicineId),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 11. LAB
// ═════════════════════════════════════════════════════════════════════════════
export const labTests = pgTable(
  "lab_tests",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    category: varchar("category", { length: 100 }),
    sampleType: varchar("sample_type", { length: 100 }),
    price: money("price", 10, 2).notNull(),
    referenceRange: varchar("reference_range", { length: 255 }),
    unit: varchar("unit", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_lab_tests_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
    index("idx_lab_tests_category").on(table.category),
  ]
);

export const labOrders = pgTable(
  "lab_orders",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    labOrderNumber: text("lab_order_number").unique().notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    orderedByDoctorId: uuid("ordered_by_doctor_id").references(
      () => doctors.id,
      { onDelete: "set null" }
    ),
    orderedById: uuid("ordered_by")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    clinicalIndication: text("clinical_indication").notNull(),
    orderDate: timestamp("order_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: text("status")
      .notNull()
      .default("Ordered")
      .$type<(typeof LAB_STATUSES)[number]>(),
    priority: text("priority")
      .notNull()
      .default("Routine")
      .$type<(typeof LAB_PRIORITIES)[number]>(),
    specimenType: text("specimen_type"),
    specimenCollectionNotes: text("specimen_collection_notes"),
    specimenCollectedAt: timestamp("specimen_collected_at", {
      withTimezone: true,
    }),
    completedDate: timestamp("completed_date", { withTimezone: true }),
    resultsReleasedAt: timestamp("results_released_at", {
      withTimezone: true,
    }),
    instructions: text("instructions"),
    notes: text("notes"),
    // Snapshot of tests ordered (denormalized for fast list rendering)
    testsJson: jsonb("tests_json").notNull().$type<LabTest[]>(),
    ...timestamps,
  },
  (table) => [
    index("idx_lab_orders_patient_status").on(table.patientId, table.status),
    index("idx_lab_orders_priority_status").on(table.priority, table.status),
    index("idx_lab_orders_patient_ordered").on(
      table.patientId,
      table.orderDate
    ),
    index("idx_lab_orders_status_ordered").on(table.status, table.orderDate),
    index("idx_lab_orders_encounter").on(table.encounterId),
  ]
);

export const labOrderItems = pgTable(
  "lab_order_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    labOrderId: uuid("lab_order_id")
      .notNull()
      .references(() => labOrders.id, { onDelete: "cascade" }),
    labTestId: uuid("lab_test_id").references(() => labTests.id, {
      onDelete: "set null",
    }),
    testNameSnapshot: varchar("test_name_snapshot", {
      length: 255,
    }).notNull(),
    priceSnapshot: money("price_snapshot", 10, 2).notNull(),
    status: text("status")
      .notNull()
      .default("Pending")
      .$type<(typeof LAB_TEST_STATUSES)[number]>(),
    flag: text("flag").$type<(typeof LAB_TEST_FLAGS)[number]>(),
    resultValue: varchar("result_value", { length: 255 }),
    resultText: varchar("result_text", { length: 2000 }),
    referenceRangeSnapshot: varchar("reference_range_snapshot", {
      length: 255,
    }),
    unitSnapshot: varchar("unit_snapshot", { length: 50 }),
    resultedByUserId: uuid("resulted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resultedAt: timestamp("resulted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("idx_lab_order_items_order").on(table.labOrderId),
    index("idx_lab_order_items_test").on(table.labTestId),
    index("idx_lab_order_items_abnormal")
      .on(table.labOrderId)
      .where(sql`${table.flag} IN ('Abnormal', 'Critical')`),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 12. MEDICAL RECORDS
// ═════════════════════════════════════════════════════════════════════════════
export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    uploadedById: uuid("uploaded_by")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    recordType: text("record_type")
      .notNull()
      .$type<(typeof MEDICAL_RECORD_TYPES)[number]>(),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileMimeType: text("file_mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    externalId: uuid("external_id"),
    externalSystem: text("external_system"),
    documentDate: date("document_date", { mode: "string" }),
    status: text("status")
      .notNull()
      .default("Active")
      .$type<(typeof MEDICAL_RECORD_STATUSES)[number]>(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().default({}),
    tags: text("tags").array().default([]),
    ...timestamps,
  },
  (table) => [
    index("idx_medical_records_patient_type").on(
      table.patientId,
      table.recordType
    ),
    index("idx_medical_records_patient_status").on(
      table.patientId,
      table.status
    ),
    index("idx_medical_records_encounter").on(table.encounterId),
    index("idx_medical_records_external").on(
      table.externalSystem,
      table.externalId
    ),
    index("idx_medical_records_uploaded_by").on(table.uploadedById),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 13. WARDS / ROOMS / BEDS / ADMISSIONS
// ═════════════════════════════════════════════════════════════════════════════
export const wards = pgTable(
  "wards",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    type: text("type").notNull().$type<(typeof WARD_TYPES)[number]>(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_wards_clinic").on(table.clinicId),
    index("idx_wards_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ]
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    wardId: uuid("ward_id")
      .notNull()
      .references(() => wards.id, { onDelete: "cascade" }),
    roomNumber: varchar("room_number", { length: 50 }).notNull(),
    roomType: text("room_type").notNull().$type<(typeof ROOM_TYPES)[number]>(),
    dailyRate: money("daily_rate", 10, 2).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("rooms_ward_id_room_number_unique").on(
      table.wardId,
      table.roomNumber
    ),
    index("idx_rooms_ward").on(table.wardId),
  ]
);

export const beds = pgTable(
  "beds",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    bedNumber: varchar("bed_number", { length: 50 }).notNull(),
    status: text("status")
      .notNull()
      .default("available")
      .$type<(typeof BED_STATUSES)[number]>(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("beds_room_id_bed_number_unique").on(table.roomId, table.bedNumber),
    index("idx_beds_available")
      .on(table.status)
      .where(sql`${table.status} = 'available'`),
  ]
);

export const admissions = pgTable(
  "admissions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    admissionNumber: varchar("admission_number", { length: 50 })
      .notNull()
      .unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    attendingStaffId: uuid("attending_staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    attendingDoctorId: uuid("attending_doctor_id").references(
      () => doctors.id,
      { onDelete: "set null" }
    ),
    status: text("status")
      .notNull()
      .default("Admitted")
      .$type<"Admitted" | "Discharged" | "Transferred">(),
    admissionReason: varchar("admission_reason", { length: 500 }).notNull(),
    admittedAt: timestamp("admitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expectedDischargeAt: timestamp("expected_discharge_at", {
      withTimezone: true,
    }),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }),
    dischargeSummary: varchar("discharge_summary", { length: 2000 }),
    createdById: uuid("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_admissions_patient_admitted").on(
      table.patientId,
      table.admittedAt
    ),
    index("idx_admissions_active")
      .on(table.patientId, table.admittedAt)
      .where(sql`${table.status} = 'Admitted'`),
    index("idx_admissions_attending").on(
      table.attendingStaffId,
      table.admittedAt
    ),
    check(
      "admissions_discharge_consistency",
      sql`(${table.status} = 'Discharged' AND ${table.dischargedAt} IS NOT NULL)
				OR (${table.status} <> 'Discharged')`
    ),
  ]
);

export const bedAllocations = pgTable(
  "bed_allocations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    admissionId: uuid("admission_id")
      .notNull()
      .references(() => admissions.id, { onDelete: "cascade" }),
    bedId: uuid("bed_id")
      .notNull()
      .references(() => beds.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    allocatedById: uuid("allocated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    endedById: uuid("ended_by").references(() => user.id, {
      onDelete: "set null",
    }),
    transferReason: varchar("transfer_reason", { length: 500 }),
    ...timestamps,
  },
  (table) => [
    index("idx_bed_allocations_current")
      .on(table.bedId)
      .where(sql`${table.endedAt} IS NULL`),
    index("idx_bed_allocations_admission").on(table.admissionId),
    check(
      "bed_allocations_time_order",
      sql`${table.endedAt} IS NULL OR ${table.endedAt} > ${table.startedAt}`
    ),
  ]
);

export const clinicalNotes = pgTable(
  "clinical_notes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    admissionId: uuid("admission_id")
      .notNull()
      .references(() => admissions.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    noteType: text("note_type").notNull(),
    noteText: varchar("note_text", { length: 5000 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_clinical_notes_admission_created").on(
      table.admissionId,
      table.createdAt
    ),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 14. BILLING
// ═════════════════════════════════════════════════════════════════════════════
export const chargeCatalog = pgTable(
  "charge_catalog",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    defaultAmount: money("default_amount", 10, 2).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_charge_catalog_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
    index("idx_charge_catalog_category").on(table.category),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    admissionId: uuid("admission_id").references(() => admissions.id, {
      onDelete: "set null",
    }),
    clinicId: uuid("clinic_id").references(() => clinics.id),
    status: text("status")
      .notNull()
      .default("draft")
      .$type<(typeof INVOICE_STATUSES)[number]>(),
    currencyCode: varchar("currency_code", { length: 10 })
      .default("EGP")
      .notNull(),
    subtotal: money("subtotal").notNull(),
    discountTotal: money("discount_total").notNull(),
    taxTotal: money("tax_total").notNull(),
    grandTotal: money("grand_total").notNull(),
    amountPaid: money("amount_paid").notNull(),
    balanceDue: money("balance_due").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdById: uuid("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_invoices_patient_issued").on(table.patientId, table.issuedAt),
    index("idx_invoices_status_due").on(table.status, table.dueAt),
    index("idx_invoices_encounter").on(table.encounterId),
    index("idx_invoices_admission").on(table.admissionId),
    check(
      "invoices_totals_nonneg",
      sql`${table.subtotal} >= 0
				AND ${table.discountTotal} >= 0
				AND ${table.taxTotal} >= 0
				AND ${table.grandTotal} >= 0
				AND ${table.amountPaid} >= 0
				AND ${table.balanceDue} >= 0`
    ),
  ]
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    sourceType: varchar("source_type", { length: 50 }),
    sourceId: uuid("source_id"),
    descriptionSnapshot: varchar("description_snapshot", {
      length: 255,
    }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: money("unit_price").notNull(),
    discountAmount: money("discount_amount").default("0").notNull(),
    taxAmount: money("tax_amount").default("0").notNull(),
    lineTotal: money("line_total").notNull(),
    ...timestamps,
  },
  (table) => [index("idx_invoice_items_invoice").on(table.invoiceId)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    paymentNumber: varchar("payment_number", { length: 50 }).notNull().unique(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    amount: money("amount").notNull(),
    paymentMethod:
      text("payment_method").$type<(typeof PAYMENT_METHODS)[number]>(),
    status: text("status")
      .notNull()
      .default("completed")
      .$type<(typeof PAYMENT_STATUSES)[number]>(),
    transactionReference: varchar("transaction_reference", { length: 255 }),
    receivedById: uuid("received_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    note: varchar("note", { length: 500 }),
    ...timestamps,
  },
  (table) => [
    index("idx_payments_invoice").on(table.invoiceId),
    index("idx_payments_patient").on(table.patientId),
    index("idx_payments_received_at").on(table.receivedAt),
  ]
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    expenseNumber: varchar("expense_number", { length: 50 }).notNull().unique(),
    category: varchar("category", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    amount: money("amount").notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    vendorName: varchar("vendor_name", { length: 255 }),
    referenceNumber: varchar("reference_number", { length: 255 }),
    recordedById: uuid("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("idx_expenses_date").on(table.expenseDate),
    index("idx_expenses_category").on(table.category),
  ]
);

// ═════════════════════════════════════════════════════════════════════════════
// 15. AUDIT
// ═════════════════════════════════════════════════════════════════════════════
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    staffName: text("staff_name").notNull(),
    action: text("action").notNull().$type<(typeof AUDIT_ACTIONS)[number]>(),
    entity: text("entity").notNull().$type<(typeof AUDIT_ENTITIES)[number]>(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().default({}),
    details: text("details").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    sessionId: uuid("session_id"),
    beforeState: jsonb("before_state").$type<JsonValue>(),
    afterState: jsonb("after_state").$type<JsonValue>(),
  },
  (table) => [
    index("idx_audit_entity_id_timestamp").on(
      table.entity,
      table.entityId,
      table.timestamp
    ),
    index("idx_audit_staff_timestamp").on(table.staffId, table.timestamp),
    index("idx_audit_action").on(table.action),
  ]
);
