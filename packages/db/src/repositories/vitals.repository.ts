// packages/db/src/repositories/vitals.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { vitals } from "@pedia/db/schema";
import type { NewVitalSigns, VitalSigns } from "@pedia/db/schema/types";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

export class VitalsRepository extends CrudRepository<VitalSigns> {
  protected readonly table = vitals;
  protected readonly idColumn: PgColumn = vitals.id;
  protected readonly tableName = "vitals";

  async findByPatient(patientId: string, limit = 50): Promise<VitalSigns[]> {
    const key = `patient:${patientId}:vitals:${limit}`;
    const cached = queryCache.get<VitalSigns[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(vitals.patientId, patientId), {
      limit,
      orderBy: sql`${vitals.recordedAt} DESC`,
    });
    const result = rows as VitalSigns[];
    queryCache.set(key, result, {
      ttl: 30_000,
      tags: [`patient:${patientId}:vitals`],
    });
    return result;
  }

  async getLatest(patientId: string): Promise<VitalSigns | null> {
    const key = `patient:${patientId}:vitals:latest`;
    const cached = queryCache.get<VitalSigns>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(vitals.patientId, patientId), {
      limit: 1,
      orderBy: sql`${vitals.recordedAt} DESC`,
    });
    const result = rows[0] as VitalSigns | undefined;
    if (result)
      queryCache.set(key, result, {
        ttl: 30_000,
        tags: [`patient:${patientId}:vitals`],
      });
    return result ?? null;
  }

  async create(data: NewVitalSigns): Promise<VitalSigns> {
    const row = await this.createImpl(data as Record<string, unknown>);
    queryCache.invalidateTag(`patient:${data.patientId}:vitals`);
    return row as VitalSigns;
  }
}

export const vitalsRepository = new VitalsRepository(db);
