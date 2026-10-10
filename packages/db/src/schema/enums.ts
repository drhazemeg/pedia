// packages/db/src/schema/enums.ts
//
// Single source of truth for every Postgres enum used by the clinic schema.
//
// Rules for this file:
//   1. One `pgEnum(name, values)` per Postgres type name. No duplicates.
//   2. The value tuple comes from `@pedia/shared/constants/enums` — never
//      redefined inline unless the value list is genuinely local to the DB
//      layer (e.g. `ADMISSION_STATUSES`, which is a schema-level constraint,
//      not a shared UI label set).
//   3. Every singular name that used to be exported as a value is now
//      exported as a *type*. `clinic.ts` and `types.ts` reference these via
//      `$type<Gender>()` and `(typeof genderEnum.enumValues)[number]`, so
//      keeping both spellings would double the surface for no benefit.

import {
  // ── status value arrays ────────────────────────────────────────────────
  ACTIVE_STATUSES,
  // ── categorical value arrays ───────────────────────────────────────────
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
  APPOINTMENT_STATUSES,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  BED_STATUSES,
  BLOOD_GROUPS,
  CLINICAL_NOTE_TYPES,
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
  PAIN_SCALE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PREFERRED_LANGUAGES,
  PRESCRIPTION_STATUSES,
  ROOM_TYPES,
  TEMPERATURE_METHODS,
  USER_STATUSES,
  VISIT_TYPES,
  WARD_TYPES,
  WHO_GENDERS,
} from "@pedia/shared/constants/enums";
import { pgEnum } from "drizzle-orm/pg-core";

// =============================================================================
// Roles
// =============================================================================
// `ROLES` is the only value array that lives here rather than in the shared
// package — it is a DB-level constraint and the set is stable.
export const ROLES = ["admin", "doctor", "staff", "patient"] as const;
export const roleEnum = pgEnum("role", ROLES);

// =============================================================================
// Status enums
// =============================================================================
export const activeStatusEnum = pgEnum("active_status", ACTIVE_STATUSES);
export const allergyStatusEnum = pgEnum("allergy_status", ALLERGY_STATUSES);
export const appointmentStatusEnum = pgEnum(
  "appointment_status",
  APPOINTMENT_STATUSES
);
export const bedStatusEnum = pgEnum("bed_status", BED_STATUSES);
export const conditionStatusEnum = pgEnum(
  "condition_status",
  CONDITION_STATUSES
);
export const encounterStatusEnum = pgEnum(
  "encounter_status",
  ENCOUNTER_STATUSES
);
export const immunizationStatusEnum = pgEnum(
  "immunization_status",
  IMMUNIZATION_STATUSES
);
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);
export const labStatusEnum = pgEnum("lab_status", LAB_STATUSES);
export const medicalRecordStatusEnum = pgEnum(
  "medical_record_status",
  MEDICAL_RECORD_STATUSES
);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const prescriptionStatusEnum = pgEnum(
  "prescription_status",
  PRESCRIPTION_STATUSES
);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);

