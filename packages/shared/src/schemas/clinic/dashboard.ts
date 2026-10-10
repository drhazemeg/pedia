// packages/shared/src/schemas/clinic/dashboard.ts
import { z } from "zod";

const dashboardStatsSchema = z.object({
  totalPatients: z.number().int().nonnegative(),
  activePatients: z.number().int().nonnegative(),
  todayAppointments: z.number().int().nonnegative(),
  appointmentsThisWeek: z.number().int().nonnegative(),
  pendingFollowUps: z.number().int().nonnegative(),
  upcomingVaccinations: z.number().int().nonnegative(),
  completionRate: z.number(),
});

const appointmentListRowSchema = z.object({
  id: z.uuid(),
  notes: z.string().nullable(),
  patientId: z.uuid(),
  patientName: z.string(),
  priority: z.string().nullable(),
  providerName: z.string().nullable(),
  scheduledAt: z.coerce.date(),
  status: z.string(),
  type: z.string(),
});

const overdueVaccinationRowSchema = z.object({
  patientId: z.uuid(),
  patientName: z.string(),
  scheduledDate: z.coerce.date().nullable(),
  status: z.string(),
  vaccineName: z.string(),
});

const recentActivityRowSchema = z.object({
  id: z.uuid(),
  type: z.enum(["encounter", "appointment", "immunization"]),
  description: z.string(),
  patientId: z.uuid(),
  patientName: z.string(),
  timestamp: z.coerce.date(),
});

const insightSeriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  ts: z.number().optional(),
});

export {
  appointmentListRowSchema,
  dashboardStatsSchema,
  insightSeriesPointSchema,
  overdueVaccinationRowSchema,
  recentActivityRowSchema,
};

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type AppointmentListRow = z.infer<typeof appointmentListRowSchema>;
export type OverdueVaccinationRow = z.infer<typeof overdueVaccinationRowSchema>;
export type RecentActivityRow = z.infer<typeof recentActivityRowSchema>;
export type InsightSeriesPoint = z.infer<typeof insightSeriesPointSchema>;
