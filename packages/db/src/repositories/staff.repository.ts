import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { escapeRegExp, queryCache } from "@pedia/db/cache";
import { escapeLikePattern, isRecord } from "@pedia/db/repositories/_helper";
import type { Role } from "@pedia/db/schema";
import { staff } from "@pedia/db/schema";
// packages/db/src/repositories/staff.repository.ts
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type {
  Encounter,
  NewStaff,
  Patient,
  Prescription,
  Staff,
} from "../schema/types";
import type { BaseRow } from "./base.repository";
import { CrudRepository } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Types
// ============================================================

type StaffWithPatients = Staff & { patients: Patient[] };
type StaffWithEncounters = Staff & {
  encounters: Array<Encounter & { patient: Patient }>;
};
type StaffWithPrescriptions = Staff & {
  prescriptions: Array<Prescription & { patient: Patient }>;
};

export type FindAllOptions = {
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "name" | "createdAt";
  orderDirection?: "asc" | "desc";
  role?: Role;
  search?: string;
};

export type CountOptions = { isActive?: boolean; role?: Role };

export type StaffStats = {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<Role, number>;
};

export type ClinicScope = { clinicId: string };

// ============================================================
// Cast helpers
// ============================================================

const asStaff = (row: BaseRow): Staff => row as Staff;

const asStaffs = (rows: BaseRow[]): Staff[] => rows as Staff[];

const asStaffWithPatients = (row: BaseRow): StaffWithPatients =>
  row as StaffWithPatients;

const asStaffWithEncounters = (row: BaseRow): StaffWithEncounters =>
  row as StaffWithEncounters;

const asStaffWithPrescriptions = (row: BaseRow): StaffWithPrescriptions =>
  row as StaffWithPrescriptions;

const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Filters
// ============================================================

/**
 * Single source of truth for staff filters. Used by `findAll` (page + count),
 * `countBy`, and any future query that needs a `WHERE` on the `staff` table.
 *
 * `scope.clinicId` filters on `staff.clinic_id` at SQL level — never
 * post-fetch on `user.clinicId` (the `user` table has no such column).
 */
