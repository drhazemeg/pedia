// packages/db/src/repositories/base.repository.ts

import { queryCache } from "@pedia/db/cache";
import type { DB, DBOrTx, Transaction } from "@pedia/db/index";
import type { InferInsertModel, InferSelectModel, SQL } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

// ============================================================
// Public types
// ============================================================

export type ClinicScope = {
  clinicId: string;
};

export type BaseRow = Record<string, unknown>;

export type WithClause = Record<string, boolean | Record<string, unknown>>;

export interface BaseFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: SQL | SQL[];
  with?: WithClause;
}

export const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

export function isBaseRow(value: unknown): value is BaseRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readCount(
  rows: Array<{ count: number | string }> | undefined
): number {
  return Number(rows?.[0]?.count ?? 0);
}

// ============================================================
// Narrowing helpers (no `any`)
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Narrow `unknown` to `unknown[]` without going through `any`.
 *
 * `Array.isArray(x)` narrows `unknown` to `any[]`, not `unknown[]`. Every
 * subsequent destructure or element access then yields `any` and trips
 * `no-unsafe-assignment`. This helper does the same runtime check but
 * produces an element type of `unknown`, so the linter is satisfied and the
 * call sites can narrow each element with `isRecord`.
 *
 * Returns `null` (not `undefined`) so the caller's `if (!rows)` reads
 * naturally and `undefined` stays available for other meanings.
 */
function asUnknownArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value as unknown[];
}

/**
 * First element of an `unknown` array, or `undefined` if empty / not an
 * array. Element type is `unknown` (not `any`), so callers must narrow.
 */
function firstElement(value: unknown): unknown {
  const arr = asUnknownArray(value);
  return arr?.[0];
}

// ============================================================
// Query-builder guards
// ============================================================

type TableQueryBuilder = {
  findMany: (options?: unknown) => Promise<unknown>;
  findFirst: (options?: unknown) => Promise<unknown>;
};

function isQueryBuilder(value: unknown): value is TableQueryBuilder {
  return (
    isRecord(value) &&
    typeof value.findMany === "function" &&
    typeof value.findFirst === "function"
  );
}

function hasQueryMap(
  value: unknown
): value is { query: Record<string, unknown> } {
  if (!isRecord(value)) return false;
  const { query } = value;
  return isRecord(query);
}

function sqlToCacheKey(fragment: SQL | undefined): string {
  if (!fragment) return "all";
  const { sql: text, params } = fragment.toQuery({
    escapeName: (name) => name,
    escapeParam: () => "?",
    escapeString: () => "?",
  });
  return `${text}::${JSON.stringify(params)}`;
}

// ============================================================
// Base repository
// ============================================================
//
// This class used to be split into `BaseRepository` + `CrudRepository`.
// The split was an accident of history: `BaseRepository` held the
// low-level impls (`findByIdImpl`, `createImpl`, …), and `CrudRepository`
// was a thin generic wrapper that exposed them under ergonomic names and
// cast the `BaseRow` results to the concrete row type via `asRow`.
//
// Every repo subclass ended up needing *both* halves, so the wrapper was
// pure indirection: one extra layer, one extra file to import, one extra
// thing to keep in sync when the impls changed. Merging them means a repo
// declares its row type once — `extends BaseRepository<Admission>` — and
// gets both the low-level and high-level methods on the same class.
//
// The `TRow` / `TInsert` parameters default to `BaseRow` so a repo that
// doesn't have a schema row type yet (or only uses the low-level impls
// directly) can still subclass without supplying them.

export abstract class BaseRepository<
  TRow extends BaseRow = BaseRow,
  TInsert extends BaseRow = Partial<TRow>,
