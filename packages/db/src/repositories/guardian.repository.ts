// packages/db/src/repositories/guardian.repository.ts

import { queryCache } from "@pedia/db/cache";
import { db } from "@pedia/db/index";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { guardians } from "../schema";
import type { Guardian, NewGuardian } from "../schema/types";
import { CrudRepository } from "./base.repository";

const CACHE_TTL_MS = 60_000;
const LIST_CACHE_TTL_MS = 30_000;

export class GuardianRepository extends CrudRepository<Guardian> {
  protected readonly table = guardians;
  protected readonly idColumn: PgColumn = guardians.id;
  protected readonly tableName = "guardians";

  async findByPatient(patientId: string): Promise<Guardian[]> {
    const key = `guardian:patient:${patientId}`;
    const cached = queryCache.get<Guardian[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(guardians.patientId, patientId), {
      orderBy: sql`${guardians.isPrimary} DESC, ${guardians.contactOrder} ASC`,
    });
    const result = rows as Guardian[];

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:guardians`],
    });

    return result;
  }

  async findPrimary(patientId: string): Promise<Guardian | null> {
    const key = `guardian:patient:${patientId}:primary`;
    const cached = queryCache.get<Guardian>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      and(eq(guardians.patientId, patientId), eq(guardians.isPrimary, true)),
      { limit: 1 }
    );
    const result = rows[0] as Guardian | undefined;

    if (result) {
      queryCache.set(key, result, {
        ttl: CACHE_TTL_MS,
        tags: [`patient:${patientId}`, `patient:${patientId}:guardians`],
      });
    }

    return result ?? null;
  }

  async createForPatient(
    patientId: string,
    data: Omit<NewGuardian, "patientId">
  ): Promise<Guardian> {
    const [created] = await this.db
      .insert(guardians)
      .values({ ...data, patientId })
      .returning();

    if (!created) throw new Error("Failed to create guardian");

    this.invalidateGuardianCaches(patientId);
    return created;
  }

  async updateForPatient(
    id: string,
    patientId: string,
    data: Partial<NewGuardian>
  ): Promise<Guardian | null> {
    const [updated] = await this.db
      .update(guardians)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(guardians.id, id), eq(guardians.patientId, patientId)))
      .returning();

    if (!updated) return null;

    this.invalidateGuardianCaches(patientId);
    return updated;
  }

  async deleteForPatient(id: string, patientId: string): Promise<boolean> {
    const result = await this.db
      .delete(guardians)
      .where(and(eq(guardians.id, id), eq(guardians.patientId, patientId)))
      .returning();

    if (result.length === 0) return false;

    this.invalidateGuardianCaches(patientId);
    return true;
  }

  private invalidateGuardianCaches(patientId: string): void {
    queryCache.invalidatePrefix(`guardian:patient:${patientId}`);
    queryCache.invalidatePrefix(`patient:${patientId}:guardians`);
  }
}

export const guardianRepository = new GuardianRepository(db);
