// packages/db/src/repositories/dashboard.repo.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import type { ImmunizationStatus } from "@pedia/db/schema";
import {
  appointments as appointmentTable,
  invoices as invoiceTable,
  patients as patientTable,
  payments as paymentTable,
  staff,
  immunizations as vaccinationTable,
  encounters as visitTable,
} from "@pedia/db/schema/index";
import type { DashboardStats } from "@pedia/shared/schemas/clinic/dashboard";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";

export type Scope = { clinicId?: string; providerId?: string };

export type SeriesRange = {
  from?: Date | string;
  to?: Date | string;
  weeks?: number;
};

export type DateTrunc = "day" | "week" | "month" | "quarter" | "year";

export type InsightSeriesPoint = {
  label: string;
  value: number;
  ts?: number;
};

export type RecentActivityRow = {
  description: string;
  id: string;
  patientId: string;
  patientName: string;
  timestamp: Date;
  type: "encounter" | "appointment" | "immunization";
};

export type AppointmentListRow = {
  id: string;
  notes: string | null;
  patientId: string;
  patientName: string;
  priority: string | null;
  providerName: string | null;
  scheduledAt: Date;
  status: string;
  type: string;
};

export type OverdueVaccinationRow = {
  patientId: string;
  patientName: string;
  scheduledDate: Date | null;
  status: string;
  vaccineName: string;
};

const STATS_TTL_MS = 30_000;
const LIST_TTL_MS = 15_000;
const DEFAULT_WEEKS = 12;
const DENSIFY_GUARD = 500;

function resolveScope(input: Scope | string | undefined): Scope {
  if (!input) return {};
  if (typeof input === "string") return { clinicId: input };
  return input;
}

function patientScope(scope: Scope): SQL | undefined {
  const parts: SQL[] = [];
  if (scope.clinicId) parts.push(eq(patientTable.clinicId, scope.clinicId));
  if (scope.providerId) {
    parts.push(eq(patientTable.pediatricianId, scope.providerId));
  }
  return parts.length > 0 ? and(...parts) : undefined;
}

function utcDayRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function utcIsoWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const { start: dayStart } = utcDayRange(date);
  const day = dayStart.getUTCDay();
  const diff = (day + 6) % 7;
  const start = new Date(dayStart);
  start.setUTCDate(start.getUTCDate() - diff);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dueDateAsDate(): SQL {
  return sql`(${vaccinationTable.dueDate})::date`;
}

function cacheKey(prefix: string, scope: Scope, ...rest: unknown[]): string {
  return `${prefix}:${scope.clinicId ?? "all"}:${scope.providerId ?? "all"}:${rest.join(":")}`;
}

async function cached<T>(
  key: string,
  ttl: number,
  tags: string[],
  fn: () => Promise<T>
): Promise<T> {
  const hit = queryCache.get<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  queryCache.set(key, value, { ttl, tags });
  return value;
}

function resolveSeriesRange(
  range: SeriesRange,
  defaultWeeks = DEFAULT_WEEKS
): { start: Date; end: Date } {
  const end = range.to ? new Date(range.to) : new Date();
  const start = range.from
    ? new Date(range.from)
    : (() => {
        const d = new Date(end);
        d.setUTCDate(d.getUTCDate() - (range.weeks ?? defaultWeeks) * 7);
        return d;
      })();
  return { start, end };
}

function coerceBucket(bucket: unknown): Date {
  if (bucket instanceof Date) return bucket;
  if (typeof bucket === "string") return new Date(bucket);
  if (typeof bucket === "number") return new Date(bucket);
  return new Date(0);
}
function truncDate(d: Date, granularity: DateTrunc): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  switch (granularity) {
    case "day":
      break;
    case "week": {
      const day = out.getUTCDay();
      const diff = (day + 6) % 7;
      out.setUTCDate(out.getUTCDate() - diff);
      break;
    }
    case "month":
      out.setUTCDate(1);
      break;
    case "quarter":
      out.setUTCDate(1);
      out.setUTCMonth(Math.floor(out.getUTCMonth() / 3) * 3);
      break;
    case "year":
      out.setUTCDate(1);
      out.setUTCMonth(0);
      break;
    default: {
      // Exhaustive check — should never be reached.
      break;
    }
  }
  return out;
}