> {
  /** The Drizzle table this repo is responsible for. */
  protected abstract readonly table: PgTable;

  /** The primary key column — used by `findByIdImpl`, `updateImpl`, `deleteImpl`. */
  protected abstract readonly idColumn: PgColumn;

  /**
   * The Drizzle "logical" table name — used for cache keys and for
   * resolving the relational query builder (`db.query[tableName]`).
   *
   * Must match the name passed to `defineRelations()`, not necessarily
   * the physical table name in PostgreSQL.
   */
  protected abstract readonly tableName: string;

  protected readonly db: DB | Transaction | DBOrTx;

  constructor(db: DB | Transaction | DBOrTx) {
    this.db = db;
  }

  // --------------------------------------------------------------------------
  // Typed casts
  // --------------------------------------------------------------------------
  //
  // These live on `BaseRepository` (rather than on a `CrudRepository`
  // subclass) so that repos which only call the low-level impls can still
  // narrow their results without duplicating the cast helpers. They are
  // generic *per call* — not per class — because a single repo often
  // queries join tables or partial columns whose runtime shape differs
  // from `TRow`. `this.asRow<AdmissionWithGuardian>(row)` is legal
  // alongside `this.asRow<Admission>(row)` in the same class body.
  //
  // The cast is safe by construction: the base queried *this* table, so
  // the runtime object is always the row shape the caller asked for. The
  // helper exists to satisfy the type system, not to paper over a schema
  // mismatch.

  /** Narrow a single base row to the concrete row type. */
  protected asRow<T extends BaseRow = TRow>(value: BaseRow): T {
    return value as T;
  }

  /** Narrow an array of base rows to the concrete row type. */
  protected asRows<T extends BaseRow = TRow>(values: BaseRow[]): T[] {
    return values as T[];
  }

  // --------------------------------------------------------------------------
  // Cache helpers
  // --------------------------------------------------------------------------

  protected async cacheQuery<TResult>(
    key: string,
    queryFn: () => Promise<TResult>,
    ttlMs = DEFAULT_CACHE_TTL_MS,
    tags: string[] = []
  ): Promise<TResult> {
    const cached = queryCache.get<TResult>(key);
    if (cached !== null) return cached;

    const result = await queryFn();
    queryCache.set(key, result, { ttl: ttlMs, tags });
    return result;
  }

  protected invalidateCache(pattern?: string | RegExp): void {
    if (!pattern) {
      queryCache.invalidatePrefix(`${this.tableName}:`);
      return;
    }
    if (typeof pattern === "string") {
      queryCache.invalidate(pattern);
    } else {
      queryCache.invalidatePattern(pattern);
    }
  }

  protected invalidateTag(tag: string): void {
    queryCache.invalidateTag(tag);
  }

  protected invalidateTags(tags: string[]): void {
    for (const tag of tags) queryCache.invalidateTag(tag);
  }

  protected getRecordTags(id: string): string[] {
    return [`${this.tableName}:${id}`, `${this.tableName}:record`];
  }

  protected getListTags(): string[] {
    return [`${this.tableName}:list`];
  }

  protected getCountTags(): string[] {
    return [`${this.tableName}:count`];
  }

  // --------------------------------------------------------------------------
  // Relational query builder
  // --------------------------------------------------------------------------
  //
  // Resolves `db.query[tableName]` from the *injected* db handle, never the
  // module-level `db` import. This matters for two reasons:
  //   1. Transactions: `this.db` may be a `Transaction`, whose `.query`
  //      accessor is scoped to that transaction. Using the module-level
  //      `db` inside a transaction would silently read committed state
  //      instead of the transaction's uncommitted writes.
  //   2. Test isolation: the base class is constructed with whatever db
  //      handle the caller passed, so tests can swap in a fixture db.

  protected getQueryBuilder(): TableQueryBuilder {
    const { db } = this;
    if (!hasQueryMap(db)) {
      throw new Error(
        "Relational query builder not available on this database handle. " +
          "Construct the Drizzle client with { relations } from defineRelations()."
      );
    }

    const queries: Record<string, unknown> = db.query;
    const tableQuery = queries[this.tableName];

    if (!isQueryBuilder(tableQuery)) {
      throw new Error(
        `No relational query builder registered for table "${this.tableName}". ` +
          "Add this table to defineRelations() so it exposes a " +
          `\`.query.${this.tableName}\` accessor.`
      );
    }

    return tableQuery;
  }

  // --------------------------------------------------------------------------
  // Low-level CRUD impls
  // --------------------------------------------------------------------------
  //
  // These return `BaseRow` / `BaseRow[]` on purpose: they are the shared
  // implementation, and they don't know the concrete row type. Public
  // methods (`findById`, `create`, …) below call them and narrow the
  // result via `asRow`.

  protected async findByIdImpl(id: string): Promise<BaseRow | null> {
    const cacheKey = `${this.tableName}:findById:${id}`;
    const tags = this.getRecordTags(id);

    return this.cacheQuery(
      cacheKey,
      async () => {
        const result: unknown = await this.db
          .select()
          .from(this.table)
          .where(eq(this.idColumn, id))
          .limit(1);

        const row = firstElement(result);
        return isRecord(row) ? row : null;
      },
      DEFAULT_CACHE_TTL_MS,
      tags
    );
  }

  protected async findManyImpl(
    where: SQL | undefined,
    options: BaseFindManyOptions = {}
  ): Promise<BaseRow[]> {
    const query = this.getQueryBuilder();

    const queryOptions: Record<string, unknown> = {};
    if (where) queryOptions.where = where;
    if (options.orderBy) queryOptions.orderBy = options.orderBy;
    if (options.limit !== undefined) queryOptions.limit = options.limit;
    if (options.offset !== undefined) queryOptions.offset = options.offset;
    if (options.with) queryOptions.with = options.with;

    const result: unknown = await query.findMany(queryOptions);
    const rows = asUnknownArray(result);
    if (!rows) {
      throw new TypeError(
        `findMany on "${this.tableName}" returned a non-array result.`
      );
    }
    return rows.filter(isRecord);
  }

  protected async createImpl(data: BaseRow): Promise<BaseRow> {
    const result: unknown = await this.db
      .insert(this.table)
      .values(data)
      .returning();

    const row = firstElement(result);
    if (!isRecord(row)) {
      throw new Error(`Insert into "${this.tableName}" returned no row.`);
    }

    this.invalidateTags([...this.getListTags(), ...this.getCountTags()]);
    return row;
  }

  protected async updateImpl(
    id: string,
    data: BaseRow,
    hasUpdatedAt: boolean
  ): Promise<BaseRow | null> {
    const payload: BaseRow = { ...data };
    if (hasUpdatedAt) {
      payload.updatedAt = new Date();
    }

    const result: unknown = await this.db
      .update(this.table)
      .set(payload)
      .where(eq(this.idColumn, id))
      .returning();

    const row = firstElement(result);
    if (!isRecord(row)) return null;

    this.invalidateTags([
      ...this.getRecordTags(id),
      ...this.getListTags(),
      ...this.getCountTags(),
    ]);
    return row;
  }

  protected async deleteImpl(id: string): Promise<boolean> {
    const result: unknown = await this.db
      .delete(this.table)
      .where(eq(this.idColumn, id))
      .returning();

    const rows = asUnknownArray(result);
    if (!rows || rows.length === 0) return false;

    this.invalidateTags([
      ...this.getRecordTags(id),
      ...this.getListTags(),
      ...this.getCountTags(),
    ]);
    return true;
  }

  // --------------------------------------------------------------------------
  // Public CRUD conveniences
  // --------------------------------------------------------------------------
  //
  // These used to live on `CrudRepository`. They are now directly on
  // `BaseRepository`, so every subclass gets them without a second
  // `extends`. Signatures are unchanged.

  async findById(id: string): Promise<TRow | null> {
    const row = await this.findByIdImpl(id);
    return row ? this.asRow<TRow>(row) : null;
  }

  async create(data: TInsert): Promise<TRow> {
    const row = await this.createImpl(data);
    return this.asRow<TRow>(row);
  }

  async update(
    id: string,
    data: Partial<TInsert>,
    hasUpdatedAt = true
  ): Promise<TRow | null> {
    const row = await this.updateImpl(id, data, hasUpdatedAt);
    return row ? this.asRow<TRow>(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteImpl(id);
  }

  // --------------------------------------------------------------------------
  // Count
  // --------------------------------------------------------------------------

  async count(where?: SQL): Promise<number> {
    const cacheKey = `${this.tableName}:count:${sqlToCacheKey(where)}`;
    const tags = this.getCountTags();

    return this.cacheQuery(
      cacheKey,
      async () => {
        const base = this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(this.table);
        const query = where ? base.where(where) : base;

        const result: unknown = await query;
        const row = firstElement(result);
        if (!isRecord(row)) return 0;

        const raw = row.count;
        return typeof raw === "number" ? raw : Number(raw ?? 0);
      },
      DEFAULT_CACHE_TTL_MS,
      tags
    );
  }

  // --------------------------------------------------------------------------
  // Type-only helpers (unchanged)
  // --------------------------------------------------------------------------

  /**
   * Helper for subclasses that want to expose the typed row constructor
   * to `InferSelectModel`. This is a type-only member — it exists so
   * subclasses get the row type without importing it separately.
   */
  static rowOf<T extends PgTable>(): InferSelectModel<T> {
    throw new Error("rowOf is type-only");
  }

  static insertOf<T extends PgTable>(): InferInsertModel<T> {
    throw new Error("insertOf is type-only");
  }
}

// ============================================================
// Condition helpers (unchanged)
// ============================================================

export function combineConditions(
  conditions: Array<SQL | undefined>
): SQL | undefined {
  const validConditions = conditions.filter(
    (cond): cond is SQL => cond !== undefined
  );
  return validConditions.length > 0 ? and(...validConditions) : undefined;
}

// ============================================================
// Backwards-compat shim
// ============================================================
//
// `CrudRepository` no longer exists as a distinct class, but a handful of
// repos and type-only imports still reference it. Re-exporting the merged
// `BaseRepository` under the old name keeps those call sites compiling
// while the migration completes. Delete this block once every repo has
// been updated to `extends BaseRepository<...>`.
//
// Note the shape change: `CrudRepository<TRow, TInsert>` had *two*
// required type parameters; `BaseRepository<TRow, TInsert>` has defaults.
// Existing `CrudRepository<Foo, NewFoo>` usage maps cleanly, but
// `CrudRepository` used bare (no type args) now yields `BaseRow` rows
// rather than erroring — that's the intended compatibility behavior.

/** @deprecated Use `BaseRepository<TRow, TInsert>` directly. */
export type CrudRepository<
  TRow extends BaseRow = BaseRow,
  TInsert extends BaseRow = Partial<TRow>,
> = BaseRepository<TRow, TInsert>;
