// packages/api/src/routers/dashboard.ts

import { ORPCError } from "@orpc/server";
import {
  dashboardRepository,
  type RecentActivityRow,
  type Scope,
} from "@pedia/db/repositories/dashboard.repo";
import { logger } from "@pedia/shared/logger/server";
import type { DashboardStats } from "@pedia/shared/schemas/clinic/dashboard";
import { z } from "zod";

import { staffProcedure } from "../index";

// ============================================================================
// Output types
// ============================================================================

export interface TodayScheduleItem {
  id: string;
  isOverdue: boolean;
  isUrgent: boolean;
  notes?: string;
  patientId: string;
  patientName: string;
  providerName?: string;
  status: AppointmentStatus;
  time: string;
  type: string;
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface ActivityItem {
  description: string;
  id: string;
  patientId: string;
  patientName: string;
  timestamp: Date;
  type:
    | "encounter"
    | "appointment"
    | "immunization"
    | "lab_result"
    | "prescription";
}

export interface Alert {
  actionUrl?: string;
  id: string;
  message: string;
  patientId: string;
  patientName: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  type:
    | "overdue_vaccination"
    | "abnormal_growth"
    | "missed_appointment"
    | "lab_result";
}

// ============================================================================
// Input schemas
// ============================================================================

const getStatsSchema = z.object({
  cacheBust: z.boolean().optional().default(false),
});

const getTodayScheduleSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  includeCompleted: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(50).default(20),
});

const getRecentActivitySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

const getAlertsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  includeResolved: z.boolean().optional().default(false),
});

const getDashboardSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  includeAlerts: z.boolean().optional().default(true),
  includeActivity: z.boolean().optional().default(true),
  includeSchedule: z.boolean().optional().default(true),
});

const resolveAlertSchema = z.object({
  alertId: z.string().min(1),
  notes: z.string().optional(),
});

// ============================================================================
// Scope resolution
// ============================================================================

/**
 * Doctors see only their own patients; everyone else sees the whole clinic.
 *
 * The clinic id always comes from the authenticated context — never from
 * input — so a caller can't widen their own scope by supplying a different
 * clinic. If the context is missing a clinic id, we fail closed with a
 * `FORBIDDEN` rather than silently returning an empty result set.
 */
function scopeFor(context: {
  user?: { id: string; role: string } | null;
  clinicId?: string | null;
}): Scope {
  if (!context.clinicId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Clinic membership required",
    });
  }
  return {
    clinicId: context.clinicId,
    providerId: context.user?.role === "doctor" ? context.user.id : undefined,
  };
}

// ============================================================================
// Error handling
// ============================================================================

/**
 * Wrap a handler so every failure becomes a clean `ORPCError` with a
 * logged cause. Replaces 8 near-identical try/catch blocks.
 *
 * The wrapper is intentionally minimal: it does *not* resolve scope, does
 * *not* mutate input, and does *not* try to be clever about the handler's
 * arguments. Callers get the raw oRPC argument object (`{ input, context }`)
 * and are responsible for extracting what they need.
 *
 * NOTE: a shared version of this helper now lives at
 * `packages/api/src/middleware/with-error-handler.ts`. This local copy is
 * kept for now so the diff stays scoped to fixing the compile errors; the
 * router will be migrated to the shared helper in a follow-up pass.
 */
function withErrorHandling<TArgs, TOutput>(
  name: string,
  fn: (args: TArgs) => Promise<TOutput>
): (args: TArgs) => Promise<TOutput> {
  return async (args: TArgs): Promise<TOutput> => {
    try {
      return await fn(args);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: `${name} failed`,
        error: message,
        cause: error,
      });

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `${name} failed: ${message}`,
        cause: error,
      });
    }
  };
}

// ============================================================================
// Adapters (repo row → router output)
// ============================================================================

const STATUS_MAP: Record<string, AppointmentStatus> = {
  scheduled: "scheduled",
  confirmed: "confirmed",
  "in-progress": "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
  "no-show": "no_show",
  no_show: "no_show",
};

function toScheduleItem(
  row: Awaited<
    ReturnType<typeof dashboardRepository.getAppointmentsByDate>
  >[number]
): TodayScheduleItem {
  const statusKey = (row.status ?? "").toLowerCase();
  const status = STATUS_MAP[statusKey] ?? "scheduled";
  const scheduledAt = new Date(row.scheduledAt);
  const now = new Date();

  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    providerName: row.providerName ?? undefined,
    time: scheduledAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    type: row.type,
    status,
    isOverdue:
      scheduledAt < now && status !== "completed" && status !== "cancelled",
    isUrgent: row.priority === "Urgent" || row.priority === "Emergency",
    notes: row.notes ?? undefined,
  };
}

function toActivityItem(row: RecentActivityRow): ActivityItem {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    description: row.description,
    timestamp: row.timestamp,
    type: row.type,
  };
}

// ============================================================================
// Alerts
// ============================================================================

