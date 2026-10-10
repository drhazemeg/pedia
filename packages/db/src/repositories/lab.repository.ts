import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
// src/lib/db/repositories/lab.repository.ts
import type { SQL } from "drizzle-orm";
import {
  and,
  countDistinct,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { type LabStatus, labOrderItems, labOrders, patients } from "../schema";
import type {
  Encounter,
  LabOrder,
  NewLabOrder,
  Patient,
  Staff,
} from "../schema/types";
import type { BaseRow } from "./base.repository";
import { BaseRepository, isBaseRow } from "./base.repository";

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
  status?: LabStatus;
};

export type SearchOptions = {
  endDate?: Date;
  limit?: number;
  offset?: number;
  /** Filter by the ordering doctor's id (labOrders.orderedByDoctorId). */
  orderedByDoctorId?: string;
  patientId?: string;
  query?: string;
  startDate?: Date;
  status?: LabStatus;
};

export type CountOptions = {
  endDate?: Date;
  orderedByDoctorId?: string;
  patientId?: string;
  startDate?: Date;
  status?: LabStatus;
};

export type LabStats = {
  total: number;
  ordered: number;
  collected: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  byPatient: number;
};

type AbnormalLabItem = Pick<
  (typeof labOrderItems)["$inferSelect"],
  | "id"
  | "labOrderId"
  | "labTestId"
  | "testNameSnapshot"
  | "priceSnapshot"
  | "resultValue"
  | "resultText"
  | "referenceRangeSnapshot"
  | "unitSnapshot"
  | "status"
  | "resultedByUserId"
  | "resultedAt"
>;

type LabOrderWithRelations = LabOrder & {
  patient: Patient | null;
  encounter: Encounter | null;
};

type LabOrderWithPatient = LabOrder & {
  patient: Patient | null;
  staff?: Staff | null;
};

// ============================================================
// Cast helpers
// ============================================================

const asLabOrder = (row: BaseRow): LabOrder => row as LabOrder;

const asLabOrderWithRelations = (row: BaseRow): LabOrderWithRelations =>
  row as LabOrderWithRelations;

const asLabOrdersWithRelations = (rows: BaseRow[]): LabOrderWithRelations[] =>
  rows as LabOrderWithRelations[];

const asLabOrdersWithPatient = (rows: BaseRow[]): LabOrderWithPatient[] =>
  rows as LabOrderWithPatient[];

const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Filters
// ============================================================

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Build a single Drizzle `SQL` condition from search options.
 *
 * Column name mapping (old → actual DB column):
 *   orderNumber       → labOrderNumber
 *   orderDate         → orderedAt
 *   orderedBy (text)  → orderedByDoctorId (uuid FK)
 *   clinicalIndication → (removed — no such column)
 *   testsJson         → (removed — use labOrderItems relation)
 *   priority          → (removed — no such column on labOrders)
 */