// =============================================================================
// Clinical / categorical enums
// =============================================================================
export const allergyCategoryEnum = pgEnum(
  "allergy_category",
  ALLERGY_CATEGORIES
);
export const allergySeverityEnum = pgEnum(
  "allergy_severity",
  ALLERGY_SEVERITIES
);
export const auditActionEnum = pgEnum("audit_action", AUDIT_ACTIONS);
export const auditEntityEnum = pgEnum("audit_entity", AUDIT_ENTITIES);
export const bloodGroupEnum = pgEnum("blood_group", BLOOD_GROUPS);
export const clinicalNoteTypeEnum = pgEnum(
  "clinical_note_type",
  CLINICAL_NOTE_TYPES
);
export const conditionSeverityEnum = pgEnum(
  "condition_severity",
  CONDITION_SEVERITIES
);
export const deliveryMethodEnum = pgEnum("delivery_method", DELIVERY_METHODS);
export const genderEnum = pgEnum("gender", GENDERS);
export const guardianRelationshipEnum = pgEnum(
  "guardian_relationship",
  GUARDIAN_RELATIONSHIPS
);
export const inventoryTransactionTypeEnum = pgEnum(
  "inventory_transaction_type",
  INVENTORY_TRANSACTION_TYPES
);
export const labPriorityEnum = pgEnum("lab_priority", LAB_PRIORITIES);
export const labTestFlagEnum = pgEnum("lab_test_flag", LAB_TEST_FLAGS);
export const labTestStatusEnum = pgEnum("lab_test_status", LAB_TEST_STATUSES);
export const medicalRecordTypeEnum = pgEnum(
  "medical_record_type",
  MEDICAL_RECORD_TYPES
);
export const metricTypeEnum = pgEnum("metric_type", METRIC_TYPES);
export const painScaleTypeEnum = pgEnum("pain_scale_type", PAIN_SCALE_TYPES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const preferredLanguageEnum = pgEnum(
  "preferred_language",
  PREFERRED_LANGUAGES
);
export const roomTypeEnum = pgEnum("room_type", ROOM_TYPES);
export const temperatureMethodEnum = pgEnum(
  "temperature_method",
  TEMPERATURE_METHODS
);
export const visitTypeEnum = pgEnum("visit_type", VISIT_TYPES);
export const wardTypeEnum = pgEnum("ward_type", WARD_TYPES);
export const whoGenderEnum = pgEnum("who_gender", WHO_GENDERS);

// =============================================================================
// Schema-only value unions
// =============================================================================
// Values that are constraints of *this* schema, not shared label sets. They
// are `text` columns with a `$type<>` guard rather than `pgEnum`s, because
// adding a value is a code change (a TypeScript union), not a migration.

export const ADMISSION_STATUSES = [
  "Admitted",
  "Discharged",
  "Transferred",
] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const APPOINTMENT_PRIORITIES = [
  "Normal",
  "Urgent",
  "Emergency",
] as const;
export type AppointmentPriority = (typeof APPOINTMENT_PRIORITIES)[number];

// =============================================================================
// Type aliases — the singular names the rest of the codebase uses
// =============================================================================
// These used to be exported as *values* (`ACTIVE_STATUS`, `GENDER`, …) and
// imported into `clinic.ts` alongside the plural forms. They are now types
// only. Consumers that need the value list should reach for the enum's
// `enumValues` (e.g. `genderEnum.enumValues`) or the plural array from
// `@pedia/shared/constants/enums`.

export type ActiveStatus = (typeof activeStatusEnum.enumValues)[number];
export type AdmissionStatusValue = AdmissionStatus; // alias for symmetry
export type AllergyCategory = (typeof allergyCategoryEnum.enumValues)[number];
export type AllergySeverity = (typeof allergySeverityEnum.enumValues)[number];
export type AllergyStatus = (typeof allergyStatusEnum.enumValues)[number];
export type AppointmentPriorityValue = AppointmentPriority;
export type AppointmentStatus =
  (typeof appointmentStatusEnum.enumValues)[number];
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
export type AuditEntity = (typeof auditEntityEnum.enumValues)[number];
export type BedStatus = (typeof bedStatusEnum.enumValues)[number];
export type BloodGroup = (typeof bloodGroupEnum.enumValues)[number];
export type ClinicalNoteType = (typeof clinicalNoteTypeEnum.enumValues)[number];
export type ConditionSeverity =
  (typeof conditionSeverityEnum.enumValues)[number];
export type ConditionStatus = (typeof conditionStatusEnum.enumValues)[number];
export type DeliveryMethod = (typeof deliveryMethodEnum.enumValues)[number];
// export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type EncounterStatus = (typeof encounterStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type GuardianRelationship =
  (typeof guardianRelationshipEnum.enumValues)[number];
export type ImmunizationStatus =
  (typeof immunizationStatusEnum.enumValues)[number];
export type InventoryTransactionType =
  (typeof inventoryTransactionTypeEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type LabPriority = (typeof labPriorityEnum.enumValues)[number];
export type LabStatus = (typeof labStatusEnum.enumValues)[number];
export type LabTestFlag = (typeof labTestFlagEnum.enumValues)[number];
export type LabTestStatus = (typeof labTestStatusEnum.enumValues)[number];
export type MedicalRecordStatus =
  (typeof medicalRecordStatusEnum.enumValues)[number];
export type MedicalRecordType =
  (typeof medicalRecordTypeEnum.enumValues)[number];
export type MetricType = (typeof metricTypeEnum.enumValues)[number];
export type PainScaleType = (typeof painScaleTypeEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PreferredLanguage =
  (typeof preferredLanguageEnum.enumValues)[number];
export type PrescriptionStatus =
  (typeof prescriptionStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type RoomType = (typeof roomTypeEnum.enumValues)[number];
export type TemperatureMethod =
  (typeof temperatureMethodEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type VisitType = (typeof visitTypeEnum.enumValues)[number];
export type WardType = (typeof wardTypeEnum.enumValues)[number];
export type WhoGender = (typeof whoGenderEnum.enumValues)[number];
