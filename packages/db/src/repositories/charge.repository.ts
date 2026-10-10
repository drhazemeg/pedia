// packages/db/src/repositories/charge.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { chargeCatalog } from "@pedia/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

type ChargeRow = typeof chargeCatalog.$inferSelect;
type NewChargeRow = typeof chargeCatalog.$inferInsert;

export class ChargeRepository extends CrudRepository<ChargeRow> {
  protected readonly table = chargeCatalog;
  protected readonly idColumn: PgColumn = chargeCatalog.id;
  protected readonly tableName = "charge_catalog";

  async findByCode(code: string): Promise<ChargeRow | null> {
    const rows = await this.findManyImpl(eq(chargeCatalog.code, code), {
      limit: 1,
    });
    return rows[0] ? (rows[0] as ChargeRow) : null;
  }

  async listActive(): Promise<ChargeRow[]> {
    const key = "charge:active";
    const cached = queryCache.get<ChargeRow[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(chargeCatalog.isActive, true), {
      orderBy: sql`${chargeCatalog.category} ASC, ${chargeCatalog.name} ASC`,
    });
    const result = rows as ChargeRow[];
    queryCache.set(key, result, { ttl: 300_000, tags: ["charge:list"] });
    return result;
  }

  async listByCategory(category: string): Promise<ChargeRow[]> {
    const rows = await this.findManyImpl(
      and(
        eq(chargeCatalog.isActive, true),
        eq(chargeCatalog.category, category)
      )
    );
    return rows as ChargeRow[];
  }

  async create(data: NewChargeRow): Promise<ChargeRow> {
    const row = await this.createImpl(data as Record<string, unknown>);
    return row as ChargeRow;
  }
}

export const chargeRepository = new ChargeRepository(db);