function advance(d: Date, granularity: DateTrunc): void {
  switch (granularity) {
    case "day":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "week":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "month":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "quarter":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "year":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    default: {
      break;
    }
  }
}
function bucketKey(d: Date, granularity: DateTrunc): string {
  return `${granularity}:${d.toISOString().slice(0, 10)}`;
}

function formatBucketLabel(d: Date, granularity: DateTrunc): string {
  switch (granularity) {
    case "day":
    case "week":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    case "month":
      return d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      });
    case "quarter":
      return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(
        d.getUTCFullYear()
      ).slice(2)}`;
    case "year":
      return String(d.getUTCFullYear());
    default:
      return d.toLocaleDateString("en-US", { timeZone: "UTC" });
  }
}

function densifySeries(
  rows: ReadonlyArray<{ bucket: unknown; value: number | string }>,
  start: Date,
  end: Date,
  granularity: DateTrunc
): InsightSeriesPoint[] {
  const byKey = new Map<string, number>();
  for (const row of rows) {
    const d = coerceBucket(row.bucket);
    byKey.set(bucketKey(d, granularity), Number(row.value) || 0);
  }

  const out: InsightSeriesPoint[] = [];
  let cursor = truncDate(start, granularity);
  const last = truncDate(end, granularity);

  let guard = 0;
  while (cursor <= last && guard < DENSIFY_GUARD) {
    out.push({
      label: formatBucketLabel(cursor, granularity),
      value: byKey.get(bucketKey(cursor, granularity)) ?? 0,
      ts: cursor.getTime(),
    });
    const next = new Date(cursor);
    advance(next, granularity);
    cursor = next;
    guard += 1;
  }

  return out;
}

type StatsRow = {
  totalPatients: number;
  activePatients: number;
  todayAppointments: number;
  weekAppointments: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingFollowUps: number;
  upcomingVaccinations: number;
};

async function queryAggregateStats(scope: Scope = {}): Promise<DashboardStats> {
  const { start: todayStart } = utcDayRange();
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const { start: weekStart, end: weekEnd } = utcIsoWeekRange();

  const sevenDaysOut = new Date(todayStart);
  sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7);

  const apptScope = and(
    patientScope(scope),
    scope.providerId
      ? eq(appointmentTable.doctorId, scope.providerId)
      : undefined
  );
  const followUpScope = and(
    patientScope(scope),
    scope.providerId ? eq(visitTable.doctorId, scope.providerId) : undefined
  );
  const vaxScope = and(
    patientScope(scope),
    scope.providerId
      ? eq(patientTable.pediatricianId, scope.providerId)
      : undefined
  );

  const patientFilter = patientScope(scope) ?? sql`true`;
  const todayIso = isoDate(todayStart);
  const sevenDaysIso = isoDate(sevenDaysOut);

  const result = await db.execute<StatsRow>(sql`
		SELECT
			(SELECT count(*)::int FROM ${patientTable} WHERE ${patientFilter}) AS "totalPatients",
			(SELECT count(*)::int FROM ${patientTable}
			  WHERE ${and(eq(patientTable.activeStatus, "active"), patientFilter)}) AS "activePatients",
			(SELECT count(*)::int FROM ${appointmentTable}
			  INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
			  WHERE ${and(
          apptScope,
          gte(appointmentTable.startTime, todayStart),
          lt(appointmentTable.startTime, todayEnd)
        )}) AS "todayAppointments",
			(SELECT count(*)::int FROM ${appointmentTable}
			  INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
			  WHERE ${and(
          apptScope,
          gte(appointmentTable.startTime, weekStart),
          lt(appointmentTable.startTime, weekEnd)
        )}) AS "weekAppointments",
			(SELECT count(*)::int FROM ${appointmentTable}
			  INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
			  WHERE ${apptScope ?? sql`true`}) AS "totalAppointments",
			(SELECT count(*) FILTER (WHERE ${appointmentTable.status} = 'Completed')::int
			   FROM ${appointmentTable}
			   INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
			  WHERE ${apptScope ?? sql`true`}) AS "completedAppointments",
			(SELECT count(*)::int FROM ${visitTable}
			   INNER JOIN ${patientTable} ON ${visitTable.patientId} = ${patientTable.id}
			  WHERE ${and(
          followUpScope,
          eq(visitTable.status, "Completed"),
          sql`${visitTable.followUpDate} IS NOT NULL`,
          sql`${visitTable.followUpDate}::date >= ${todayIso}::date`
        )}) AS "pendingFollowUps",
			(SELECT count(*)::int FROM ${vaccinationTable}
			   INNER JOIN ${patientTable} ON ${vaccinationTable.patientId} = ${patientTable.id}
			  WHERE ${and(
          vaxScope,
          eq(vaccinationTable.status, "due"),
          sql`${dueDateAsDate()} >= ${todayIso}::date`,
          sql`${dueDateAsDate()} <  ${sevenDaysIso}::date`
        )}) AS "upcomingVaccinations"
	`);

  const row = (result as unknown as StatsRow[])[0];
  const totalAppointments = row?.totalAppointments ?? 0;

  return {
    totalPatients: row?.totalPatients ?? 0,
    activePatients: row?.activePatients ?? 0,
    todayAppointments: row?.todayAppointments ?? 0,
    appointmentsThisWeek: row?.weekAppointments ?? 0,
    pendingFollowUps: row?.pendingFollowUps ?? 0,
    upcomingVaccinations: row?.upcomingVaccinations ?? 0,
    completionRate:
      totalAppointments === 0
        ? 0
        : ((row?.completedAppointments ?? 0) / totalAppointments) * 100,
  };
}

const statsInFlight = new Map<string, Promise<DashboardStats>>();

async function loadAggregateStats(scope: Scope = {}): Promise<DashboardStats> {
  const key = cacheKey("dashboard:stats", scope);
  const inFlight = statsInFlight.get(key);
  if (inFlight) return inFlight;
  const promise = queryAggregateStats(scope).finally(() =>
    statsInFlight.delete(key)
  );
  statsInFlight.set(key, promise);
  return promise;
}

export const dashboardRepository = {
  async getDashboardStats(
    scopeInput: Scope | string | undefined = {}
  ): Promise<DashboardStats> {
    const scope = resolveScope(scopeInput);
    return cached(
      cacheKey("dashboard:stats", scope),
      STATS_TTL_MS,
      [
        "dashboard:patients",
        "dashboard:appointments",
        "dashboard:followups",
        "dashboard:vaccinations",
      ],
      () => loadAggregateStats(scope)
    );
  },

  async getTotalPatientsCount(scopeInput: Scope | string | undefined = {}) {
    return (await this.getDashboardStats(scopeInput)).totalPatients;
  },

  async getActivePatientsCount(scopeInput: Scope | string | undefined = {}) {
    return (await this.getDashboardStats(scopeInput)).activePatients;
  },

  async getTodayAppointmentsCount(scopeInput: Scope | string | undefined = {}) {
    return (await this.getDashboardStats(scopeInput)).todayAppointments;
  },

  async getAppointmentsThisWeekCount(
    scopeInput: Scope | string | undefined = {}
  ) {
    return (await this.getDashboardStats(scopeInput)).appointmentsThisWeek;
  },

  async getAppointmentCompletionRate(
    scopeInput: Scope | string | undefined = {}
  ) {
    return (await this.getDashboardStats(scopeInput)).completionRate;
  },

  async getPendingFollowUpsCount(scopeInput: Scope | string | undefined = {}) {
    return (await this.getDashboardStats(scopeInput)).pendingFollowUps;
  },

  async getUpcomingVaccinationsCount(
    scopeInput: Scope | string | undefined = {}
  ) {
    return (await this.getDashboardStats(scopeInput)).upcomingVaccinations;
  },

  async getAppointmentsByDate(
    date: Date,
    scopeInput: Scope | string | undefined = {},
    options: { includeCompleted?: boolean; limit?: number } = {}
  ): Promise<AppointmentListRow[]> {
    const scope = resolveScope(scopeInput);
    const { includeCompleted = false, limit = 20 } = options;
    const { start, end } = utcDayRange(date);

    return cached(
      cacheKey(
        "dashboard:appointments:by-date",
        scope,
        start.toISOString(),
        includeCompleted,
        limit
      ),
      LIST_TTL_MS,
      ["dashboard:appointments"],
      async () => {
        const rows = await db
          .select({
            id: appointmentTable.id,
            patientId: patientTable.id,
            priority: appointmentTable.priority,
            notes: appointmentTable.notes,
            patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
            scheduledAt: appointmentTable.startTime,
            type: appointmentTable.type,
            status: appointmentTable.status,
            providerName: sql<string | null>`${staff.name}`,
          })
          .from(appointmentTable)
          .innerJoin(
            patientTable,
            eq(appointmentTable.patientId, patientTable.id)
          )
          .leftJoin(staff, eq(appointmentTable.staffId, staff.id))
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(appointmentTable.doctorId, scope.providerId)
                : undefined,
              gte(appointmentTable.startTime, start),
              lt(appointmentTable.startTime, end),
              includeCompleted
                ? undefined
                : sql`${appointmentTable.status} <> 'Completed'`
            )
          )
          .orderBy(appointmentTable.startTime)
          .limit(limit);

        return rows;
      }
    );
  },

  async getAppointmentsByDateRange(
    startDate: Date,
    endDate: Date,
    scopeInput: Scope | string | undefined = {}
  ): Promise<AppointmentListRow[]> {
    const scope = resolveScope(scopeInput);
    return cached(
      cacheKey(
        "dashboard:appointments:by-range",
        scope,
        startDate.toISOString(),
        endDate.toISOString()
      ),
      LIST_TTL_MS,
      ["dashboard:appointments"],
      async () => {
        const rows = await db
          .select({
            id: appointmentTable.id,
            patientId: patientTable.id,
            priority: appointmentTable.priority,
            notes: appointmentTable.notes,
            patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
            scheduledAt: appointmentTable.startTime,
            type: appointmentTable.type,
            status: appointmentTable.status,
            providerName: sql<string | null>`NULL`,
          })
          .from(appointmentTable)
          .innerJoin(
            patientTable,
            eq(appointmentTable.patientId, patientTable.id)
          )
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(appointmentTable.doctorId, scope.providerId)
                : undefined,
              gte(appointmentTable.startTime, startDate),
              lt(appointmentTable.startTime, endDate)
            )
          )
          .orderBy(appointmentTable.startTime);

        return rows;
      }
    );
  },

  async getOverdueVaccinations(
    scopeInput: Scope | string | undefined = {},
    limit = 5
  ): Promise<OverdueVaccinationRow[]> {
    const scope = resolveScope(scopeInput);
    const today = utcDayRange();
    return cached(
      cacheKey(
        "dashboard:vaccinations:overdue",
        scope,
        today.start.toISOString(),
        limit
      ),
      LIST_TTL_MS,
      ["dashboard:vaccinations"],
      async () => {
        const rows = await db
          .select({
            patientId: patientTable.id,
            patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
            vaccineName: vaccinationTable.vaccineName,
            scheduledDate: sql<Date | null>`${vaccinationTable.dueDate}::timestamp`,
            status: vaccinationTable.status,
          })
          .from(vaccinationTable)
          .innerJoin(
            patientTable,
            eq(vaccinationTable.patientId, patientTable.id)
          )
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(patientTable.pediatricianId, scope.providerId)
                : undefined,
              eq(vaccinationTable.status, "overdue"),
              sql`${dueDateAsDate()} < ${isoDate(today.start)}::date`
            )
          )
          .orderBy(vaccinationTable.dueDate)
          .limit(limit);

        return rows;
      }
    );
  },

  async getRecentActivity(
    scopeInput: Scope | string | undefined = {},
    limit = 10
  ): Promise<RecentActivityRow[]> {
    const scope = resolveScope(scopeInput);
    return cached(
      cacheKey("dashboard:activity:recent", scope, limit),
      LIST_TTL_MS,
      ["dashboard:activity"],
      async () => {
        const patientName = sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`;

        const encountersQuery = db
          .select({
            id: visitTable.id,
            type: sql<string>`'encounter'`,
            timestamp: visitTable.encounterDate,
            patientId: patientTable.id,
            patientName,
            description: sql<string>`'Encounter: ' || COALESCE(${visitTable.chiefComplaint}, 'General')`,
          })
          .from(visitTable)
          .innerJoin(patientTable, eq(visitTable.patientId, patientTable.id))
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(visitTable.doctorId, scope.providerId)
                : undefined
            )
          );

        const appointmentsQuery = db
          .select({
            id: appointmentTable.id,
            type: sql<string>`'appointment'`,
            timestamp: appointmentTable.startTime,
            patientId: patientTable.id,
            patientName,
            description: sql<string>`'Appointment: ' || COALESCE(${appointmentTable.status}::text, 'Scheduled')`,
          })
          .from(appointmentTable)
          .innerJoin(
            patientTable,
            eq(appointmentTable.patientId, patientTable.id)
          )
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(appointmentTable.doctorId, scope.providerId)
                : undefined
            )
          );

        const immunizationsQuery = db
          .select({
            id: vaccinationTable.id,
            type: sql<string>`'immunization'`,
            timestamp: vaccinationTable.createdAt,
            patientId: patientTable.id,
            patientName,
            description: sql<string>`'Immunization administered: ' || COALESCE(${vaccinationTable.vaccineName}, 'Vaccine')`,
          })
          .from(vaccinationTable)
          .innerJoin(
            patientTable,
            eq(vaccinationTable.patientId, patientTable.id)
          )
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(patientTable.pediatricianId, scope.providerId)
                : undefined
            )
          );

        const unioned = encountersQuery
          .unionAll(appointmentsQuery)
          .unionAll(immunizationsQuery)
          .as("recent_activities");

        const rows = await db
          .select()
          .from(unioned)
          .orderBy(desc(sql`timestamp`))
          .limit(limit);

        return rows;
      }
    );
  },

  async getVisitsSeries(
    scopeInput: Scope | string | undefined = {},
    range: SeriesRange = {}
  ): Promise<InsightSeriesPoint[]> {
    const scope = resolveScope(scopeInput);
    const granularity: DateTrunc = "week";
    const { start, end } = resolveSeriesRange(range);

    return cached(
      cacheKey(
        "dashboard:series:visits",
        scope,
        start.toISOString(),
        end.toISOString(),
        granularity
      ),
      LIST_TTL_MS,
      ["dashboard:visits", "dashboard:series"],
      async () => {
        const bucket = sql<Date>`date_trunc('week', ${visitTable.encounterDate})`;
        const rows = await db
          .select({
            bucket,
            value: sql<number>`count(*)::int`,
          })
          .from(visitTable)
          .innerJoin(patientTable, eq(visitTable.patientId, patientTable.id))
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(visitTable.doctorId, scope.providerId)
                : undefined,
              gte(visitTable.encounterDate, start),
              lt(visitTable.encounterDate, end)
            )
          )
          .groupBy(bucket)
          .orderBy(asc(bucket));

        return densifySeries(rows, start, end, granularity);
      }
    );
  },

  async getNewPatientsSeries(
    scopeInput: Scope | string | undefined = {},
    range: SeriesRange = {}
  ): Promise<InsightSeriesPoint[]> {
    const scope = resolveScope(scopeInput);
    const granularity: DateTrunc = "month";
    const { start, end } = resolveSeriesRange(range, 52);

    return cached(
      cacheKey(
        "dashboard:series:new-patients",
        scope,
        start.toISOString(),
        end.toISOString(),
        granularity
      ),
      LIST_TTL_MS,
      ["dashboard:patients", "dashboard:series"],
      async () => {
        const bucket = sql<Date>`date_trunc('month', ${patientTable.createdAt})`;
        const rows = await db
          .select({
            bucket,
            value: sql<number>`count(*)::int`,
          })
          .from(patientTable)
          .where(
            and(
              patientScope(scope),
              gte(patientTable.createdAt, start),
              lt(patientTable.createdAt, end)
            )
          )
          .groupBy(bucket)
          .orderBy(asc(bucket));

        return densifySeries(rows, start, end, granularity);
      }
    );
  },

  async getImmunizationsSeries(
    scopeInput: Scope | string | undefined = {},
    range: SeriesRange = {},
    status: ImmunizationStatus = "administered"
  ): Promise<InsightSeriesPoint[]> {
    const scope = resolveScope(scopeInput);
    const granularity: DateTrunc = "week";
    const { start, end } = resolveSeriesRange(range);

    return cached(
      cacheKey(
        "dashboard:series:immunizations",
        scope,
        start.toISOString(),
        end.toISOString(),
        granularity,
        status
      ),
      LIST_TTL_MS,
      ["dashboard:vaccinations", "dashboard:series"],
      async () => {
        const effectiveDate = sql`COALESCE(${vaccinationTable.administeredDate}::timestamp, ${vaccinationTable.createdAt})`;
        const bucket = sql<Date>`date_trunc('week', ${effectiveDate})`;

        const rows = await db
          .select({
            bucket,
            value: sql<number>`count(*)::int`,
          })
          .from(vaccinationTable)
          .innerJoin(
            patientTable,
            eq(vaccinationTable.patientId, patientTable.id)
          )
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(patientTable.pediatricianId, scope.providerId)
                : undefined,
              eq(vaccinationTable.status, status),
              gte(effectiveDate, start),
              lt(effectiveDate, end)
            )
          )
          .groupBy(bucket)
          .orderBy(asc(bucket));

        return densifySeries(rows, start, end, granularity);
      }
    );
  },

  async getRevenueSeries(
    scopeInput: Scope | string | undefined = {},
    range: SeriesRange = {}
  ): Promise<InsightSeriesPoint[]> {
    const scope = resolveScope(scopeInput);
    const granularity: DateTrunc = "week";
    const { start, end } = resolveSeriesRange(range);

    return cached(
      cacheKey(
        "dashboard:series:revenue",
        scope,
        start.toISOString(),
        end.toISOString(),
        granularity
      ),
      LIST_TTL_MS,
      ["dashboard:revenue", "dashboard:series"],
      async () => {
        const bucket = sql<Date>`date_trunc('week', ${paymentTable.receivedAt})`;
        const rows = await db
          .select({
            bucket,
            value: sql<number>`COALESCE(sum(${paymentTable.amount}::numeric), 0)::float`,
          })
          .from(paymentTable)
          .innerJoin(invoiceTable, eq(paymentTable.invoiceId, invoiceTable.id))
          .innerJoin(patientTable, eq(invoiceTable.patientId, patientTable.id))
          .where(
            and(
              patientScope(scope),
              scope.providerId
                ? eq(patientTable.pediatricianId, scope.providerId)
                : undefined,
              eq(paymentTable.status, "completed"),
              gte(paymentTable.receivedAt, start),
              lt(paymentTable.receivedAt, end)
            )
          )
          .groupBy(bucket)
          .orderBy(asc(bucket));

        return densifySeries(rows, start, end, granularity);
      }
    );
  },
};

export type DashboardRepository = typeof dashboardRepository;
