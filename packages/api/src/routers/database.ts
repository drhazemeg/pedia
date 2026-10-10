// packages/api/src/routers/database.ts

import { ORPCError } from "@orpc/server";
import type { PgTable } from "@pedia/db";
import { db, getTableColumns, getTableName, sql } from "@pedia/db";
import * as schema from "@pedia/db/schema";
import { logger } from "@pedia/shared/logger/server";
import { z } from "zod";

import { adminProcedure } from "../index";
// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every table name the database router knows about.
 *
 * The list is derived from the actual Drizzle schema at module load,
 * so adding a table to `schema` automatically extends the export/import
 * surface — you can't forget to update a hand-maintained string union.
 */
const TABLES = Object.values(schema)
  .filter(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      Symbol.for("drizzle:Name") in value
  )
  .map((table) => getTableName(table as PgTable));

type TableName = (typeof TABLES)[number];

const tableNameSchema = z.enum(TABLES as [TableName, ...TableName[]]);
export type DatabaseTableName = z.infer<typeof tableNameSchema>;

export type DatabaseTableCounts = Record<DatabaseTableName, number>;

/** A single row from a backup — untyped at this layer, validated per-table. */
const backupRowSchema = z.record(z.string(), z.unknown());

const importSchema = z.object({
  tables: z.partialRecord(tableNameSchema, z.array(backupRowSchema)),
  transactional: z.boolean().optional().default(true),
});

const exportSchema = z.object({
  table: tableNameSchema.optional(),
});

