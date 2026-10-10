import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import type { EncounterStatus } from "@pedia/db/schema";
import { doctors, encounters, patients, staff } from "@pedia/db/schema";
// src/lib/db/repositories/encounter.repository.ts
import type { SQL } from "drizzle-orm";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type {
  Doctor,
  Encounter,
  NewEncounter,
  Patient,
  Staff,
} from "../schema/types";
import type { EncounterRow } from "../seed/helper";
import type { ClinicScope } from "./base.repository";
import {
  BaseRepository,
  combineConditions,
  readCount,
} from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Types
// ============================================================

export type FindByPatientOptions = {
  endDate?: Date;
  limit?: number;
  offset?: number;
  startDate?: Date;
  status?: EncounterStatus;
};

export type SearchOptions = {
  endDate?: Date;
  limit?: number;
  offset?: number;
  patientId?: string;
  doctorId?: string;
  query?: string;
  startDate?: Date;
  status?: EncounterStatus;
};

export type DateRangeOptions = {
  limit?: number;
  offset?: number;
};

export type CountOptions = {
  endDate?: Date;
  patientId?: string;
  doctorId?: string;
  startDate?: Date;
  status?: EncounterStatus;
};

type EncounterWithRelations = Encounter & {
  patient: Patient;
  doctor: Doctor | null;
  provider: Staff;
};

// ============================================================
// Helpers
// ============================================================

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function buildEncounterConditions(opts: {
  patientId?: string;
  doctorId?: string;
  status?: EncounterStatus;
  startDate?: Date;
  endDate?: Date;
  query?: string;
}): Array<SQL | undefined> {
  const conditions: Array<SQL | undefined> = [];

  if (opts.patientId) conditions.push(eq(encounters.patientId, opts.patientId));
  if (opts.doctorId) conditions.push(eq(encounters.doctorId, opts.doctorId));
  if (opts.status) conditions.push(eq(encounters.status, opts.status));
  if (opts.startDate)
    conditions.push(gte(encounters.encounterDate, opts.startDate));
  if (opts.endDate)
    conditions.push(lte(encounters.encounterDate, opts.endDate));

  if (opts.query) {
    const pattern = `%${escapeLikePattern(opts.query)}%`;
    conditions.push(
      or(
        ilike(encounters.chiefComplaint, pattern),
        ilike(encounters.encounterNumber, pattern),
        or(
          ilike(patients.firstName, pattern),
          ilike(patients.lastName, pattern),
          ilike(patients.mrn, pattern)
        )
      )
    );
  }

  return conditions;
}

const isSql = (val: unknown): val is SQL =>
  val !== null && typeof val === "object" && "toSQL" in val;

// ============================================================
// Repository
// ============================================================

export class EncounterRepository extends BaseRepository {
  protected readonly table = encounters;
  protected readonly idColumn: PgColumn = encounters.id;
  protected readonly tableName = "encounters";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  async findById(
    id: string,
    scope?: ClinicScope
  ): Promise<EncounterWithRelations | null> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `encounter:${scopeKey}:${id}`;
    const cached = queryCache.get<EncounterWithRelations>(cacheKey);
    if (cached) return cached;

