import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { preparedQueries, queryCache } from "./cache";
import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

const isProduction = process.env.NODE_ENV === "production";

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────

/** Shared pg pool. Created lazily so the DATABASE_URL is only required once. */
let pool: Pool | undefined;

function getPool(env: DatabaseConfig): Pool {
  if (pool) return pool;

  const connectionString = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (check .env)");
  }

  pool = new Pool({
    connectionString,
    max: isProduction ? 20 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000,
    maxLifetimeSeconds: 60 * 30,
    // ssl: isProduction ? { rejectUnauthorized: true } : undefined,
  });

  // pg emits `error` on idle clients when the backend drops the connection.
  // Without a listener, Node crashes the process.
  pool.on("error", (error) => {
    console.error({ err: error }, "❌ Unexpected error on idle pg client");
  });

  return pool;
}

export function createDb(env: DatabaseConfig) {
  return drizzle({ client: getPool(env), relations });
}

export type Database = ReturnType<typeof createDb>;

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

/** Lazily-created singleton — avoids throwing at module import time when
 *  DATABASE_URL is absent (e.g. during a build-time prerender step). */
let _db: ReturnType<typeof createDb> | undefined;

export const db: ReturnType<typeof createDb> = new Proxy(
  {} as ReturnType<typeof createDb>,
  {
    get(_target, prop, receiver) {
      if (!_db) {
        _db = createDb({
          DATABASE_URL: process.env.DATABASE_URL as string,
        } as DatabaseConfig);
      }
      return Reflect.get(_db, prop, receiver);
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DB = typeof db;
export type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DBOrTx = DB | Transaction;

// ─────────────────────────────────────────────────────────────────────────────
// Readiness
// ─────────────────────────────────────────────────────────────────────────────

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error({ err: error }, "❌ Database readiness check failed");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shutdown
// ─────────────────────────────────────────────────────────────────────────────

let isClosed = false;

export async function closeConnection(): Promise<void> {
  if (isClosed) return;
  isClosed = true;

  try {
    await pool?.end();
    pool = undefined;
    queryCache.clear();
    preparedQueries.clear();
    console.warn("✅ Database connection closed");
  } catch (error) {
    console.error({ err: error }, "❌ Error closing database connection");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

type QueryOptions = {
  accessMode?: "read only" | "read write";
  isolationLevel?:
    | "read uncommitted"
    | "read committed"
    | "repeatable read"
    | "serializable";
  maxRetries?: number;
};

const RETRYABLE_PG_CODES = new Set(["40001", "40P01", "55P03"]);

function isRetryableTxError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && RETRYABLE_PG_CODES.has(code);
}

export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const { maxRetries = 2, ...txOptions } = options;

  const run = () => {
    const hasTxOptions =
      txOptions.isolationLevel !== undefined ||
      txOptions.accessMode !== undefined;
    return hasTxOptions ? db.transaction(fn, txOptions) : db.transaction(fn);
  };

  let attempt = 0;
  while (true) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableTxError(error)) throw error;
      attempt += 1;
      const delay = 50 * 2 ** (attempt - 1) + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function runWithDb<T>(
  fn: (executor: DBOrTx) => Promise<T>,
  options?: QueryOptions
): Promise<T> {
  const hasTxOptions =
    options?.isolationLevel !== undefined || options?.accessMode !== undefined;

  if (hasTxOptions) {
    return withTransaction((tx) => fn(tx), options);
  }
  return fn(db);
}

export {
  and,
  asc,
  count,
  desc,
  lt,
  eq,
  gte,
  ilike,
  inArray,
  like,
  lte,
  or,
  getTableName,
  getTableColumns,
  SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm";
export { PgColumn, PgTable } from "drizzle-orm/pg-core";