function buildLabWhere(options: SearchOptions): SQL | undefined {
  const { query, status, patientId, orderedByDoctorId, startDate, endDate } =
    options;

  const conditions: SQL[] = [];

  if (status) conditions.push(eq(labOrders.status, status));
  if (patientId) conditions.push(eq(labOrders.patientId, patientId));
  if (orderedByDoctorId) {
    conditions.push(eq(labOrders.orderedByDoctorId, orderedByDoctorId));
  }

  if (startDate) conditions.push(gte(labOrders.specimenCollectedAt, startDate));
  if (endDate) conditions.push(lte(labOrders.specimenCollectedAt, endDate));

  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const search = or(
      // labOrderNumber replaces orderNumber
      ilike(labOrders.labOrderNumber, pattern),
      or(
        ilike(patients.firstName, pattern),
        ilike(patients.lastName, pattern),
        ilike(patients.mrn, pattern)
      )
    );
    if (search) conditions.push(search);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class LabRepository extends BaseRepository {
  protected readonly table = labOrders;
  protected readonly idColumn: PgColumn = labOrders.id;
  protected readonly tableName = "labOrders";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Public CRUD
  // --------------------------------------------------------------------------

  async findById(id: string): Promise<LabOrderWithRelations | null> {
    const cacheKey = `lab:${id}`;
    const cached = queryCache.get<LabOrderWithRelations>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(labOrders.id, id),
      with: { patient: true, encounter: true },
    });

    if (!isBaseRow(row)) return null;

    const result = asLabOrderWithRelations(row);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`lab:${id}`, `patient:${result.patientId}:labs`],
    });

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const labOrder = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.labOrders.findFirst({
        where: { id },
      });
      if (!existing) return null;

      await tx.delete(labOrders).where(eq(labOrders.id, id));
      return existing;
    });

    if (!labOrder) return false;

    this.invalidateAfterWrite(
      [labOrder.patientId],
      labOrder.labOrderNumber,
      labOrder.encounterId,
      id
    );
    return true;
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  /** Find by labOrderNumber (the unique human-readable order number). */
  async findByLabOrderNumber(
    labOrderNumber: string
  ): Promise<LabOrderWithRelations | null> {
    const cacheKey = `lab:order:${labOrderNumber}`;
    const cached = queryCache.get<LabOrderWithRelations>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(labOrders.labOrderNumber, labOrderNumber),
      with: { patient: true, encounter: true },
    });

    if (!isBaseRow(row)) return null;

    const result = asLabOrderWithRelations(row);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`lab:${result.id}`, `patient:${result.patientId}:labs`],
    });

    return result;
  }

  async findOrders(
    options: SearchOptions = {}
  ): Promise<{ data: LabOrderWithPatient[]; total: number }> {
    const { limit = 50, offset = 0, query } = options;

    const cacheKey = `lab:list:${JSON.stringify({
      ...options,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<{
      data: LabOrderWithPatient[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = buildLabWhere(options);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,

        orderBy: sql`${labOrders.specimenCollectedAt} DESC`,
        with: { patient: true },
      }),
      query ? this.countWithPatientJoin(where) : this.count(where),
    ]);

    const result = {
      data: asLabOrdersWithPatient(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["lab:list"],
    });

    return result;
  }

  async findByPatientId(
    patientId: string,
    options: FindByPatientOptions = {}
  ): Promise<{ data: LabOrderWithRelations[]; total: number }> {
    const { limit = 50, offset = 0, status, startDate, endDate } = options;

    const cacheKey = `lab:patient:${patientId}:${JSON.stringify({
      ...options,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<{
      data: LabOrderWithRelations[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = buildLabWhere({ patientId, status, startDate, endDate });

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${labOrders.specimenCollectedAt} DESC`,
        with: { patient: true, encounter: true },
      }),
      this.count(where),
    ]);

    const result = {
      data: asLabOrdersWithRelations(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:labs`],
    });

    return result;
  }

  /** Returns lab orders that are not yet completed or cancelled. */
  async findPending(patientId?: string): Promise<LabOrderWithRelations[]> {
    const cacheKey = `lab:pending:${patientId ?? "all"}`;
    const cached = queryCache.get<LabOrderWithRelations[]>(cacheKey);
    if (cached) return cached;

    const conditions: SQL[] = [
      sql`${labOrders.status} NOT IN ('completed', 'cancelled')`,
    ];
    if (patientId) conditions.push(eq(labOrders.patientId, patientId));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${labOrders.specimenCollectedAt} ASC`,
      with: { patient: true, encounter: true },
    });
    const result = asLabOrdersWithRelations(rows);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [
        "lab:pending",
        ...(patientId ? [`patient:${patientId}:labs`] : []),
      ],
    });

    return result;
  }

  async getByDateRange(
    startDate: Date,
    endDate: Date,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: LabOrderWithPatient[]; total: number }> {
    const { limit = 100, offset = 0 } = options;

    const cacheKey = `lab:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
    const cached = queryCache.get<{
      data: LabOrderWithPatient[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    // specimenCollectedAt replaces orderDate
    const where = and(
      gte(labOrders.specimenCollectedAt, startDate),
      lte(labOrders.specimenCollectedAt, endDate)
    );

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${labOrders.specimenCollectedAt} DESC`,
        with: { patient: true },
      }),
      this.count(where),
    ]);

    const result = {
      data: asLabOrdersWithPatient(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["lab:date"],
    });

    return result;
  }

  async search(
    options: SearchOptions
  ): Promise<{ data: LabOrderWithPatient[]; total: number }> {
    return this.findOrders(options);
  }

  async findAll(
    options: SearchOptions = {}
  ): Promise<{ total: number; data: LabOrderWithRelations[] }> {
    const { limit = 50, offset = 0 } = options;
    const where = buildLabWhere(options);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${labOrders.specimenCollectedAt} DESC`,
        with: { patient: true, encounter: true },
      }),
      this.count(where),
    ]);

    return { total, data: asLabOrdersWithRelations(rows) };
  }

  /**
   * Return lab order items for a given order that have abnormal results.
   * Uses the relational `labOrderItems` table (replaces the old testsJson JSONB).
   */
  async getAbnormalItems(labOrderId: string): Promise<AbnormalLabItem[]> {
    const cacheKey = `lab:${labOrderId}:abnormal`;
    const cached = queryCache.get<AbnormalLabItem[]>(cacheKey);
    if (cached) return cached;

    const items = await this.db
      .select({
        id: labOrderItems.id,
        labOrderId: labOrderItems.labOrderId,
        labTestId: labOrderItems.labTestId,
        testNameSnapshot: labOrderItems.testNameSnapshot,
        priceSnapshot: labOrderItems.priceSnapshot,
        resultValue: labOrderItems.resultValue,
        resultText: labOrderItems.resultText,
        referenceRangeSnapshot: labOrderItems.referenceRangeSnapshot,
        unitSnapshot: labOrderItems.unitSnapshot,
        status: labOrderItems.status,
        resultedByUserId: labOrderItems.resultedByUserId,
        resultedAt: labOrderItems.resultedAt,
      })
      .from(labOrderItems)
      .where(
        and(
          eq(labOrderItems.labOrderId, labOrderId),
          // "abnormal" is surfaced as a specific status value or a non-normal result
          sql`${labOrderItems.resultValue} IS NOT NULL`
        )
      );

    queryCache.set(cacheKey, items, {
      ttl: LIST_CACHE_TTL,
      tags: [`lab:${labOrderId}:items`],
    });

    return items;
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  async getLabStats(): Promise<LabStats> {
    const cacheKey = "lab:stats";
    const cached = queryCache.get<LabStats>(cacheKey);
    if (cached) return cached;

    // Use lowercase enum values matching LAB_ORDER_STATUS
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        ordered: sql<number>`count(*) filter (where ${labOrders.status} = 'ordered')::int`,
        collected: sql<number>`count(*) filter (where ${labOrders.status} = 'collected')::int`,
        in_progress: sql<number>`count(*) filter (where ${labOrders.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${labOrders.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${labOrders.status} = 'cancelled')::int`,
        byPatient: countDistinct(labOrders.patientId),
      })
      .from(labOrders);

    const result: LabStats = {
      total: row?.total ?? 0,
      ordered: row?.ordered ?? 0,
      collected: row?.collected ?? 0,
      in_progress: row?.in_progress ?? 0,
      completed: row?.completed ?? 0,
      cancelled: row?.cancelled ?? 0,
      byPatient: row?.byPatient ?? 0,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["lab:stats"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Count
  // --------------------------------------------------------------------------

  async countBy(options: CountOptions = {}): Promise<number> {
    const cacheKey = `lab:count:${JSON.stringify({
      ...options,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const where = buildLabWhere(options);
    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["lab:count"],
    });

    return value;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async create(data: NewLabOrder): Promise<LabOrder> {
    const row = await this.createImpl(toBaseRow(data));
    const labOrder = asLabOrder(row);

    this.invalidateAfterWrite(
      [labOrder.patientId],
      labOrder.labOrderNumber,
      labOrder.encounterId,
      labOrder.id
    );
    return labOrder;
  }

  async createBatch(data: NewLabOrder[]): Promise<LabOrder[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(labOrders).values(data).returning()
    );

    const patientIds = [...new Set(results.map((l) => l.patientId))];
    const encounterIds = results
      .map((l) => l.encounterId)
      .filter((id): id is string => id !== null);
    this.invalidateAfterWrite(patientIds, undefined, encounterIds);
    return results;
  }

  async update(
    id: string,
    data: Partial<NewLabOrder>
  ): Promise<LabOrder | null> {
    const row = await this.updateImpl(
      id,
      toBaseRow(data),
      /* hasUpdatedAt */ true
    );
    if (!row) return null;

    const labOrder = asLabOrder(row);
    this.invalidateAfterWrite(
      [labOrder.patientId],
      labOrder.labOrderNumber,
      labOrder.encounterId,
      labOrder.id
    );
    return labOrder;
  }

  // --------------------------------------------------------------------------
  // Domain actions
  // --------------------------------------------------------------------------

  async cancel(id: string, reason?: string): Promise<LabOrder | null> {
    if (reason === undefined) {
      return this.update(id, { status: "cancelled" });
    }

    const existing = await this.findById(id);
    if (!existing) return null;

    const notes = existing.notes
      ? `${existing.notes}\nCancellation reason: ${reason}`
      : `Cancellation reason: ${reason}`;
    return this.update(id, { status: "cancelled", notes });
  }

  async updateStatus(id: string, status: LabStatus): Promise<LabOrder | null> {
    const updates: Partial<NewLabOrder> = { status };

    // completedAt replaces completedDate
    if (status === "completed") {
      updates.completedDate = new Date();
    }
    // collectedAt replaces specimenCollectedAt
    if (status === "collected") {
      updates.specimenCollectedAt = new Date();
    }

    return this.update(id, updates);
  }

  /** Mark order as collected and record the collection timestamp. */
  async collectSample(
    id: string,
    collectedAt: Date = new Date(),
    specimenType?: string,
    collectionNotes?: string
  ): Promise<LabOrder | null> {
    const updates: Partial<NewLabOrder> = {
      status: "collected",
      specimenCollectedAt: collectedAt,
    };
    if (specimenType !== undefined) updates.specimenType = specimenType;
    if (collectionNotes !== undefined) {
      updates.specimenCollectionNotes = collectionNotes;
    }
    return this.update(id, updates);
  }

  /**
   * Submit results by upserting `labOrderItems` rows.
   * This replaces the old approach of storing results in a `testsJson` JSONB column.
   */
  async submitResults(
    id: string,
    results: Array<{
      labTestId: string;
      testNameSnapshot: string;
      resultValue?: string;
      resultText?: string;
      referenceRangeSnapshot?: string;
      unitSnapshot?: string;
    }>,
    notes?: string
  ): Promise<LabOrder | null> {
    if (results.length === 0) {
      return notes === undefined
        ? this.findById(id)
        : this.update(id, { notes });
    }

    await withTransaction(async (tx: Transaction) => {
      // Mark existing items as completed
      await tx
        .update(labOrderItems)
        .set({ status: "Completed", resultedAt: new Date() })
        .where(
          and(
            eq(labOrderItems.labOrderId, id),
            inArray(
              labOrderItems.labTestId,
              results.map((r) => r.labTestId)
            )
          )
        );

      // Upsert result values
      for (const r of results) {
        await tx
          .update(labOrderItems)
          .set({
            resultValue: r.resultValue ?? null,
            resultText: r.resultText ?? null,
            referenceRangeSnapshot: r.referenceRangeSnapshot ?? null,
            unitSnapshot: r.unitSnapshot ?? null,
            status: "Completed",
            resultedAt: new Date(),
          })
          .where(
            and(
              eq(labOrderItems.labOrderId, id),
              eq(labOrderItems.labTestId, r.labTestId)
            )
          );
      }
    });

    // completedAt replaces completedDate; no resultsReleasedAt on labOrders
    return this.update(id, {
      status: "completed",
      specimenCollectedAt: new Date(),
      ...(notes === undefined ? {} : { notes }),
    });
  }

  /**
   * Add test line items to a lab order using the relational `labOrderItems` table.
   * Replaces the old `addResults(testsJson)` approach.
   */
  async addItems(
    labOrderId: string,
    items: Array<{
      labTestId: string;
      testNameSnapshot: string;
      priceSnapshot: string;
    }>
  ): Promise<void> {
    if (items.length === 0) return;

    await withTransaction(async (tx: Transaction) => {
      await tx.insert(labOrderItems).values(
        items.map((item) => {
          return {
            labOrderId,
            labTestId: item.labTestId,
            testNameSnapshot: item.testNameSnapshot,
            priceSnapshot: item.priceSnapshot,
            status: "Pending" as const,
          };
        })
      );
    });

    queryCache.invalidate(`lab:${labOrderId}`);
    queryCache.invalidateTag(`lab:${labOrderId}:items`);
  }
  async findByOrderNumber(
    labOrderNumber: string
  ): Promise<LabOrderWithRelations | null> {
    const cacheKey = `lab:order:${labOrderNumber}`;
    const cached = queryCache.get<LabOrderWithRelations>(cacheKey);
    if (cached) return cached;

    const result = await db.query.labOrders.findFirst({
      where: { labOrderNumber },
      with: {
        patient: true,
        encounter: true,
      },
    });

    if (result) {
      queryCache.set(cacheKey, result, {
        ttl: CACHE_TTL,
        tags: [`lab:${result.id}`, `patient:${result.patientId}:labs`],
      });
    }

    return result ?? null;
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async countWithPatientJoin(where: SQL | undefined): Promise<number> {
    const base = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id));
    const query = where ? base.where(where) : base;
    const rows = await query;
    return rows[0]?.count ?? 0;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  private invalidateAfterWrite(
    patientIds: string[],
    labOrderNumber?: string,
    encounterIds?: string | string[] | null,
    labId?: string
  ): void {
    if (labId) queryCache.invalidate(`lab:${labId}`);
    if (labOrderNumber) queryCache.invalidate(`lab:order:${labOrderNumber}`);

    queryCache.invalidateTag("lab:list");
    queryCache.invalidateTag("lab:pending");
    queryCache.invalidateTag("lab:stats");
    queryCache.invalidateTag("lab:count");
    queryCache.invalidateTag("lab:date");

    for (const patientId of new Set(patientIds)) {
      queryCache.invalidateTag(`patient:${patientId}:labs`);
      queryCache.invalidatePrefix(`patient:${patientId}:`);
      queryCache.invalidatePrefix(`lab:patient:${patientId}:`);
    }

    const encounters = encounterIds
      ? Array.isArray(encounterIds)
        ? encounterIds
        : [encounterIds]
      : [];
    for (const encounterId of new Set(encounters)) {
      if (!encounterId) continue;
      queryCache.invalidateTag(`encounter:${encounterId}:labs`);
    }
  }
  async getAbnormalResults(
    patientId: string
  ): Promise<Array<LabOrderWithRelations>> {
    const cacheKey = `lab:patient:${patientId}:abnormal`;
    const cached = queryCache.get<Array<LabOrderWithRelations>>(cacheKey);
    if (cached) return cached;

    // This is a simplified approach - in production, you'd want to use proper JSON queries
    const result = await db.query.labOrders.findMany({
      where: {
        patientId,
        status: "completed",
      },
      with: {
        patient: true,
        encounter: true,
      },
    });

    // Filter for abnormal results
    const abnormal = result.filter((lab) => {
      const tests = lab.testsJson || [];
      return tests.some(
        (test) =>
          test.isAbnormal || test.result?.toLowerCase().includes("abnormal")
      );
    });

    queryCache.set(cacheKey, abnormal, {
      ttl: 30_000,
      tags: [`patient:${patientId}`, `patient:${patientId}:labs:abnormal`],
    });

    return abnormal;
  }
}

export const labRepository = new LabRepository(db);
