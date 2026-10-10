// packages/shared/src/schemas/enums.ts

import * as C from "@pedia/shared/constants";
import { z } from "zod";

// =============================================================================
// Status enums
// =============================================================================
export const activeStatusSchema = z.enum(C.ACTIVE_STATUSES);
export const admissionStatusSchema = z.enum(C.ADMISSION_STATUSES);
export const allergyStatusSchema = z.enum(C.ALLERGY_STATUSES);
export const appointmentStatusSchema = z.enum(C.APPOINTMENT_STATUSES);
export const bedStatusSchema = z.enum(C.BED_STATUSES);
export const conditionStatusSchema = z.enum(C.CONDITION_STATUSES);
export const encounterStatusSchema = z.enum(C.ENCOUNTER_STATUSES);
export const immunizationStatusSchema = z.enum(C.IMMUNIZATION_STATUSES);
export const invoiceStatusSchema = z.enum(C.INVOICE_STATUSES);
export const labOrderStatusSchema = z.enum(C.LAB_STATUSES);
export const medicalRecordStatusSchema = z.enum(C.MEDICAL_RECORD_STATUSES);
export const paymentStatusSchema = z.enum(C.PAYMENT_STATUSES);
export const prescriptionStatusSchema = z.enum(C.PRESCRIPTION_STATUSES);
export const userStatusSchema = z.enum(C.USER_STATUSES);

// =============================================================================
// Clinical / categorical enums
// =============================================================================
export const allergyCategorySchema = z.enum(C.ALLERGY_CATEGORIES);
export const allergySeveritySchema = z.enum(C.ALLERGY_SEVERITIES);
export const appointmentPrioritySchema = z.enum(C.APPOINTMENT_PRIORITIES);
export const auditEntitySchema = z.enum(C.AUDIT_ENTITIES);
export const bloodGroupSchema = z.enum(C.BLOOD_GROUPS);
export const clinicalNoteTypeSchema = z.enum(C.CLINICAL_NOTE_TYPES);
export const conditionSeveritySchema = z.enum(C.CONDITION_SEVERITIES);
export const deliveryMethodSchema = z.enum(C.DELIVERY_METHODS);
export const genderSchema = z.enum(C.GENDERS);
export const whoGenderSchema = z.enum(C.WHO_GENDERS);
export const guardianRelationshipSchema = z.enum(C.GUARDIAN_RELATIONSHIPS);
export const inventoryTransactionTypeSchema = z.enum(
  C.INVENTORY_TRANSACTION_TYPES
);
export const labPrioritySchema = z.enum(C.LAB_PRIORITIES);
export const labTestFlagSchema = z.enum(C.LAB_TEST_FLAGS);
export const medicalRecordTypeSchema = z.enum(C.MEDICAL_RECORD_TYPES);
export const preferredLanguageSchema = z.enum(C.PREFERRED_LANGUAGES);
export const metricTypeSchema = z.enum(C.METRIC_TYPES);
export const painScaleTypeSchema = z.enum(C.PAIN_SCALE_TYPES);
export const paymentMethodSchema = z.enum(C.PAYMENT_METHODS);
export const roomTypeSchema = z.enum(C.ROOM_TYPES);
export const temperatureMethodSchema = z.enum(C.TEMPERATURE_METHODS);
export const visitTypeSchema = z.enum(C.VISIT_TYPES);
export const wardTypeSchema = z.enum(C.WARD_TYPES);
