// packages/db/src/repositories/template.repository.ts

import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { isRecord } from "@pedia/db/repositories/_helper";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { type NewTemplate, type Template, templates } from "../schema";
import { CrudRepository, combineConditions } from "./base.repository";

// ============================================================
// Constants
// ============================================================

const CACHE_TTL_MS = 60_000;
const LIST_CACHE_TTL_MS = 30_000;

// ============================================================
// Types
// ============================================================

export type ClinicScope = { clinicId: string };

export type FindAllOptions = {
  category?: string;
  scope?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "name" | "createdAt" | "updatedAt";
  orderDirection?: "asc" | "desc";
};

export type CountOptions = {
  category?: string;
  scope?: string;
  isActive?: boolean;
};

type TemplateWithRelations = Template & {
  clinic: { id: string; name: string };
  createdByUser: { id: string; name: string; email: string };
};

// ============================================================
// Filter builder — single source of truth
// ============================================================

function buildTemplateWhere(
  scope: ClinicScope,
  options: FindAllOptions | CountOptions
): SQL | undefined {
  const conditions: Array<SQL | undefined> = [
    eq(templates.clinicId, scope.clinicId),
  ];

  if (options.category) {
    conditions.push(eq(templates.category, options.category));
  }
  if (options.scope) {
    conditions.push(eq(templates.scope, options.scope));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(templates.isActive, options.isActive));
  }

  return combineConditions(conditions);
}

// ============================================================
// Repository
// ============================================================

export class TemplateRepository extends CrudRepository<Template> {
  protected readonly table = templates;
  protected readonly idColumn: PgColumn = templates.id;
  protected readonly tableName = "templates";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  async findByIdInClinic(
    id: string,
    scope: ClinicScope
  ): Promise<TemplateWithRelations | null> {
    const cacheKey = `templates:${scope.clinicId}:${id}`;
    const cached = queryCache.get<TemplateWithRelations>(cacheKey);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: and(eq(templates.id, id), eq(templates.clinicId, scope.clinicId)),
      with: {
        clinic: { columns: { id: true, name: true } },
        createdByUser: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    if (!isRecord(row)) return null;

    const result = row as unknown as TemplateWithRelations;
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [`templates:${id}`, `templates:clinic:${scope.clinicId}`],
    });

    return result;
  }

  /**
   * Look up a template by its slug within a clinic. Slugs are unique per
   * clinic (see `templates_clinic_slug_idx`), so this returns at most one row.
   */
  async findBySlug(slug: string, scope: ClinicScope): Promise<Template | null> {
    const cacheKey = `templates:${scope.clinicId}:slug:${slug}`;
    const cached = queryCache.get<Template>(cacheKey);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      and(eq(templates.clinicId, scope.clinicId), eq(templates.scope, slug)),
      { limit: 1 }
    );
    const row = rows[0];
    if (!row) return null;

    const result = this.asRow(row);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [`templates:${result.id}`, `templates:clinic:${scope.clinicId}`],
    });

    return result;
  }

  async findAll(
    scope: ClinicScope,
    options: FindAllOptions = {}
  ): Promise<{ data: Template[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      orderBy = "updatedAt",
      orderDirection = "desc",
    } = options;

    const cacheKey = `templates:list:${scope.clinicId}:${JSON.stringify(options)}`;
    const cached = queryCache.get<{
      data: Template[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = buildTemplateWhere(scope, options);

    const orderColumn =
      orderBy === "name"
        ? templates.name
        : orderBy === "createdAt"
          ? templates.createdAt
          : templates.updatedAt;
    const orderExpr =
      orderDirection === "asc" ? asc(orderColumn) : desc(orderColumn);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${orderExpr}`,
      }),
      this.count(where),
    ]);

    const result = {
      data: this.asRows(rows),
      total,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: ["templates:list", `templates:clinic:${scope.clinicId}`],
    });

    return result;
  }

  async findByCategory(
    category: string,
    scope: ClinicScope
  ): Promise<Template[]> {
    const cacheKey = `templates:category:${scope.clinicId}:${category}`;
    const cached = queryCache.get<Template[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      and(
        eq(templates.clinicId, scope.clinicId),
        eq(templates.category, category)
      ),
      { orderBy: desc(templates.updatedAt) }
    );
    const result = this.asRows(rows);

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [
        "templates:list",
        `templates:category:${category}`,
        `templates:clinic:${scope.clinicId}`,
      ],
    });

    return result;
  }

  async findActive(
    scope: ClinicScope,
    options: { scope?: string; limit?: number; offset?: number } = {}
  ): Promise<Template[]> {
    const { limit = 100, offset = 0 } = options;

    const cacheKey = `templates:active:${scope.clinicId}:${JSON.stringify(options)}`;
    const cached = queryCache.get<Template[]>(cacheKey);
    if (cached) return cached;

    const where = buildTemplateWhere(scope, {
      isActive: true,
      scope: options.scope,
    });

    const rows = await this.findManyImpl(where, {
      limit,
      offset,
      orderBy: asc(templates.name),
    });
    const result = this.asRows(rows);

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: ["templates:list", `templates:clinic:${scope.clinicId}`],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Count
  // --------------------------------------------------------------------------

  async countBy(
    scope: ClinicScope,
    options: CountOptions = {}
  ): Promise<number> {
    const cacheKey = `templates:count:${scope.clinicId}:${JSON.stringify(options)}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const where = buildTemplateWhere(scope, options);
    const value = await this.count(where);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL_MS,
      tags: ["templates:count", `templates:clinic:${scope.clinicId}`],
    });

    return value;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async createInClinic(
    scope: ClinicScope,
    data: Omit<NewTemplate, "clinicId">
  ): Promise<Template> {
    const [created] = await this.db
      .insert(templates)
      .values({ ...data, clinicId: scope.clinicId })
      .returning();

    if (!created) throw new Error("Failed to create template");

    this.invalidateAfterWrite(scope.clinicId, created.id);
    return created;
  }

  async updateInClinic(
    id: string,
    scope: ClinicScope,
    data: Partial<NewTemplate>
  ): Promise<Template | null> {
    const [updated] = await this.db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(templates.id, id), eq(templates.clinicId, scope.clinicId)))
      .returning();

    if (!updated) return null;

    this.invalidateAfterWrite(scope.clinicId, id);
    return updated;
  }

  async deleteInClinic(id: string, scope: ClinicScope): Promise<boolean> {
    const result = await this.db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.clinicId, scope.clinicId)))
      .returning();

    if (result.length === 0) return false;

    this.invalidateAfterWrite(scope.clinicId, id);
    return true;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  /**
   * One entry point for every write path. Evicts:
   *  - the per-template cache keys (`templates:${clinicId}:${id}`, `templates:${id}`)
   *  - the per-clinic list/active/category/count tags
   */
  private invalidateAfterWrite(clinicId: string, templateId?: string): void {
    if (templateId) {
      queryCache.invalidate(`templates:${clinicId}:${templateId}`);
      queryCache.invalidate(`templates:${templateId}`);
    }

    queryCache.invalidateTag("templates:list");
    queryCache.invalidateTag("templates:count");
    queryCache.invalidateTag(`templates:clinic:${clinicId}`);
    queryCache.invalidatePrefix(`templates:${clinicId}:`);
    queryCache.invalidatePrefix(`templates:category:${clinicId}:`);
    queryCache.invalidatePrefix(`templates:active:${clinicId}:`);
    queryCache.invalidatePrefix(`templates:list:${clinicId}:`);
    queryCache.invalidatePrefix(`templates:count:${clinicId}:`);
  }
}

export const templateRepository = new TemplateRepository(db);
