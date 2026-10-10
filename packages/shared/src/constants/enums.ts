// packages/shared/src/constants/enums.ts
//
// Single source of truth for all domain enums.
//
// RULES:
//   1. One name per concept. Plural is the canonical spelling for status /
//      type lists; singular is reserved for TS *type* aliases derived from
//      the plural constant.
//   2. Every value is Title Case for displayable enums (status, category)
//      and lowercase snake_case for machine-only enums (metric_type,
//      audit_entity). This matches the Postgres `pgEnum` members already
//      shipped in migrations — do NOT change casing without a migration.
//   3. Consumers import from `@pedia/shared/constants/enums` (this file).
//      Never redeclare a list.
//   4. Adding a value here is a DB migration if a `pgEnum` was created from
//      it. Adding a value to a pure `text + $type<>` column is a code change
//      only — mark those clearly.

// =============================================================================
// Identity & Access
// =============================================================================

export const ROLES = ["admin", "doctor", "staff", "patient"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const WHO_GENDERS = ["male", "female"] as const;
export type WhoGender = (typeof WHO_GENDERS)[number];

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const PREFERRED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Arabic",
  "Hindi",
  "Other",
] as const;
export type PreferredLanguage = (typeof PREFERRED_LANGUAGES)[number];

export const ACTIVE_STATUSES = ["active", "inactive", "resolved"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

// =============================================================================
// Audit
// =============================================================================
// Stored as `text + $type<>` in `audit_logs`. Not a pgEnum.
export const PRESCRIPTION_STATUSES = [
  "active",
  "filled",
  "discontinued",
  "expired",
  "cancelled",
] as const;
export const LAB_STATUSES = [
  "ordered",
  "collected",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const IMMUNIZATION_STATUSES = [
  "due",
  "administered",
  "overdue",
  "deferred",
  "refused",
  "contraindicated",
] as const;
export const CONDITION_STATUSES = [
  "active",
  "controlled",
  "resolved",
  "in_remission",
] as const;
export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "EXPORT",
  "LOGIN",
  "RESTORE",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = [
  "PATIENT",
  "ENCOUNTER",
  "IMMUNIZATION",
  "PRESCRIPTION",
  "LAB",
  "DATABASE",
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

// =============================================================================
// Patients
// =============================================================================

export const GUARDIAN_RELATIONSHIPS = [
  "Mother",
  "Father",
  "Grandparent",
  "Legal Guardian",
  "Foster Parent",
  "Other",
] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const DELIVERY_METHODS = [
  "Vaginal",
  "Cesarean",
  "Assisted",
  "Unknown",
] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const ALLERGY_CATEGORIES = [
  "Medication",
  "Food",
  "Environmental",
  "Other",
] as const;
export type AllergyCategory = (typeof ALLERGY_CATEGORIES)[number];

export const ALLERGY_SEVERITIES = [
  "Mild",
  "Moderate",
  "Severe",
  "Anaphylactic",
] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export const ALLERGY_STATUSES = ["active", "resolved", "inactive"] as const;
export type AllergyStatus = (typeof ALLERGY_STATUSES)[number];

export const CONDITION_SEVERITIES = ["Mild", "Moderate", "Severe"] as const;
export type ConditionSeverity = (typeof CONDITION_SEVERITIES)[number];

// export const CONDITION_STATUSES = [
// 	"Active",
// 	"Resolved",
// 	"In Remission",
// ] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

// =============================================================================
// Appointments & Encounters
// =============================================================================

export const APPOINTMENT_PRIORITIES = [
  "Normal",
  "Urgent",
  "Emergency",
] as const;
export type AppointmentPriority = (typeof APPOINTMENT_PRIORITIES)[number];

export const APPOINTMENT_STATUSES = [
  "Scheduled",
  "Checked In",
  "In Progress",
  "Completed",
  "Cancelled",
  "No Show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const VISIT_TYPES = [
  "Well-Child Check",
  "Sick Visit",
  "Follow-Up",
  "Immunization Visit",
  "Consultation",
  "Lactation Consultation",
  "Emergency/Urgent",
  "Telehealth",
  "Other",
] as const;
export type VisitType = (typeof VISIT_TYPES)[number];
export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  "Well-Child Check": "Well-Child Check",
  "Sick Visit": "Sick Visit",
  "Follow-Up": "Follow-Up",
  "Immunization Visit": "Immunization Visit",
  Consultation: "Consultation",
  "Lactation Consultation": "Lactation Consultation",
  "Emergency/Urgent": "Emergency/Urgent",
  Telehealth: "Telehealth",
  Other: "Other",
};
export const ENCOUNTER_STATUSES = [
  "Draft",
  "Completed",
  "Signed",
  "Amended",
  "Cancelled",
] as const;
export type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];
export const ENCOUNTER_STATUS_LABEL: Record<EncounterStatus, string> = {
  Draft: "Draft",
  Completed: "Completed",
  Signed: "Signed",
  Amended: "Amended",
  Cancelled: "Cancelled",
};

export const TEMPERATURE_METHODS = [
  "Axillary",
  "Oral",
  "Rectal",
  "Tympanic",
  "Temporal",
] as const;
export type TemperatureMethod = (typeof TEMPERATURE_METHODS)[number];

export const PAIN_SCALE_TYPES = ["Wong-Baker", "FLACC", "Numeric"] as const;
export type PainScaleType = (typeof PAIN_SCALE_TYPES)[number];

// =============================================================================
// Medical Records
// =============================================================================
// Stored as `text + $type<>` in `medical_records`. Not a pgEnum.

export const MEDICAL_RECORD_TYPES = [
  "Lab Report",
  "Imaging",
  "Referral",
  "Discharge Summary",
  "Consent Form",
  "Insurance",
  "Operative Report",
  "Pathology",
  "External Record",
  "Other",
] as const;
export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

export const MEDICAL_RECORD_STATUSES = [
  "Active",
  "Archived",
  "Superseded",
] as const;
export type MedicalRecordStatus = (typeof MEDICAL_RECORD_STATUSES)[number];

// =============================================================================
// Immunizations
// =============================================================================

// export const IMMUNIZATION_STATUSES = [
// 	"Administered",
// 	"Due",
// 	"Overdue",
// 	"Upcoming",
// 	"Deferred",
// 	"Refused",
// ] as const;
export type ImmunizationStatus = (typeof IMMUNIZATION_STATUSES)[number];

// =============================================================================
// Growth
// =============================================================================

export const METRIC_TYPES = [
  "weight",
  "height",
  "head_circumference",
  "bmi",
] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

// =============================================================================
// Laboratory
// =============================================================================

// export const LAB_STATUSES = [
// 	"Ordered",
// 	"Sample Collected",
// 	"Processing",
// 	"Completed",
// 	"Cancelled",
// ] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

export const LAB_PRIORITIES = ["Routine", "Urgent", "Stat"] as const;
export type LabPriority = (typeof LAB_PRIORITIES)[number];

export const LAB_TEST_FLAGS = ["Normal", "Abnormal", "Critical"] as const;
export type LabTestFlag = (typeof LAB_TEST_FLAGS)[number];

export const LAB_TEST_STATUSES = [
  "Pending",
  "In Progress",
  "Completed",
  "Abnormal",
  "Normal",
] as const;
export type LabTestStatus = (typeof LAB_TEST_STATUSES)[number];

// =============================================================================
// Inpatient
// =============================================================================
// All stored as `text + $type<>`. Adding a value is a code change only.

export const ADMISSION_STATUSES = [
  "Admitted",
  "Discharged",
  "Transferred",
] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const BED_STATUSES = [
  "available",
  "occupied",
  "maintenance",
  "reserved",
] as const;
export type BedStatus = (typeof BED_STATUSES)[number];

export const WARD_TYPES = [
  "general",
  "pediatric",
  "neonatal",
  "icu",
  "isolation",
  "surgical",
] as const;
export type WardType = (typeof WARD_TYPES)[number];

export const ROOM_TYPES = ["private", "semi_private", "ward", "icu"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const CLINICAL_NOTE_TYPES = [
  "Progress",
  "Physician",
  "Discharge",
  "Consultation",
  "Nursing",
] as const;
export type ClinicalNoteType = (typeof CLINICAL_NOTE_TYPES)[number];

// =============================================================================
// Billing
// =============================================================================

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "insurance",
  "bank_transfer",
  "mobile_money",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// =============================================================================
// Pharmacy & Prescriptions
// =============================================================================

// export const PRESCRIPTION_STATUSES = [
// 	"Active",
// 	"Completed",
// 	"Discontinued",
// 	"Cancelled",
// ] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const INVENTORY_TRANSACTION_TYPES = [
  "purchase",
  "dispense",
  "adjustment",
  "return",
  "expired",
  "transfer",
] as const;
export type InventoryTransactionType =
  (typeof INVENTORY_TRANSACTION_TYPES)[number];

// =============================================================================
// File Uploads
// =============================================================================

export const LOGO_PREFIX = "clinic/logos/" as const;
export const LOGO_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const LOGO_MAX_SIZE = 3 * 1024 * 1024;

export const SCREENSHOT_PREFIX = "clinic/screenshots/" as const;
export const SCREENSHOT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const SCREENSHOT_MAX_SIZE = 5 * 1024 * 1024;

export const DOCUMENT_PREFIX = "clinic/documents/" as const;
export const DOCUMENT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;
export const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024;