async function buildAlerts(
  scope: Scope,
  options: { limit: number; severity?: Alert["severity"] }
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Only build critical alerts if the caller asked for critical or no filter.
  if (!options.severity || options.severity === "critical") {
    const overdue = await dashboardRepository.getOverdueVaccinations(
      scope,
      options.limit + 5
    );

    for (const vax of overdue) {
      if (!vax.scheduledDate) continue;
      alerts.push({
        // Include the vaccine name so multiple overdue vaccines for the
        // same patient don't collide.
        id: `vax:${vax.patientId}:${vax.vaccineName}:${vax.scheduledDate}`,
        patientId: vax.patientId,
        patientName: vax.patientName,
        type: "overdue_vaccination",
        message: `${vax.vaccineName} vaccination overdue (${new Date(vax.scheduledDate).toLocaleDateString()})`,
        severity: "critical",
        timestamp: new Date(vax.scheduledDate),
        actionUrl: `/app/patients/${vax.patientId}/immunizations`,
      });
    }
  }

  return alerts
    .toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, options.limit);
}

// ============================================================================
// Router
// ============================================================================

export const dashboardRouter = {
  getDashboard: staffProcedure.input(getDashboardSchema).handler(
    withErrorHandling("getDashboard", async ({ input, context }) => {
      const scope = scopeFor(context);
      const { date, includeAlerts, includeActivity, includeSchedule } = input;

      const [stats, schedule, activity, alerts] = await Promise.all([
        dashboardRepository.getDashboardStats(scope),
        includeSchedule
          ? dashboardRepository
              .getAppointmentsByDate(date, scope, { limit: 20 })
              .then((rows) => rows.map(toScheduleItem))
          : Promise.resolve([]),
        includeActivity
          ? dashboardRepository
              .getRecentActivity(scope, 10)
              .then((rows) => rows.map(toActivityItem))
          : Promise.resolve([]),
        includeAlerts ? buildAlerts(scope, { limit: 10 }) : Promise.resolve([]),
      ]);

      return {
        stats,
        todaySchedule: schedule,
        recentActivity: activity,
        alerts,
        lastUpdated: new Date(),
      };
    })
  ),

  getSummary: staffProcedure.input(getStatsSchema).handler(
    withErrorHandling("getSummary", async ({ context }) => {
      const scope = scopeFor(context);
      const [stats, alerts] = await Promise.all([
        dashboardRepository.getDashboardStats(scope),
        buildAlerts(scope, { limit: 1 }),
      ]);

      return {
        stats,
        alertsCount: alerts.length,
        todayAppointmentsCount: stats.todayAppointments,
        recentActivityCount: 10,
      };
    })
  ),

  getStats: staffProcedure.input(getStatsSchema).handler(
    withErrorHandling<
      {
        input: z.infer<typeof getStatsSchema>;
        context: Parameters<typeof scopeFor>[0];
      },
      DashboardStats
    >("getStats", async ({ context }) =>
      dashboardRepository.getDashboardStats(scopeFor(context))
    )
  ),

  getStatsLite: staffProcedure.handler(
    withErrorHandling("getStatsLite", async ({ context }) => {
      const scope = scopeFor(context);
      const stats = await dashboardRepository.getDashboardStats(scope);
      return {
        stats,
        alertsCount: 0,
        todayAppointmentsCount: stats.todayAppointments,
        recentActivityCount: 0,
      };
    })
  ),

  getTodaySchedule: staffProcedure.input(getTodayScheduleSchema).handler(
    withErrorHandling("getTodaySchedule", async ({ input, context }) => {
      const scope = scopeFor(context);
      const rows = await dashboardRepository.getAppointmentsByDate(
        input.date,
        scope,
        {
          includeCompleted: input.includeCompleted,
          limit: input.limit,
        }
      );
      const schedule = rows.map(toScheduleItem);

      return {
        date: input.date.toISOString(),
        schedule,
        total: schedule.length,
        completed: schedule.filter((a) => a.status === "completed").length,
        pending: schedule.filter(
          (a) => a.status !== "completed" && a.status !== "cancelled"
        ).length,
      };
    })
  ),

  getRecentActivity: staffProcedure.input(getRecentActivitySchema).handler(
    withErrorHandling("getRecentActivity", async ({ input, context }) => {
      const scope = scopeFor(context);
      const rows = await dashboardRepository.getRecentActivity(
        scope,
        input.limit
      );
      const activity = rows.map(toActivityItem);

      return {
        activity,
        total: activity.length,
        hasMore: activity.length === input.limit,
      };
    })
  ),

  getAlerts: staffProcedure.input(getAlertsSchema).handler(
    withErrorHandling("getAlerts", async ({ input, context }) => {
      const scope = scopeFor(context);
      const alerts = await buildAlerts(scope, {
        limit: input.limit,
        severity: input.severity,
      });

      return {
        alerts,
        total: alerts.length,
        criticalCount: alerts.filter((a) => a.severity === "critical").length,
        warningCount: alerts.filter((a) => a.severity === "warning").length,
        infoCount: alerts.filter((a) => a.severity === "info").length,
      };
    })
  ),

  resolveAlert: staffProcedure
    .input(resolveAlertSchema)
    .handler(async ({ input, context }) => {
      // TODO: persist the resolution. The repo has no resolver today.
      logger.info({
        msg: "Alert resolved",
        userId: context.session.user?.id,
        alertId: input.alertId,
        notes: input.notes,
      });

      return {
        success: true,
        alertId: input.alertId,
        resolvedAt: new Date(),
        resolvedBy: context.session.user?.id,
      };
    }),
};

export type DashboardRouter = typeof dashboardRouter;
