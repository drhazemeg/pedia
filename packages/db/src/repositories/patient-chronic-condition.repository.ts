// packages/db/src/repositories/patient-chronic-condition.repository.ts

import { queryCache } from "@pedia/db/cache";
import type { DB, DBOrTx, Transaction } from "@pedia/db/index";
import { db } from "@pedia/db/index";
import type { ConditionStatus } from "@pedia/db/schema";
import { patientChronicConditions } from "@pedia/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type { ChronicCondition, NewChronicCondition } from "../schema/types";
import { CrudRepository } from "./base.repository";

// ============================================================
// Constants
// ============================================================

const CACHE_TTL_MS = 60_000;
const LIST_CACHE_TTL_MS = 30_000;

// ============================================================
// Types
// ============================================================

export type FindChronicConditionsOptions = {
  status?: ConditionStatus;
  limit?: number;
  offset?: number;
};

export type ChronicConditionCountOptions = {
  patientId?: string;
  status?: ConditionStatus;
};

export type ChronicConditionStats = {
  total: number;
  active: number;
  controlled: number;
  resolved: number;
  inRemission: number;
  byPatient: number;
};

// ============================================================
// Repository
// ============================================================

export class PatientChronicConditionRepository extends CrudRepository<ChronicCondition> {
  protected readonly table = patientChronicConditions;
  protected readonly idColumn: PgColumn = patientChronicConditions.id;
  protected readonly tableName = "patient_chronic_conditions";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  /**
   * All chronic conditions for a patient, optionally filtered by status.
   *
   * Uses the *base* `findManyImpl` (SQL builder) rather than the relational
   * builder because the caller usually only needs the flat rows — pulling the
   * full `patients` relation here would be wasteful. If you need the patient
   * payload, use `patientRepository.findByIdInClinic`, which eager-loads
   * `chronicConditions` via the relational builder.
   */
  async findByPatient(
    patientId: string,
    options: FindChronicConditionsOptions = {}
  ): Promise<ChronicCondition[]> {
    const { status } = options;

    const cacheKey = `condition:patient:${patientId}:${status ?? "all"}`;
    const cached = queryCache.get<ChronicCondition[]>(cacheKey);
    if (cached) return cached;

    const conditions = [eq(patientChronicConditions.patientId, patientId)];
    if (status) {
      conditions.push(eq(patientChronicConditions.status, status));
    }

    const where = and(...conditions);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${patientChronicConditions.diagnosedDate} DESC, ${patientChronicConditions.condition} ASC`,
    });

    const result = rows as ChronicCondition[];

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:conditions`],
    });

    return result;
  }

  /**
   * Returns the count of chronic conditions for a patient, with an optional
   * status filter. Thin wrapper around the base `count(where)` so it shares
   * the same cache tag taxonomy as the rest of the app.
   */
  async countBy(options: ChronicConditionCountOptions = {}): Promise<number> {
    const cacheKey = `condition:count:${JSON.stringify(options)}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const conditions = [];
    if (options.patientId) {
      conditions.push(
        eq(patientChronicConditions.patientId, options.patientId)
      );
    }
    if (options.status) {
      conditions.push(eq(patientChronicConditions.status, options.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL_MS,
      tags: ["condition:count"],
    });

    return value;
  }

  /**
   * Aggregate stats across the whole `patient_chronic_conditions` table.
   *
   * Single round-trip using `COUNT(*) FILTER (...)` per status, matching the
   * pattern used by `prescriptionRepository.getPrescriptionStats` and
   * `labRepository.getLabStats`.
   */
  async getStats(): Promise<ChronicConditionStats> {
    const cacheKey = "condition:stats";
    const cached = queryCache.get<ChronicConditionStats>(cacheKey);
    if (cached) return cached;

    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${patientChronicConditions.status} = 'active')::int`,
        controlled: sql<number>`count(*) filter (where ${patientChronicConditions.status} = 'controlled')::int`,
        resolved: sql<number>`count(*) filter (where ${patientChronicConditions.status} = 'resolved')::int`,
        inRemission: sql<number>`count(*) filter (where ${patientChronicConditions.status} = 'in_remission')::int`,
        byPatient: sql<number>`count(distinct ${patientChronicConditions.patientId})::int`,
      })
      .from(patientChronicConditions);

    const result: ChronicConditionStats = {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      controlled: row?.controlled ?? 0,
      resolved: row?.resolved ?? 0,
      inRemission: row?.inRemission ?? 0,
      byPatient: row?.byPatient ?? 0,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: ["condition:stats"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async createForPatient(
    patientId: string,
    data: Omit<NewChronicCondition, "patientId">
  ): Promise<ChronicCondition> {
    const [created] = await this.db
      .insert(patientChronicConditions)
      .values({ ...data, patientId })
      .returning();

    if (!created) throw new Error("Failed to create chronic condition");

    this.invalidateConditionCaches(patientId, created.id);
    return created;
  }

  async updateForPatient(
    id: string,
    patientId: string,
    data: Partial<NewChronicCondition>
  ): Promise<ChronicCondition | null> {
    const [updated] = await this.db
      .update(patientChronicConditions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(patientChronicConditions.id, id),
          eq(patientChronicConditions.patientId, patientId)
        )
      )
      .returning();

    if (!updated) return null;

    this.invalidateConditionCaches(patientId, id);
    return updated;
  }

  async deleteForPatient(id: string, patientId: string): Promise<boolean> {
    const result = await this.db
      .delete(patientChronicConditions)
      .where(
        and(
          eq(patientChronicConditions.id, id),
          eq(patientChronicConditions.patientId, patientId)
        )
      )
      .returning();

    if (result.length === 0) return false;

    this.invalidateConditionCaches(patientId, id);
    return true;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  /**
   * Centralised invalidation. Keeps tag + prefix + per-record evictions in
   * one place so a new write path cannot forget one.
   */
  private invalidateConditionCaches(
    patientId: string,
    conditionId?: string
  ): void {
    if (conditionId) {
      queryCache.invalidate(`condition:${conditionId}`);
    }
    queryCache.invalidatePrefix(`condition:patient:${patientId}`);
    queryCache.invalidateTag("condition:count");
    queryCache.invalidateTag("condition:stats");
    queryCache.invalidateTag(`patient:${patientId}:conditions`);
    // The patient hydrator (`patientRepository.findByIdInClinic`) caches
    // a `patient:${id}:full` entry that embeds chronicConditions.
    queryCache.invalidate(`patient:${patientId}:full`);
  }
}

export const patientChronicConditionRepository =
  new PatientChronicConditionRepository(db);
