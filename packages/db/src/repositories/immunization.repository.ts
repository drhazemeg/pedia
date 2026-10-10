import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import type { ImmunizationStatus } from "@pedia/db/schema";
import { immunizations } from "@pedia/db/schema";
// src/db/repositories/immunization.repository.ts
import type { SQL } from "drizzle-orm";
import { and, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type {
  Guardian,
  Immunization,
  NewImmunization,
  Patient,
} from "../schema/types";
import type { BaseRow } from "./base.repository";
import { BaseRepository } from "./base.repository";

// ============================================================
// Types
// ============================================================

type ImmunizationWithGuardians = Immunization & {
  patient: Patient & { guardians: Guardian[] };
};
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
export type ImmunizationListOptions = {
  query?: string;
  status?: ImmunizationStatus;
  dateRange?: "Due Soon" | "Overdue" | "Completed";
  limit?: number;
  offset?: number;
};

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

export type FindByPatientOptions = {
  status?: ImmunizationStatus;
};

export type CountOptions = {
  patientId?: string;
  status?: ImmunizationStatus;
};

export type VaccineCompliance = {
  total: number;
  administered: number;
  rate: number;
};

// ============================================================
// Cast helpers
// ============================================================
//
// These are the *only* places this repository asserts a concrete shape on
// top of a `BaseRow`. Each is a one-line wrapper around a documented cast:
//
//   - The base's `*Impl` methods return `BaseRow` (`Record<string, unknown>`)
//     because the base is table-agnostic.
//   - Here we know the table, so we narrow to the concrete row type.
//   - The cast is a *widening-to-narrowing* cast (`Record<string, unknown>`
//     → `Immunization`), which is a trust assertion, not an `any`-based
//     escape. It is correct because `Immunization` was derived from the same
//     `immunizations` table the base queried.
//
// Keeping every cast inside these helpers means:
//   1. The linter's `no-unsafe-type-assertion` fires once per helper, not
//      once per call site.
//   2. If the schema ever changes, there is exactly one place to update.

const asImmunization = (row: BaseRow): Immunization => row as Immunization;

const asImmunizations = (rows: BaseRow[]): Immunization[] =>
  rows as Immunization[];

const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Type guards
// ============================================================

/**
 * True iff `row` is an immunization row with a populated `patient` relation.
 */
function hasPatientRelation(row: BaseRow): row is BaseRow & {
  patient: Patient & { guardians: Guardian[] };
} {
  const patient = row.patient;
  return typeof patient === "object" && patient !== null;
}

// ============================================================
// Repository
// ============================================================

export class ImmunizationRepository extends BaseRepository {
  protected readonly table = immunizations;
  protected readonly idColumn: PgColumn = immunizations.id;
  protected readonly tableName = "immunizations";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Public CRUD — wrap the base *Impl methods with concrete types
  // --------------------------------------------------------------------------

  async findById(id: string): Promise<Immunization | null> {
    const row = await this.findByIdImpl(id);
    return row ? asImmunization(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteImpl(id);
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  async findByPatientId(
    patientId: string,
    options: FindByPatientOptions = {}
  ): Promise<Immunization[]> {
    const { status } = options;

    const cacheKey = `immunization:patient:${patientId}:${status ?? "all"}`;
    const cached = queryCache.get<Immunization[]>(cacheKey);
    if (cached) return cached;

    const conditions: SQL[] = [eq(immunizations.patientId, patientId)];
    if (status) conditions.push(eq(immunizations.status, status));
    const where =
      conditions.length === 1
        ? conditions[0]
        : sql.join(conditions, sql` AND `);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${immunizations.recommendedAgeMonths} ASC`,
    });
    const typed = asImmunizations(rows);

    queryCache.set(cacheKey, typed, {
      ttl: LIST_CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:immunizations`],
    });

    return typed;
  }

  async getOverdueImmunizations(patientId: string): Promise<Immunization[]> {
    const cacheKey = `immunization:patient:${patientId}:overdue`;
    const cached = queryCache.get<Immunization[]>(cacheKey);
    if (cached) return cached;

    const where = and(
      eq(immunizations.patientId, patientId),
      eq(immunizations.status, "overdue")
    );
    const rows = await this.findManyImpl(where, {
      orderBy: sql`${immunizations.dueDate} ASC`,
    });
    const typed = asImmunizations(rows);

    queryCache.set(cacheKey, typed, {
      ttl: LIST_CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:immunizations`],
    });

    return typed;
  }

  async getUpcomingImmunizations(
    patientId: string,
    daysAhead = 30
  ): Promise<Immunization[]> {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const cacheKey = `immunization:patient:${patientId}:upcoming:${daysAhead}:${todayIso}`;
    const cached = queryCache.get<Immunization[]>(cacheKey);
    if (cached) return cached;

    const future = new Date(today);
    future.setDate(future.getDate() + daysAhead);
    const futureIso = future.toISOString().slice(0, 10);

    const where = and(
      eq(immunizations.patientId, patientId),
      eq(immunizations.status, "due"),
      gte(immunizations.dueDate, todayIso),
      lte(immunizations.dueDate, futureIso)
    );
    const rows = await this.findManyImpl(where, {
      orderBy: sql`${immunizations.dueDate} ASC`,
    });
    const typed = asImmunizations(rows);

    queryCache.set(cacheKey, typed, {
      ttl: CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:immunizations`],
    });

    return typed;
  }
  /**
   * All overdue immunizations across every patient, with the primary
   * guardian eager-loaded for the outreach dashboard.
   *
   * Uses the relational builder so `with.patient.guardians` is honoured.
   * Rows whose patient relation failed to populate are **dropped** — the
   * previous `as ImmunizationWithGuardians[]` cast silently lied and
   * caused the ShallowErrorPlugin crash on the client.
   */
  async getAllOverdueImmunizations(): Promise<ImmunizationWithGuardians[]> {
    const cacheKey = "immunization:all:overdue";
    const cached = queryCache.get<ImmunizationWithGuardians[]>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const rows: unknown = await query.findMany({
      where: sql`${immunizations.status} = ${"Overdue"}`,
      orderBy: { dueDate: "asc" },
      with: {
        patient: {
          with: {
            guardians: { where: { isPrimary: true } },
          },
        },
      },
    });

    if (!Array.isArray(rows)) {
      throw new TypeError(
        "getAllOverdueImmunizations: query returned non-array"
      );
    }

    // Filter rows whose patient relation didn't populate. The guard narrows
    // `BaseRow` to `BaseRow & { patient: ... }` without a cast.
    const withPatient = rows.filter(hasPatientRelation);

    // Final narrowing: the guard above only proves `patient` is present, not
    // that the whole row matches `ImmunizationWithGuardians`. This is a
    // trust-boundary assertion — the underlying table is `immunizations` and
    // the `with` payload is `patient` + `guardians`.

    const typed = withPatient as ImmunizationWithGuardians[];

    queryCache.set(cacheKey, typed, {
      ttl: CACHE_TTL,
      tags: ["immunization:overdue"],
    });

    return typed;
  }

  async getVaccineComplianceRate(
    patientId: string
  ): Promise<VaccineCompliance> {
    const cacheKey = `immunization:patient:${patientId}:compliance`;
    const cached = queryCache.get<VaccineCompliance>(cacheKey);
    if (cached) return cached;

    const where = eq(immunizations.patientId, patientId);
    const rows = asImmunizations(await this.findManyImpl(where));

    const total = rows.length;
    const administered = rows.filter((i) => i.status === "administered").length;

    const result: VaccineCompliance = {
      total,
      administered,
      rate: total > 0 ? Math.round((administered / total) * 100) : 100,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:immunizations`],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Count
  // --------------------------------------------------------------------------

  async countBy(options: CountOptions = {}): Promise<number> {
    const cacheKey = `immunization:count:${JSON.stringify(options)}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const conditions: SQL[] = [];
    if (options.patientId) {
      conditions.push(eq(immunizations.patientId, options.patientId));
    }
    if (options.status) {
      conditions.push(eq(immunizations.status, options.status));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : sql.join(conditions, sql` AND `);

    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["immunization:count"],
    });

    return value;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async create(data: NewImmunization): Promise<Immunization> {
    const row = await this.createImpl(toBaseRow(data));
    const immunization = asImmunization(row);

    this.invalidateAfterWrite([immunization.patientId], immunization.id);
    return immunization;
  }

  async createBatch(data: NewImmunization[]): Promise<Immunization[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(immunizations).values(data).returning()
    );

    const patientIds = [...new Set(results.map((i) => i.patientId))];
    this.invalidateAfterWrite(patientIds);
    return results;
  }

  async update(
    id: string,
    data: Partial<NewImmunization>
  ): Promise<Immunization | null> {
    const row = await this.updateImpl(
      id,
      toBaseRow(data),
      /* hasUpdatedAt */ true
    );
    if (!row) return null;

    const immunization = asImmunization(row);
    this.invalidateAfterWrite([immunization.patientId], immunization.id);
    return immunization;
  }

  // --------------------------------------------------------------------------
  // Domain actions
  // --------------------------------------------------------------------------

  async defer(
    id: string,
    reason: string,
    deferredUntil: Date,
    deferredById: string
  ): Promise<Immunization | null> {
    return this.update(id, {
      status: "deferred",
      notes: `Deferred: ${reason}. Deferred until: ${deferredUntil.toISOString()}. Deferred by: ${deferredById}`,
    });
  }

  async refuse(
    id: string,
    reason: string,
    refusedById: string,
    parentConsent = false
  ): Promise<Immunization | null> {
    return this.update(id, {
      status: "refused",
      notes: `Refused: ${reason}. Refused by: ${refusedById}. Parent consent: ${parentConsent}`,
      parentConsent,
    });
  }

  async recordAdverseReaction(
    id: string,
    reaction: string,
    severity: string,
    reportedById: string
  ): Promise<Immunization | null> {
    return this.update(id, {
      adverseReactions: `${severity}: ${reaction}. Reported by: ${reportedById}`,
    });
  }

  async administer(
    id: string,
    administeredDate: string,
    administeredById: string,
    batchNumber?: string,
    site?: string,
    route?: string
  ): Promise<Immunization | null> {
    return this.update(id, {
      status: "administered",
      administeredDate,
      administeredById,
      batchNumber,
      administrationSite: site,
      administrationRoute: route,
    });
  }
  async listAll(
    options: ImmunizationListOptions = {}
  ): Promise<{ data: Immunization[]; total: number }> {
    const { query, status, dateRange, limit = 50, offset = 0 } = options;

    const cacheKey = `immunization:list:${JSON.stringify(options)}`;
    const cached = queryCache.get<{
      data: Immunization[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(immunizations.status, status));

    // `dateRange` maps to a status filter — see note below.
    if (dateRange === "Overdue") {
      conditions.push(eq(immunizations.status, "overdue"));
    }
    if (dateRange === "Due Soon") {
      conditions.push(eq(immunizations.status, "due"));
    }
    if (dateRange === "Completed") {
      conditions.push(eq(immunizations.status, "administered"));
    }

    if (query) {
      const pattern = `%${escapeLikePattern(query)}%`;
      const search = or(
        ilike(immunizations.vaccineName, pattern),
        ilike(immunizations.vaccineCode, pattern),
        ilike(immunizations.targetDisease, pattern)
      );
      if (search) conditions.push(search);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(immunizations)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(immunizations.recommendedAgeMonths),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(immunizations)
        .where(where),
    ]);

    const result = { data, total: totalResult[0]?.count ?? 0 };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["immunization:list"],
    });

    return result;
  }

  // async countBy(options: { patientId?: string; status?: ImmunizationStatus } = {}): Promise<number> {
  //   const cacheKey = `immunization:count:${JSON.stringify(options)}`;
  //   const cached = queryCache.get<number>(cacheKey);
  //   if (cached !== null) return cached;

  //   const conditions: SQL[] = [];
  //   if (options.patientId) conditions.push(eq(immunizations.patientId, options.patientId));
  //   if (options.status) conditions.push(eq(immunizations.status, options.status));

  //   const result = await this.db
  //     .select({ count: sql<number>`count(*)::int` })
  //     .from(immunizations)
  //     .where(conditions.length > 0 ? and(...conditions) : undefined);

  //   const count = result[0]?.count ?? 0;
  //   queryCache.set(cacheKey, count, { ttl: CACHE_TTL, tags: ["immunization:count"] });
  //   return count;
  // }
  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  private invalidateAfterWrite(
    patientIds: string[],
    immunizationId?: string
  ): void {
    if (immunizationId) {
      queryCache.invalidate(`immunization:${immunizationId}`);
    }

    queryCache.invalidateTag("immunization:overdue");
    queryCache.invalidateTag("immunization:count");

    for (const patientId of new Set(patientIds)) {
      queryCache.invalidateTag(`patient:${patientId}:immunizations`);
      queryCache.invalidatePrefix(`immunization:patient:${patientId}:`);
      queryCache.invalidatePrefix(`patient:${patientId}:`);
    }
  }
}

export const immunizationRepository = new ImmunizationRepository(db);