export interface DatabaseBackup {
  clinicId?: string;
  createdAt: string;
  tables: Partial<Record<DatabaseTableName, Array<Record<string, unknown>>>>;
  version: 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table introspection helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve a table name string back to its Drizzle table object. */
function resolveTable(name: TableName) {
  const table = (schema as Record<string, unknown>)[name];
  if (!table || typeof table !== "object") {
    throw new Error(`Unknown table: ${name}`);
  }
  return table;
}

/**
 * Insert rows into a table, bypassing Drizzle's type inference.
 *
 * The backup payload is `Record<string, unknown>[]`; we can't statically
 * prove those match `TInsert`, but the runtime shape comes from a previous
 * export of the same table, so it is correct by construction.
 */
export async function rawInsert(
  tableName: TableName,
  rows: Array<Record<string, unknown>>
) {
  if (rows.length === 0) return;
  const table = resolveTable(tableName);
  await db.insert(table as PgTable).values(rows);
}

/** Truncate a single table with CASCADE to handle FK dependencies. */
export async function rawTruncate(tableName: TableName) {
  const table = resolveTable(tableName);
  await db.execute(
    sql.raw(`TRUNCATE TABLE "${getTableName(table as PgTable)}" CASCADE`)
  );
}

/** Count rows in a single table. */
async function rawCount(tableName: TableName): Promise<number> {
  const table = resolveTable(tableName);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table as PgTable);
  return result[0]?.count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Row counts for every table.
 *
 * Runs all count queries in parallel. The counts are read from the live
 * database (not cached) because the Storage overview card is expected to
 * reflect the current state after any mutation.
 */
async function getTableCounts(): Promise<DatabaseTableCounts> {
  const entries = await Promise.all(
    TABLES.map(async (name) => [name, await rawCount(name)] as const)
  );
  return Object.fromEntries(entries) as DatabaseTableCounts;
}

/**
 * Export all rows from a single table as plain JSON-safe objects.
 *
 * Rows are sorted by the table's primary key when one exists, so two
 * exports of an unchanged database produce byte-identical output.
 */
async function exportTable(
  tableName: TableName
): Promise<Array<Record<string, unknown>>> {
  const table = resolveTable(tableName);
  const columns = getTableColumns(table as PgTable);
  const idColumn = columns.id;

  const query = idColumn
    ? db
        .select()
        .from(table as PgTable)
        .orderBy(idColumn)
    : db.select().from(table as PgTable);

  const rows = await query;
  return rows as Array<Record<string, unknown>>;
}

/**
 * Export every table.
 *
 * Iterates the table list sequentially to avoid holding a connection
 * pool's worth of concurrent full-table scans. For a backup payload the
 * latency is acceptable, and sequential iteration keeps memory bounded.
 */
async function exportAllTables(): Promise<
  Partial<Record<DatabaseTableName, Array<Record<string, unknown>>>>
> {
  const result: Partial<
    Record<DatabaseTableName, Array<Record<string, unknown>>>
  > = {};

  for (const tableName of TABLES) {
    result[tableName] = await exportTable(tableName);
  }

  return result;
}

/**
 * Replace the contents of every table present in the payload.
 *
 * DESTRUCTIVE. The router enforces `adminProcedure`; this function
 * truncates before inserting so the import is a full replace.
 *
 * When `transactional` is true (the default), all truncates and inserts
 * run inside a single PostgreSQL transaction — a failure at any point
 * rolls back the entire import, leaving the database untouched.
 */
async function importAllTables(
  tables: Partial<Record<DatabaseTableName, Array<Record<string, unknown>>>>,
  transactional = true
): Promise<void> {
  const entries = Object.entries(tables) as Array<
    [DatabaseTableName, Array<Record<string, unknown>>]
  >;

  if (entries.length === 0) return;

  const run = async (tx: typeof db) => {
    // Disable FK constraints for the duration of the transaction so the
    // order of table truncates/inserts doesn't matter.
    await tx.execute(sql.raw("SET CONSTRAINTS ALL DEFERRED"));

    for (const [tableName] of entries) {
      const table = resolveTable(tableName);
      await tx.execute(
        sql.raw(`TRUNCATE TABLE "${getTableName(table as PgTable)}" CASCADE`)
      );
    }

    for (const [tableName, rows] of entries) {
      if (rows.length === 0) continue;
      const table = resolveTable(tableName);
      await tx.insert(table as PgTable).values(rows);
    }
  };

  if (transactional) {
    await db.transaction(async (tx) => {
      await run(tx as unknown as typeof db);
    });
  } else {
    await run(db);
  }
}

/**
 * Wipe every table.
 *
 * Uses a single `TRUNCATE ... CASCADE` statement listing every table.
 * `CASCADE` handles FK dependencies regardless of order, and PostgreSQL
 * guarantees the truncate is atomic — a failure leaves every table intact.
 */
async function clearAllTables(): Promise<void> {
  const names = TABLES.map((name) => {
    const table = resolveTable(name);
    return `"${getTableName(table as PgTable)}"`;
  }).join(", ");

  await db.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const databaseRouter = {
  /** Row counts for every table, used by the Storage overview card. */
  getTableCounts: adminProcedure.handler(async ({ context }) => {
    logger.info({
      msg: "Database: getTableCounts",
      userId: context.session.user?.id,
    });
    return getTableCounts();
  }),

  /** Export one table or all tables as a JSON-safe payload. */
  export: adminProcedure
    .input(exportSchema)
    .handler(async ({ input, context }) => {
      logger.info({
        msg: "Database: export",
        userId: context.session.user?.id,
        table: input.table ?? "all",
      });

      if (input.table) {
        return {
          version: 1 as const,
          createdAt: new Date().toISOString(),
          clinicId: context.clinicId,
          tables: { [input.table]: await exportTable(input.table) },
        };
      }

      return {
        version: 1 as const,
        createdAt: new Date().toISOString(),
        clinicId: context.clinicId,
        tables: await exportAllTables(),
      };
    }),

  import: adminProcedure
    .input(importSchema)
    .handler(async ({ input, context }) => {
      const tableCount = Object.keys(input.tables).length;
      const rowCount = Object.values(input.tables).reduce(
        (sum, rows) => sum + (rows?.length ?? 0),
        0
      );

      logger.warn({
        msg: "Database: import starting",
        userId: context.session.user?.id,
        clinicId: context.clinicId,
        tableCount,
        rowCount,
      });

      try {
        await importAllTables(input.tables, input.transactional);
        logger.warn({
          msg: "Database: import complete",
          userId: context.session.user?.id,
          tableCount,
          rowCount,
        });
        return { success: true, tableCount, rowCount };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error({
          msg: "Database: import failed",
          userId: context.session.user?.id,
          error: message,
        });
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Import failed: ${message}`,
          cause: error,
        });
      }
    }),

  clear: adminProcedure.handler(async ({ context }) => {
    logger.warn({
      msg: "Database: clear all tables",
      userId: context.session.user?.id,
      clinicId: context.clinicId,
    });

    try {
      await clearAllTables();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error({
        msg: "Database: clear failed",
        userId: context.session.user?.id,
        error: message,
      });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Clear failed: ${message}`,
        cause: error,
      });
    }
  }),
};

export type DatabaseRouter = typeof databaseRouter;
