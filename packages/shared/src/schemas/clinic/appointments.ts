// packages/shared/src/schemas/clinic/appointments.ts
import { timestampsShape, uuidSchema } from "@pedia/shared/schemas/_helper";
import {
  appointmentPrioritySchema,
  appointmentStatusSchema,
  visitTypeSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod";

// ============================================================
// Primitives
// ============================================================

const appointmentNumberSchema = z.string().trim().min(1).max(50);

// ============================================================
// Read schema — mirrors the `appointments` table 1:1
// ============================================================

export const appointmentSchema = z
  .object({
    id: uuidSchema,
    appointmentNumber: appointmentNumberSchema,
    patientId: uuidSchema,
    staffId: uuidSchema,
    doctorId: uuidSchema.nullable(),
    clinicId: uuidSchema.nullable(),
    appointmentDate: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    status: appointmentStatusSchema,
    type: visitTypeSchema,
    priority: appointmentPrioritySchema.nullable(),
    reason: z.string().max(255).nullable(),
    notes: z.string().nullable(),
    cancellationReason: z.string().nullable(),
    checkedInAt: z.coerce.date().nullable(),
    startedAt: z.coerce.date().nullable(),
    completedAt: z.coerce.date().nullable(),
    bookedById: uuidSchema.nullable(),
    ...timestampsShape,
  })
  .refine((a) => a.endTime > a.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export type Appointment = z.infer<typeof appointmentSchema>;

// ============================================================
// Insert schema
// ============================================================
//
// Server-derived / server-managed fields are omitted:
//   * appointmentNumber  (generated from a counter)
//   * status             (defaults to "Scheduled")
//   * bookedById         (from session)
//   * checkedInAt / startedAt / completedAt  (workflow transitions)
//   * cancellationReason (only set on cancel)
//   * appointmentDate    (derived from startTime)
//
// `priority` is nullable in DB but has a default, so it's `.optional()`
// here — callers can omit it and get "Normal".

export const newAppointmentSchema = z
  .object({
    patientId: uuidSchema,
    appointmentNumber: z.string(),
    staffId: uuidSchema,
    doctorId: uuidSchema.nullable().optional(),
    clinicId: uuidSchema.nullable().optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    status: appointmentStatusSchema,
    appointmentDate: z.date(),
    updatedAt: z.date().optional(),
    type: visitTypeSchema,
    priority: appointmentPrioritySchema.optional(),
    reason: z.string().max(255).nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((a) => a.endTime > a.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export type NewAppointment = z.infer<typeof newAppointmentSchema>;

// ============================================================
// Update schema (admin / reschedule)
// ============================================================
//
// Does NOT allow changing patientId or appointmentNumber. Use
// `appointmentStatusUpdateSchema` for workflow transitions.

export const appointmentUpdateSchema = z
  .object({
    id: z.uuid(),
    staffId: uuidSchema.optional(),
    doctorId: uuidSchema.nullable().optional(),
    clinicId: uuidSchema.nullable().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    type: visitTypeSchema.optional(),
    priority: appointmentPrioritySchema.optional(),
    reason: z.string().max(255).nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (a) => a.startTime == null || a.endTime == null || a.endTime > a.startTime,
    {
      message: "endTime must be after startTime",
      path: ["endTime"],
    }
  );

export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;

// ============================================================
// Workflow / status transition schema
// ============================================================

export const appointmentStatusUpdateSchema = z
  .object({
    status: appointmentStatusSchema,
    cancellationReason: z.string().nullable().optional(),
  })
  .refine((s) => s.status !== "Cancelled" || !!s.cancellationReason, {
    message: "cancellationReason is required when status is Cancelled",
    path: ["cancellationReason"],
  });

export type AppointmentStatusUpdate = z.infer<
  typeof appointmentStatusUpdateSchema
>;

// ============================================================
// List / filter / sort
// ============================================================

export const appointmentListSortSchema = z.enum([
  "appointmentDate",
  "startTime",
  "createdAt",
  "status",
]);

export const appointmentListInputSchema = z.object({
  clinicId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
  staffId: uuidSchema.optional(),
  doctorId: uuidSchema.optional(),
  status: appointmentStatusSchema.optional(),
  type: visitTypeSchema.optional(),
  priority: appointmentPrioritySchema.optional(),
  // Date-range filter on startTime (inclusive start, exclusive end).
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  orderBy: appointmentListSortSchema.default("startTime"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AppointmentListInput = z.infer<typeof appointmentListInputSchema>;

// ============================================================
// Relations
// ============================================================

export const appointmentPatientSummarySchema = z.object({
  id: uuidSchema,
  mrn: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.iso.date(),
  gender: z.string(),
});

export const appointmentStaffSummarySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  title: z.string(),
  specialty: z.string().nullable(),
});

export const appointmentDoctorSummarySchema = z.object({
  id: uuidSchema,
  doctorCode: z.string(),
  specialization: z.string(),
});

export const appointmentWithRelationsSchema = appointmentSchema.extend({
  patient: appointmentPatientSummarySchema,
  staff: appointmentStaffSummarySchema,
  doctor: appointmentDoctorSummarySchema.nullable(),
});

export type AppointmentWithRelations = z.infer<
  typeof appointmentWithRelationsSchema
>;

// ============================================================
// Pagination
// ============================================================

export const paginatedAppointmentsSchema = z.object({
  data: z.array(appointmentSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

export type PaginatedAppointments = z.infer<typeof paginatedAppointmentsSchema>;
