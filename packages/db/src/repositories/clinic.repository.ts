// packages/db/src/repositories/clinic.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { clinics, clinicSettings } from "@pedia/db/schema";
import type { NewClinic, Clinic } from "@pedia/db/schema/types";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

const CACHE_TTL = 60_000;

export class ClinicRepository extends CrudRepository<Clinic> {
  protected readonly table = clinics;
  protected readonly idColumn: PgColumn = clinics.id;
  protected readonly tableName = "clinics";

  async findBySlug(slug: string): Promise<Clinic | null> {
    const key = `clinic:slug:${slug}`;
    const cached = queryCache.get<Clinic>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(clinics.slug, slug), {
      limit: 1,
    });
    const row = rows[0];
    if (!row) return null;
    const result = this.asRow(row);
    queryCache.set(key, result, {
      ttl: CACHE_TTL,
      tags: [`clinic:${result.id}`],
    });
    return result;
  }

  async findWithSettings(id: string): Promise<
    | (Omit<Clinic, "settings"> & {
        settings: typeof clinicSettings.$inferSelect | null;
      })
    | null
  > {
    const key = `clinic:${id}:full`;
    const cached = queryCache.get<
      Omit<Clinic, "settings"> & {
        settings: typeof clinicSettings.$inferSelect | null;
      }
    >(key);
    if (cached) return cached;

    const row = await db.query.clinics.findFirst({
      where: { id },
      with: { clinicSettings: true },
    });
    if (!row) return null;

    const { clinicSettings: settingsRow, ...clinic } = row;
    const result = { ...clinic, settings: settingsRow };
    queryCache.set(key, result, { ttl: CACHE_TTL, tags: [`clinic:${id}`] });
    return result;
  }

  async listActive(): Promise<Clinic[]> {
    const rows = await this.findManyImpl(eq(clinics.active, true), {
      orderBy: sql`${clinics.name} ASC`,
    });
    return this.asRows(rows);
  }

  async createWithSettings(
    data: NewClinic,
    settingsData: Omit<typeof clinicSettings.$inferInsert, "clinicId">
  ): Promise<Clinic> {
    return db.transaction(async (tx) => {
      const [clinic] = await tx.insert(clinics).values(data).returning();
      if (!clinic) throw new Error("Failed to create clinic");
      await tx
        .insert(clinicSettings)
        .values({ ...settingsData, clinicId: clinic.id });
      return clinic;
    });
  }
}

export const clinicRepository = new ClinicRepository(db);