    const [row] = await this.db
      .select({
        encounter: encounters,
        patient: patients,
        doctor: doctors,
        provider: staff,
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(doctors, eq(encounters.doctorId, doctors.id))
      .innerJoin(staff, eq(encounters.providerId, staff.id))
      .where(
        and(
          eq(encounters.id, id),
          scope ? eq(patients.clinicId, scope.clinicId) : undefined
        )
      )
      .limit(1);

    const result = row
      ? {
          ...row.encounter,
          patient: row.patient,
          doctor: row.doctor,
          provider: row.provider,
        }
      : null;

    if (result) {
      queryCache.set(cacheKey, result, {
        ttl: CACHE_TTL,
        tags: [`encounter:${id}`, `patient:${result.patientId}:encounters`],
      });
    }

    return result ?? null;
  }
  async addDiagnosis(
    encounterId: string,
    diagnosis: { name: string; icdCode?: string; primary?: boolean }
  ): Promise<Encounter | null> {
    const encounter = await withTransaction(async (tx: Transaction) => {
      const [updated] = (await tx
        .update(encounters)
        .set({
          assessmentJson: sql`${encounters.assessmentJson} || ${JSON.stringify({
            diagnoses: [diagnosis],
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(encounters.id, encounterId))
        .returning()) as Encounter[];

      return updated ?? null;
    });

    if (encounter) {
      this.invalidateAfterWrite([encounter.patientId], encounter.id);
    }

    return encounter;
  }
  async findByPatientId(
    patientId: string,
    options: FindByPatientOptions = {}
  ): Promise<{ data: EncounterRow[]; total: number }> {
    const { limit = 50, offset = 0, status, startDate, endDate } = options;

    const cacheKey = `encounter:patient:${patientId}:${JSON.stringify({
      status,
      startDate,
      endDate,
      limit,
      offset,
    })}`;
    const cached = queryCache.get<{
      data: EncounterRow[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const shared = { patientId, status, startDate, endDate };
    const countWhere = combineConditions(buildEncounterConditions(shared));

    const [data, totalResult] = await Promise.all([
      this.db
        .select({ encounter: encounters })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .where(countWhere)
        .orderBy(desc(encounters.encounterDate))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .where(countWhere),
    ]);

    const result = {
      data: data.map((row) => row.encounter),
      total: readCount(totalResult),
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:encounters`],
    });

    return result;
  }

  async search(
    options: SearchOptions = {}
  ): Promise<{ data: Encounter[]; total: number }> {
    const {
      query,
      limit = 20,
      offset = 0,
      doctorId,
      status,
      startDate,
      endDate,
    } = options;

    const cacheKey = `encounter:search:${JSON.stringify(options)}`;
    const cached = queryCache.get<{
      data: Encounter[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const shared = {
      patientId: options.patientId,
      doctorId,
      status,
      startDate,
      endDate,
      query,
    };

    const countWhere = combineConditions(buildEncounterConditions(shared));

    const dataQuery = this.db
      .select({ encounter: encounters })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .where(countWhere)
      .orderBy(desc(encounters.encounterDate))
      .limit(limit)
      .offset(offset);

    const countQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .where(countWhere);

    const [data, totalResult] = await Promise.all([dataQuery, countQuery]);

    const result = {
      data: data.map((row) => row.encounter),
      total: readCount(totalResult),
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["encounters:list"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Write
  // --------------------------------------------------------------------------

  async create(data: NewEncounter): Promise<Encounter> {
    const encounter = await withTransaction(async (tx: Transaction) => {
      const [created] = (await tx
        .insert(encounters)
        .values(data)
        .returning()) as Encounter[];
      if (!created) throw new Error("Failed to create encounter");
      return created;
    });

    this.invalidateAfterWrite([encounter.patientId], encounter.id);
    return encounter;
  }

  async createBatch(data: NewEncounter[]): Promise<Encounter[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(
      async (tx: Transaction) =>
        tx.insert(encounters).values(data).returning() as Promise<Encounter[]>
    );

    const patientIds = [...new Set(results.map((e) => e.patientId))];
    this.invalidateAfterWrite(patientIds);
    return results;
  }

  async update(
    id: string,
    data: Partial<NewEncounter>
  ): Promise<Encounter | null> {
    const encounter = await withTransaction(async (tx: Transaction) => {
      const [updated] = (await tx
        .update(encounters)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(encounters.id, id))
        .returning()) as Encounter[];

      return updated ?? null;
    });

    if (encounter) {
      this.invalidateAfterWrite([encounter.patientId], encounter.id);
    }

    return encounter;
  }

  async delete(id: string): Promise<boolean> {
    const encounter = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.encounters.findFirst({
        where: { id },
      });
      if (!existing) return null;

      await tx.delete(encounters).where(eq(encounters.id, id));
      return existing;
    });

    if (!encounter) return false;

    this.invalidateAfterWrite([encounter.patientId], id);
    return true;
  }

  // --------------------------------------------------------------------------
  // Range / recent
  // --------------------------------------------------------------------------

  async getEncountersByDateRange(
    startDate: Date,
    endDate: Date,
    options: DateRangeOptions = {}
  ): Promise<{ data: Encounter[]; total: number }> {
    const { limit = 100, offset = 0 } = options;

    const cacheKey = `encounter:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
    const cached = queryCache.get<{
      data: Encounter[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const countWhere = combineConditions([
      gte(encounters.encounterDate, startDate),
      lte(encounters.encounterDate, endDate),
    ]);

    const [data, totalResult] = await Promise.all([
      this.db
        .select({ encounter: encounters })
        .from(encounters)
        .where(countWhere)
        .orderBy(desc(encounters.encounterDate))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(encounters)
        .where(countWhere),
    ]);

    const result = {
      data: data.map((row) => row.encounter),
      total: readCount(totalResult),
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["encounters:date"],
    });

    return result;
  }

  async updateTreatmentPlan(
    encounterId: string,
    treatmentPlan: {
      treatments: string[];
      medications: string[];
      investigations: string[];
      patientEducation: string[];
      followUpDate?: string;
      notes?: string;
    }
  ): Promise<Encounter | null> {
    const encounter = await withTransaction(async (tx: Transaction) => {
      const [updated] = (await tx
        .update(encounters)
        .set({
          planJson: sql`${encounters.planJson} || ${JSON.stringify(
            treatmentPlan
          )}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(encounters.id, encounterId))
        .returning()) as Encounter[];

      return updated ?? null;
    });

    if (encounter) {
      this.invalidateAfterWrite([encounter.patientId], encounter.id);
    }

    return encounter;
  }

  async getRecentEncounters(limit = 10): Promise<EncounterWithRelations[]> {
    const cacheKey = `encounter:recent:${limit}`;
    const cached = queryCache.get<EncounterWithRelations[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.db
      .select({
        encounter: encounters,
        patient: patients,
        doctor: doctors,
        provider: staff,
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(doctors, eq(encounters.doctorId, doctors.id))
      .innerJoin(staff, eq(encounters.providerId, staff.id))
      .orderBy(desc(encounters.encounterDate))
      .limit(limit);
    const result = rows.map((row) =>
      Object.assign(row.encounter, {
        patient: row.patient,
        doctor: row.doctor,
        provider: row.provider,
      })
    );

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["encounters:recent"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Count / stats
  // --------------------------------------------------------------------------

  override async count(where?: SQL): Promise<number>;
  override async count(options: CountOptions): Promise<number>;
  override async count(whereOrOptions?: SQL | CountOptions): Promise<number> {
    const options: CountOptions =
      isSql(whereOrOptions) || !whereOrOptions ? {} : whereOrOptions;

    const cacheKey = `encounter:count:${JSON.stringify(options)}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached) return cached;

    const condition = isSql(whereOrOptions)
      ? whereOrOptions
      : combineConditions(buildEncounterConditions(options));

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .where(condition);

    const value = readCount(result);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["encounter:count"],
    });

    return value;
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<EncounterStatus, number>;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const cacheKey = "encounter:stats";
    const cached = queryCache.get<{
      total: number;
      byStatus: Record<EncounterStatus, number>;
      today: number;
      thisWeek: number;
      thisMonth: number;
    }>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [statusRows, timeRow] = await Promise.all([
      this.db
        .select({
          status: encounters.status,
          count: sql<number>`count(*)`,
        })
        .from(encounters)
        .groupBy(encounters.status),
      this.db
        .select({
          total: sql<number>`count(*)`,
          today: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${today})`,
          thisWeek: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${weekAgo})`,
          thisMonth: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${monthAgo})`,
        })
        .from(encounters),
    ]);

    const byStatus: Record<EncounterStatus, number> = {
      Draft: 0,
      Completed: 0,
      Signed: 0,
      Amended: 0,
      Cancelled: 0,
    };
    for (const row of statusRows) {
      const s = row.status;
      if (s in byStatus) byStatus[s] = row.count;
    }

    const bucket = timeRow[0] ?? {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    };
    const result = {
      total: bucket.total,
      byStatus,
      today: bucket.today,
      thisWeek: bucket.thisWeek,
      thisMonth: bucket.thisMonth,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["encounter:stats"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Domain actions
  // --------------------------------------------------------------------------

  async complete(id: string): Promise<Encounter | null> {
    return this.update(id, { status: "Completed" });
  }

  async cancel(id: string, reason?: string): Promise<Encounter | null> {
    const updates: Partial<NewEncounter> = { status: "Cancelled" };
    if (reason) updates.notes = reason;
    return this.update(id, updates);
  }

  async updateChiefComplaint(
    id: string,
    chiefComplaint: string
  ): Promise<Encounter | null> {
    return this.update(id, { chiefComplaint });
  }

  async updateDiagnosisSummary(
    id: string,
    diagnosisSummary: string
  ): Promise<Encounter | null> {
    const [encounter] = await this.db
      .update(encounters)
      .set({
        assessmentJson: sql`${encounters.assessmentJson} || ${JSON.stringify({
          summary: diagnosisSummary,
        })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, id))
      .returning();

    if (encounter)
      this.invalidateAfterWrite([encounter.patientId], encounter.id);
    return encounter ?? null;
  }

  async addTreatmentPlan(
    id: string,
    treatmentPlan: string
  ): Promise<Encounter | null> {
    const [encounter] = await this.db
      .update(encounters)
      .set({
        planJson: sql`${encounters.planJson} || ${JSON.stringify({
          treatmentAndInterventions: treatmentPlan,
        })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, id))
      .returning();

    if (encounter)
      this.invalidateAfterWrite([encounter.patientId], encounter.id);
    return encounter ?? null;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  private invalidateAfterWrite(
    patientIds: string[],
    encounterId?: string
  ): void {
    if (encounterId) {
      queryCache.invalidate(`encounter:${encounterId}`);
    }

    queryCache.invalidateTag("encounters:list");
    queryCache.invalidateTag("encounters:recent");
    queryCache.invalidateTag("encounters:date");
    queryCache.invalidateTag("encounter:stats");
    queryCache.invalidateTag("encounter:count");

    for (const patientId of new Set(patientIds)) {
      queryCache.invalidateTag(`patient:${patientId}:encounters`);
      queryCache.invalidatePrefix(`patient:${patientId}:`);
    }
  }
}

export const encounterRepository = new EncounterRepository(db);
