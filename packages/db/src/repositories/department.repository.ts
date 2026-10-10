// packages/db/src/repositories/department.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { departments } from "@pedia/db/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

type DepartmentRow = InferSelectModel<typeof departments>;
type NewDepartmentRow = InferInsertModel<typeof departments>;

export class DepartmentRepository extends CrudRepository<DepartmentRow> {
  protected readonly table = departments;
  protected readonly idColumn: PgColumn = departments.id;
  protected readonly tableName = "departments";

  async findByCode(code: string): Promise<DepartmentRow | null> {
    const rows = await this.findManyImpl(eq(departments.code, code), {
      limit: 1,
    });
    return rows[0] ? (rows[0] as DepartmentRow) : null;
  }

  async listActive(clinicId?: string): Promise<DepartmentRow[]> {
    const key = `department:active:${clinicId ?? "all"}`;
    const cached = queryCache.get<DepartmentRow[]>(key);
    if (cached) return cached;

    const where = clinicId
      ? sql`${departments.isActive} = true AND ${departments.clinicId} = ${clinicId}`
      : eq(departments.isActive, true);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${departments.name} ASC`,
    });
    const result = rows as DepartmentRow[];
    queryCache.set(key, result, {
      ttl: 300_000,
      tags: ["department:list"],
    });
    return result;
  }

  async create(data: NewDepartmentRow): Promise<DepartmentRow> {
    const row = await this.createImpl(data as Record<string, unknown>);
    return row as DepartmentRow;
  }
}

export const departmentRepository = new DepartmentRepository(db);
