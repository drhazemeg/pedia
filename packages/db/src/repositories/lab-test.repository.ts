// packages/db/src/repositories/lab-test.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { labTests } from "@pedia/db/schema";
import type { NewLabTestRow, LabTestRow } from "@pedia/db/schema/types";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

export class LabTestRepository extends CrudRepository<LabTestRow> {
  protected readonly table = labTests;
  protected readonly idColumn: PgColumn = labTests.id;
  protected readonly tableName = "lab_tests";

  async findByCode(code: string): Promise<LabTestRow | null> {
    const rows = await this.findManyImpl(eq(labTests.code, code), {
      limit: 1,
    });
    return rows[0] ? (rows[0] as LabTestRow) : null;
  }

  async listActive(): Promise<LabTestRow[]> {
    const key = "lab_test:active";
    const cached = queryCache.get<LabTestRow[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(labTests.isActive, true), {
      orderBy: sql`${labTests.name} ASC`,
    });
    const result = rows as LabTestRow[];
    queryCache.set(key, result, { ttl: 300_000, tags: ["lab_test:list"] });
    return result;
  }

  async create(data: NewLabTestRow): Promise<LabTestRow> {
    const row = await this.createImpl(data as Record<string, unknown>);
    return row as LabTestRow;
  }
}

export const labTestRepository = new LabTestRepository(db);