function buildStaffWhere(
  options: FindAllOptions,
  scope?: ClinicScope
): SQL | undefined {
  const conditions: SQL[] = [];
  const { role, isActive, search } = options;

  if (scope) conditions.push(eq(staff.clinicId, scope.clinicId));
  if (role) conditions.push(eq(staff.role, role));
  if (isActive !== undefined) conditions.push(eq(staff.isActive, isActive));
  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    conditions.push(
      sql`(${staff.name} ILIKE ${pattern} OR ${staff.email} ILIKE ${pattern} OR ${staff.title} ILIKE ${pattern})`
    );
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

function staffRecordTag(staffId: string): string {
  return `staff:${staffId}`;
}

// ============================================================
// Repository
// ============================================================

export class StaffRepository extends CrudRepository<Staff> {
  protected readonly table = staff;
  protected readonly idColumn: PgColumn = staff.id;
  protected readonly tableName = "staff";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Scoped lookups — distinct names to avoid colliding with the base class.
  // The base `CrudRepository.findById(id)` / `update(id, data, hasUpdatedAt)`
  // / `delete(id)` remain untouched and unscoped.
  // --------------------------------------------------------------------------

  /**
   * Scoped lookup by id. `scope.clinicId` is applied as a SQL-level filter
   * on `staff.clinic_id`. The previous implementation filtered on
   * `user.clinicId` post-fetch, which is both wrong (no such column) and a
   * full scan of the staff table per request.
   */
  async findByIdInClinic(
    id: string,
    scope: ClinicScope
  ): Promise<Staff | null> {
    const cacheKey = `staff:${scope.clinicId}:${id}`;
    const cached = queryCache.get<Staff>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: { id, clinicId: scope.clinicId },
    });

    if (!isRecord(row)) return null;
    const result = asStaff(row);

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [staffRecordTag(id), `staff:clinic:${scope.clinicId}`],
    });
    return result;
  }

  async findByEmail(email: string, scope: ClinicScope): Promise<Staff | null> {
    const cacheKey = `staff:email:${scope.clinicId}:${email}`;
    const cached = queryCache.get<Staff>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: { email, clinicId: scope.clinicId },
    });

    if (!isRecord(row)) return null;
    const result = asStaff(row);

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [staffRecordTag(result.id), `staff:clinic:${scope.clinicId}`],
    });
    return result;
  }

  async findAll(
    options: FindAllOptions = {},
    scope?: ClinicScope
  ): Promise<{ data: Staff[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      orderBy = "name",
      orderDirection = "asc",
    } = options;

    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `staff:list:${scopeKey}:${JSON.stringify(options)}`;
    const cached = queryCache.get<{ data: Staff[]; total: number }>(cacheKey);
    if (cached) return cached;

    const where = buildStaffWhere(options, scope);
    const orderColumn = orderBy === "createdAt" ? staff.createdAt : staff.name;
    const orderExpr =
      orderDirection === "desc" ? desc(orderColumn) : asc(orderColumn);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${orderExpr}`,
      }),
      this.count(where),
    ]);

    const result = { data: asStaffs(rows), total };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["staff:list", `staff:clinic:${scopeKey}`],
    });
    return result;
  }

  async findActive(scope?: ClinicScope): Promise<Staff[]> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `staff:active:${scopeKey}`;
    const cached = queryCache.get<Staff[]>(cacheKey);
    if (cached) return cached;

    const where = scope
      ? and(eq(staff.isActive, true), eq(staff.clinicId, scope.clinicId))
      : eq(staff.isActive, true);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${staff.name} ASC`,
    });
    const result = asStaffs(rows);

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["staff:active", `staff:clinic:${scopeKey}`],
    });
    return result;
  }

  async findByRole(role: Role, scope?: ClinicScope): Promise<Staff[]> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `staff:role:${role}:${scopeKey}`;
    const cached = queryCache.get<Staff[]>(cacheKey);
    if (cached) return cached;

    const where = scope
      ? and(eq(staff.role, role), eq(staff.clinicId, scope.clinicId))
      : eq(staff.role, role);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${staff.name} ASC`,
    });
    const result = asStaffs(rows);

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`staff:role:${role}`, `staff:clinic:${scopeKey}`],
    });
    return result;
  }

  async getStaffWithPatients(id: string): Promise<StaffWithPatients | null> {
    const cacheKey = `staff:${id}:with-patients`;
    const cached = queryCache.get<StaffWithPatients>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(staff.id, id),
      with: {
        patients: { limit: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!isRecord(row)) return null;
    const result = asStaffWithPatients(row);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [staffRecordTag(id), `staff:${id}:patients`],
    });
    return result;
  }

  /**
   * Staff member with recent encounters.
   *
   * Orders by `encounters.startedAt` — `encounterDate` is not a column on
   * `encounters` (the schema uses `startedAt`).
   */
  async getStaffWithEncounters(
    id: string
  ): Promise<StaffWithEncounters | null> {
    const cacheKey = `staff:${id}:with-encounters`;
    const cached = queryCache.get<StaffWithEncounters>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(staff.id, id),
      with: {
        encounters: {
          limit: 20,
          orderBy: { encounterDate: "desc" }, // ✅
          with: { patient: true },
        },
      },
    });

    if (!isRecord(row)) return null;
    const result = asStaffWithEncounters(row);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [staffRecordTag(id), `staff:${id}:encounters`],
    });
    return result;
  }

  async getStaffWithPrescriptions(
    id: string
  ): Promise<StaffWithPrescriptions | null> {
    const cacheKey = `staff:${id}:with-prescriptions`;
    const cached = queryCache.get<StaffWithPrescriptions>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: eq(staff.id, id),
      with: {
        prescriptions: {
          limit: 20,
          orderBy: { createdAt: "desc" },
          with: { patient: true },
        },
      },
    });

    if (!isRecord(row)) return null;
    const result = asStaffWithPrescriptions(row);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [staffRecordTag(id), `staff:${id}:prescriptions`],
    });
    return result;
  }

  async countBy(
    options: CountOptions = {},
    scope?: ClinicScope
  ): Promise<number> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `staff:count:${scopeKey}:${JSON.stringify({
      role: options.role,
      isActive: options.isActive,
    })}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const where = buildStaffWhere(options, scope);
    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["staff:count", `staff:clinic:${scopeKey}`],
    });
    return value;
  }

  async getStats(scope?: ClinicScope): Promise<StaffStats> {
    const scopeKey = scope?.clinicId ?? "all";
    const cacheKey = `staff:stats:${scopeKey}`;
    const cached = queryCache.get<StaffStats>(cacheKey);
    if (cached) return cached;

    const where = scope ? eq(staff.clinicId, scope.clinicId) : undefined;

    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${staff.isActive} = true)::int`,
        inactive: sql<number>`count(*) filter (where ${staff.isActive} = false)::int`,
        admin: sql<number>`count(*) filter (where ${staff.role} = 'admin')::int`,
        doctor: sql<number>`count(*) filter (where ${staff.role} = 'doctor')::int`,
        staffCount: sql<number>`count(*) filter (where ${staff.role} = 'staff')::int`,
        patient: sql<number>`count(*) filter (where ${staff.role} = 'patient')::int`,
      })
      .from(staff)
      .where(where);

    const result: StaffStats = {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      inactive: row?.inactive ?? 0,
      byRole: {
        admin: row?.admin ?? 0,
        doctor: row?.doctor ?? 0,
        staff: row?.staffCount ?? 0,
        patient: row?.patient ?? 0,
      },
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["staff:stats", `staff:clinic:${scopeKey}`],
    });
    return result;
  }

  // --------------------------------------------------------------------------
  // Scoped writes — distinct names.
  // --------------------------------------------------------------------------

  async updateInClinic(
    id: string,
    scope: ClinicScope,
    data: Partial<NewStaff>
  ): Promise<Staff | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.staff.findFirst({
        where: { id, clinicId: scope.clinicId },
      });
      if (!existing) return null;

      const [updated] = await tx
        .update(staff)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(staff.id, id))
        .returning();

      return updated ? { previous: existing, current: updated } : null;
    });

    if (!result) return null;

    this.invalidateAfterWrite(
      [result.current.id],
      result.previous.email,
      result.current.email
    );
    return result.current;
  }

  async deleteInClinic(id: string, scope: ClinicScope): Promise<boolean> {
    const staffMember = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.staff.findFirst({
        where: { id, clinicId: scope.clinicId },
      });
      if (!existing) return null;

      await tx.delete(staff).where(eq(staff.id, id));
      return existing;
    });

    if (!staffMember) return false;

    this.invalidateAfterWrite([staffMember.id], staffMember.email);
    return true;
  }

  async toggleActive(id: string, scope: ClinicScope): Promise<Staff | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const staffMember = await tx.query.staff.findFirst({
        where: { id, clinicId: scope.clinicId },
      });
      if (!staffMember) return null;

      const [updated] = await tx
        .update(staff)
        .set({ isActive: !staffMember.isActive, updatedAt: new Date() })
        .where(eq(staff.id, id))
        .returning();

      return updated ?? null;
    });

    if (!result) return null;

    this.invalidateAfterWrite([result.id], result.email);
    return result;
  }

  // --------------------------------------------------------------------------
  // Unscoped writes — override the base with `override` keyword.
  // --------------------------------------------------------------------------

  override async create(data: NewStaff): Promise<Staff> {
    const row = await this.createImpl(toBaseRow(data));
    const result = asStaff(row);
    this.invalidateAfterWrite([result.id], result.email);
    return result;
  }

  async bulkCreate(data: NewStaff[]): Promise<Staff[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(staff).values(data).returning()
    );

    for (const s of results) {
      this.invalidateAfterWrite([s.id], s.email);
    }
    return results;
  }

  override async update(
    id: string,
    data: Partial<NewStaff>,
    hasUpdatedAt = true
  ): Promise<Staff | null> {
    const row = await this.updateImpl(id, toBaseRow(data), hasUpdatedAt);
    if (!row) return null;

    const result = asStaff(row);
    this.invalidateAfterWrite([result.id], result.email);
    return result;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  /**
   * Evict every cache entry that could contain a stale view after a write
   * touching the given staff members.
   *
   * Reads attach `staff:${id}` as a *tag* (both scoped and unscoped paths),
   * so invalidating the tag evicts every cached view of the row regardless
   * of which `clinicId` scope it was fetched under.
   */
  private invalidateAfterWrite(
    staffIds: string[],
    ...emails: Array<string | undefined | null>
  ): void {
    queryCache.invalidateTag("staff:list");
    queryCache.invalidateTag("staff:active");
    queryCache.invalidateTag("staff:count");
    queryCache.invalidateTag("staff:stats");

    for (const staffId of new Set(staffIds)) {
      queryCache.invalidateTag(staffRecordTag(staffId));
      queryCache.invalidatePrefix(`staff:${staffId}:`);
      queryCache.invalidatePattern(
        new RegExp(`^staff:[^:]+:${escapeRegExp(staffId)}$`)
      );
    }

    if (emails.some((e) => e !== undefined && e !== null)) {
      queryCache.invalidatePrefix("staff:email:");
    }
  }
}

export const staffRepository = new StaffRepository(db);
