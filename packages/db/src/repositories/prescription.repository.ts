import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { escapeRegExp, queryCache } from "@pedia/db/cache";
import {
  and,
  countDistinct,
  eq,
  gte,
  ilike,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  type PrescriptionItem,
  type PrescriptionStatus,
  patients,
  prescriptionItems,
  prescriptions,
} from "../schema";
import type {
  Encounter,
  NewPrescription,
  Patient,
  Prescription,
  Staff,
} from "../schema/types";
import type { BaseRow } from "./base.repository";
import { BaseRepository } from "./base.repository";

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
  status?: PrescriptionStatus;
};

export type SearchOptions = {
  endDate?: Date;
  limit?: number;
  offset?: number;
  patientId?: string;
  prescriberId?: string;
  query?: string;
  startDate?: Date;
  status?: PrescriptionStatus;
};

export type CountOptions = {
  endDate?: Date;
  patientId?: string;
  prescriberId?: string;
  startDate?: Date;
  status?: PrescriptionStatus;
};

export type PrescriptionStats = {
  total: number;
  /** active — currently prescribed */
  active: number;
  /** filled — dispensed by pharmacy */
  filled: number;
  discontinued: number;
  expired: number;
  cancelled: number;
  byPatient: number;
};

type PrescriptionWithRelations = Prescription & {
  patient: Patient;
  prescriber: Staff;
  encounter: Encounter | null;
  items?: PrescriptionItem[];
};

type PrescriptionWithPatient = Prescription & {
  patient: Patient;
};

// ============================================================
// Cast helpers
// ============================================================

const asPrescription = (row: BaseRow): Prescription => row as Prescription;

const asPrescriptionWithRelations = (row: BaseRow): PrescriptionWithRelations =>
  row as PrescriptionWithRelations;

const asPrescriptionsWithRelations = (
  rows: BaseRow[]
): PrescriptionWithRelations[] => rows as PrescriptionWithRelations[];

const asPrescriptionsWithPatient = (
  rows: BaseRow[]
): PrescriptionWithPatient[] => rows as PrescriptionWithPatient[];

const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Guards
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
 *   rxNumber      → prescriptionNumber
 *   prescribedDate → prescribedAt
 *   prescriptionItems (JSONB) → (use prescriptionItems relational table)
 *
 * Status values must match PRESCRIPTION_STATUS enum (lowercase):
 *   "active" | "filled" | "discontinued" | "expired" | "cancelled"
 */
