// packages/shared/src/schemas/clinic/activity.ts
import { z } from "zod";

const patientActivityStatusSchema = z.enum([
  "scheduled",
  "checked-in",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
]);

export const patientActivityRowSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  patientName: z.string(),
  mrn: z.string(),
  avatarUrl: z.string().nullable(),
  visitType: z.string(),
  providerName: z.string().nullable(),
  scheduledAt: z.coerce.date(),
  amount: z.number(),
  status: patientActivityStatusSchema,
  paidBy: z.enum(["insurance", "cash"]),
});

export const findTodayActivityParamsSchema = z.object({
  clinicId: z.uuid(),
  date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const findTodayScheduleParamsSchema = z.object({
  clinicId: z.uuid(),
  date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

export const todayScheduleRowSchema = z.object({
  id: z.uuid(),
  time: z.string(),
  patientName: z.string(),
  visitType: z.string(),
  providerName: z.string().nullable(),
});

export type PatientActivityRow = z.infer<typeof patientActivityRowSchema>;
export type PatientActivityStatus = z.infer<typeof patientActivityStatusSchema>;
export type FindTodayActivityParams = z.infer<
  typeof findTodayActivityParamsSchema
>;
export type TodayScheduleRow = z.infer<typeof todayScheduleRowSchema>;