function buildPrescriptionWhere(
  options: SearchOptions,
  scope?: { clinicId: string }
): SQL | undefined {
  const conditions: SQL[] = [];
  const { query, status, patientId, prescriberId, startDate, endDate } =
    options;

  if (status) conditions.push(eq(prescriptions.status, status));
  if (patientId) conditions.push(eq(prescriptions.patientId, patientId));
  if (prescriberId) {
    conditions.push(eq(prescriptions.prescriberId, prescriberId));
  }

  // prescribedAt replaces prescribedDate
  if (startDate) conditions.push(gte(prescriptions.createdAt, startDate));
  if (endDate) conditions.push(lte(prescriptions.createdAt, endDate));

  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const search = or(
      // prescriptionNumber replaces rxNumber
      ilike(prescriptions.rxNumber, pattern),
      ilike(prescriptions.diagnosis, pattern),
      ilike(prescriptions.prescriberName, pattern),
      or(
        ilike(patients.firstName, pattern),
        ilike(patients.lastName, pattern),
        ilike(patients.mrn, pattern)
      )
    );
    if (search) conditions.push(search);
  }

  if (scope) {
    conditions.push(
      sql`${prescriptions.patientId} IN (SELECT id FROM ${patients} WHERE clinic_id = ${scope.clinicId})`
    );
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class PrescriptionRepository extends BaseRepository {
  protected readonly table = prescriptions;
  protected readonly idColumn: PgColumn = prescriptions.id;
  protected readonly tableName = "prescriptions";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Public CRUD
  // --------------------------------------------------------------------------

  async findById(
    id: string,
    scope?: { clinicId: string }
  ): Promise<PrescriptionWithRelations | null> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `prescription:${scopeKey}:${id}`;
    const cached = queryCache.get<PrescriptionWithRelations>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(prescriptions.id, id),
      with: {
        patient: true,
        prescriber: true,
        encounter: true,
        items: true,
      },
    });

    if (!isRecord(row)) return null;

    if (scope) {
      const patient = row.patient;
      if (!isRecord(patient) || patient.clinicId !== scope.clinicId) {
        return null;
      }
    }

    const result = asPrescriptionWithRelations(row);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`prescription:${id}`, `patient:${result.patientId}:prescriptions`],
    });

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const prescription = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.prescriptions.findFirst({
        where: { id },
      });
      if (!existing) return null;

      await tx.delete(prescriptions).where(eq(prescriptions.id, id));
      return existing;
    });

    if (!prescription) return false;

    this.invalidateAfterWrite(
      [prescription.patientId],
      prescription.id,
      prescription.rxNumber,
      prescription.encounterId
    );
    return true;
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  /** Find by the human-readable prescription number (replaces findByRxNumber). */
  async findByPrescriptionNumber(
    prescriptionNumber: string
  ): Promise<PrescriptionWithRelations | null> {
    const cacheKey = `prescription:num:${prescriptionNumber}`;
    const cached = queryCache.get<PrescriptionWithRelations>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(prescriptions.rxNumber, prescriptionNumber),
      with: {
        patient: true,
        prescriber: true,
        encounter: true,
        items: true,
      },
    });

    if (!isRecord(row)) return null;

    const result = asPrescriptionWithRelations(row);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [
        `prescription:${result.id}`,
        `patient:${result.patientId}:prescriptions`,
      ],
    });

    return result;
  }

  async findAll(
    options: SearchOptions,
    scope?: { clinicId: string }
  ): Promise<{ data: PrescriptionWithPatient[]; total: number }> {
    const { limit = 50, offset = 0, query } = options;

    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `prescription:list:${scopeKey}:${JSON.stringify({
      ...options,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<{
      data: PrescriptionWithPatient[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = buildPrescriptionWhere(options, scope);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${prescriptions.createdAt} DESC`,
        with: { patient: true },
      }),
      query ? this.countWithPatientJoin(where) : this.count(where),
    ]);

    const result = {
      data: asPrescriptionsWithPatient(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["prescriptions:list"],
    });

    return result;
  }

  async findByPatientId(
    patientId: string,
    options: FindByPatientOptions = {}
  ): Promise<{ data: PrescriptionWithRelations[]; total: number }> {
    const { limit = 50, offset = 0, status, startDate, endDate } = options;

    const cacheKey = `prescription:patient:${patientId}:${JSON.stringify({
      ...options,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<{
      data: PrescriptionWithRelations[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = buildPrescriptionWhere({
      patientId,
      status,
      startDate,
      endDate,
    });

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${prescriptions.createdAt} DESC`,
        with: {
          patient: true,
          prescriber: true,
          encounter: true,
          items: true,
        },
      }),
      this.count(where),
    ]);

    const result = {
      data: asPrescriptionsWithRelations(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [`patient:${patientId}`, `patient:${patientId}:prescriptions`],
    });

    return result;
  }

  async findActiveByPatientId(
    patientId: string
  ): Promise<PrescriptionWithRelations[]> {
    const cacheKey = `prescription:patient:${patientId}:active`;
    const cached = queryCache.get<PrescriptionWithRelations[]>(cacheKey);
    if (cached) return cached;

    // "active" is the correct enum value (not "Active")
    const where = and(
      eq(prescriptions.patientId, patientId),
      eq(prescriptions.status, "active")
    );
    const rows = await this.findManyImpl(where, {
      orderBy: sql`${prescriptions.createdAt} DESC`,
      with: {
        patient: true,
        prescriber: true,
        encounter: true,
        items: true,
      },
    });
    const result = asPrescriptionsWithRelations(rows);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [
        `patient:${patientId}`,
        `patient:${patientId}:prescriptions:active`,
      ],
    });

    return result;
  }

  async getByDateRange(
    startDate: Date,
    endDate: Date,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: PrescriptionWithPatient[]; total: number }> {
    const { limit = 100, offset = 0 } = options;

    const cacheKey = `prescription:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
    const cached = queryCache.get<{
      data: PrescriptionWithPatient[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    // prescribedAt replaces prescribedDate
    const where = and(
      gte(prescriptions.createdAt, startDate),
      lte(prescriptions.createdAt, endDate)
    );

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${prescriptions.createdAt} DESC`,
        with: { patient: true },
      }),
      this.count(where),
    ]);

    const result = {
      data: asPrescriptionsWithPatient(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["prescriptions:date"],
    });

    return result;
  }

  async search(
    options: SearchOptions,
    scope?: { clinicId: string }
  ): Promise<{ data: PrescriptionWithPatient[]; total: number }> {
    return this.findAll(options, scope);
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  async getPrescriptionStats(): Promise<PrescriptionStats> {
    const cacheKey = "prescription:stats";
    const cached = queryCache.get<PrescriptionStats>(cacheKey);
    if (cached) return cached;

    // All status values are lowercase per PRESCRIPTION_STATUS enum:
    // "active" | "filled" | "discontinued" | "expired" | "cancelled"
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${prescriptions.status} = 'active')::int`,
        filled: sql<number>`count(*) filter (where ${prescriptions.status} = 'filled')::int`,
        discontinued: sql<number>`count(*) filter (where ${prescriptions.status} = 'discontinued')::int`,
        expired: sql<number>`count(*) filter (where ${prescriptions.status} = 'expired')::int`,
        cancelled: sql<number>`count(*) filter (where ${prescriptions.status} = 'cancelled')::int`,
        byPatient: countDistinct(prescriptions.patientId),
      })
      .from(prescriptions);

    const result: PrescriptionStats = {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      filled: row?.filled ?? 0,
      discontinued: row?.discontinued ?? 0,
      expired: row?.expired ?? 0,
      cancelled: row?.cancelled ?? 0,
      byPatient: row?.byPatient ?? 0,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["prescription:stats"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Count
  // --------------------------------------------------------------------------

  async countBy(options: CountOptions = {}): Promise<number> {
    const cacheKey = `prescription:count:${JSON.stringify({
      ...options,
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
    })}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const where = buildPrescriptionWhere(options);
    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["prescription:count"],
    });

    return value;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async create(data: NewPrescription): Promise<Prescription> {
    const row = await this.createImpl(toBaseRow(data));
    const prescription = asPrescription(row);

    this.invalidateAfterWrite(
      [prescription.patientId],
      prescription.id,
      prescription.rxNumber,
      prescription.encounterId
    );
    return prescription;
  }

  async createBatch(data: NewPrescription[]): Promise<Prescription[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(prescriptions).values(data).returning()
    );

    const patientIds = [...new Set(results.map((p) => p.patientId))];
    const encounterIds = results
      .map((p) => p.encounterId)
      .filter((id): id is string => !!id);

    this.invalidateAfterWrite(patientIds, undefined, undefined, encounterIds);
    return results;
  }

  async update(
    id: string,
    data: Partial<NewPrescription>
  ): Promise<Prescription | null> {
    const row = await this.updateImpl(
      id,
      toBaseRow(data),
      /* hasUpdatedAt */ true
    );
    if (!row) return null;

    const prescription = asPrescription(row);
    this.invalidateAfterWrite(
      [prescription.patientId],
      prescription.id,
      prescription.rxNumber,
      prescription.encounterId
    );
    return prescription;
  }

  // --------------------------------------------------------------------------
  // Domain actions
  // --------------------------------------------------------------------------

  /**
   * Mark prescription as filled (dispensed).
   * "filled" is the correct enum value — not "Completed".
   */
  async fill(
    id: string,
    filledById: string,
    filledAt?: Date
  ): Promise<Prescription | null> {
    return this.update(id, {
      status: "filled",
      filledById,
      filledAt: filledAt ?? new Date(),
    });
  }
  async discontinue(id: string, reason?: string): Promise<Prescription | null> {
    return this.update(id, {
      status: "discontinued",
      discontinuedAt: new Date(),
      discontinuedReason: reason ?? "Not specified",
    });
  }

  async updateStatus(
    id: string,
    status: PrescriptionStatus
  ): Promise<Prescription | null> {
    return this.update(id, { status });
  }

  /**
   * Renew a prescription: mark the original as `filled` and create a new
   * `active` prescription derived from it.
   */
  async renew(id: string, renewedById: string): Promise<Prescription | null> {
    const renewed = await withTransaction(async (tx: Transaction) => {
      const original = await tx.query.prescriptions.findFirst({
        where: { id },
      });
      if (!original) return null;

      // Mark original as filled
      await tx
        .update(prescriptions)
        .set({ status: "active" })
        .where(eq(prescriptions.id, id));

      // Unique prescription number
      const prescriptionNumber = `RX-${Math.floor(100_000 + Math.random() * 900_000)}`;

      const {
        id: _omitId,
        createdAt: _omitCreatedAt,
        updatedAt: _omitUpdatedAt,
        ...rest
      } = original;
      void _omitId;
      void _omitCreatedAt;
      void _omitUpdatedAt;

      const [created] = await tx
        .insert(prescriptions)
        .values({
          ...rest,
          rxNumber: prescriptionNumber,
          status: "active",
          prescribedDate: new Date().toISOString().slice(0, 10),
          filledAt: null,
          filledById: null,
          discontinuedAt: null,
          discontinuedReason: null,
          notes: `Renewed from ${original.rxNumber} by ${renewedById}`,
        })
        .returning();

      if (!created) throw new Error("Failed to renew prescription");

      return { original, created };
    });

    if (!renewed) return null;

    this.invalidateAfterWrite(
      [renewed.created.patientId],
      renewed.original.id,
      renewed.original.rxNumber,
      renewed.original.encounterId
    );
    this.invalidateAfterWrite(
      [renewed.created.patientId],
      renewed.created.id,
      renewed.created.rxNumber,
      renewed.created.encounterId
    );

    return renewed.created;
  }

  /**
   * Add medication line items to a prescription via the `prescriptionItems` table.
   * Replaces the old `addItems(prescriptionItems: JSONB[])` approach.
   */
  async addItems(
    prescriptionId: string,
    items: Array<{
      medicineId: string;
      medicineNameSnapshot: string;
      dosage?: string;
      route?: string;
      frequency?: string;
      duration?: string;
      quantity?: number;
      instructions?: string;
    }>
  ): Promise<void> {
    if (items.length === 0) return;

    await withTransaction(async (tx: Transaction) => {
      await tx.insert(prescriptionItems).values(
        items.map((item) => {
          return {
            prescriptionId,
            medicineId: item.medicineId,
            medicineNameSnapshot: item.medicineNameSnapshot,
            dosage: item.dosage ?? "",
            route: item.route ?? "",
            frequency: item.frequency ?? "",
            duration: item.duration ?? "",
            quantity: item.quantity ?? 0,
            instructions: item.instructions ?? "",
          };
        })
      );
    });

    queryCache.invalidate(`prescription:${prescriptionId}`);
    queryCache.invalidatePattern(
      new RegExp(`^prescription:[^:]+:${escapeRegExp(prescriptionId)}$`)
    );
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async countWithPatientJoin(where: SQL | undefined): Promise<number> {
    const base = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.id));
    const query = where ? base.where(where) : base;
    const rows = await query;
    return rows[0]?.count ?? 0;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  private invalidateAfterWrite(
    patientIds: string[],
    prescriptionId?: string,
    prescriptionNumber?: string,
    encounterIds?: string | string[] | null
  ): void {
    if (prescriptionId) {
      queryCache.invalidate(`prescription:${prescriptionId}`);
      queryCache.invalidatePattern(
        new RegExp(`^prescription:[^:]+:${escapeRegExp(prescriptionId)}$`)
      );
    }
    if (prescriptionNumber) {
      queryCache.invalidate(`prescription:num:${prescriptionNumber}`);
    }

    queryCache.invalidateTag("prescriptions:list");
    queryCache.invalidateTag("prescriptions:date");
    queryCache.invalidateTag("prescription:stats");
    queryCache.invalidateTag("prescription:count");

    for (const patientId of new Set(patientIds)) {
      queryCache.invalidateTag(`patient:${patientId}:prescriptions`);
      queryCache.invalidateTag(`patient:${patientId}:prescriptions:active`);
      queryCache.invalidatePrefix(`patient:${patientId}:`);
      queryCache.invalidatePrefix(`prescription:patient:${patientId}:`);
    }

    const encounters = encounterIds
      ? Array.isArray(encounterIds)
        ? encounterIds
        : [encounterIds]
      : [];
    for (const encounterId of new Set(encounters)) {
      if (!encounterId) continue;
      queryCache.invalidateTag(`encounter:${encounterId}:prescriptions`);
    }
  }
}

export const prescriptionRepository = new PrescriptionRepository(db);
