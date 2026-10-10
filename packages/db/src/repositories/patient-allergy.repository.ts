// packages/db/src/repositories/patient-allergy.repository.ts

import { queryCache } from "@pedia/db/cache";
import { db } from "@pedia/db/index";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { patientAllergies } from "../schema";
import type { NewPatientAllergy, PatientAllergy } from "../schema/types";
import { CrudRepository } from "./base.repository";

const LIST_CACHE_TTL_MS = 30_000;

export class PatientAllergyRepository extends CrudRepository<PatientAllergy> {
  protected readonly table = patientAllergies;
  protected readonly idColumn: PgColumn = patientAllergies.id;
  protected readonly tableName = "patient_allergies";

  async findByPatient(
    patientId: string,
    status?: "Active" | "Inactive" | "Resolved"
  ): Promise<PatientAllergy[]> {
    const key = `allergy:patient:${patientId}:${status ?? "all"}`;
    const cached = queryCache.get<PatientAllergy[]>(key);
    if (cached) return cached;

    const where = status
      ? and(
          eq(patientAllergies.patientId, patientId),
          eq(patientAllergies.status, status)
        )
      : eq(patientAllergies.patientId, patientId);

    const rows = await this.findManyImpl(where, {
      orderBy: sql`${patientAllergies.severity} DESC, ${patientAllergies.allergen} ASC`,
    });
    const result = rows as PatientAllergy[];

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:allergies`],
    });

    return result;
  }

  async createForPatient(
    patientId: string,
    data: Omit<NewPatientAllergy, "patientId">
  ): Promise<PatientAllergy> {
    const [created] = await this.db
      .insert(patientAllergies)
      .values({ ...data, patientId })
      .returning();

    if (!created) throw new Error("Failed to create allergy");

    this.invalidateAllergyCaches(patientId);
    return created;
  }

  async updateForPatient(
    id: string,
    patientId: string,
    data: Partial<NewPatientAllergy>
  ): Promise<PatientAllergy | null> {
    const [updated] = await this.db
      .update(patientAllergies)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(patientAllergies.id, id),
          eq(patientAllergies.patientId, patientId)
        )
      )
      .returning();

    if (!updated) return null;

    this.invalidateAllergyCaches(patientId);
    return updated;
  }

  async deleteForPatient(id: string, patientId: string): Promise<boolean> {
    const result = await this.db
      .delete(patientAllergies)
      .where(
        and(
          eq(patientAllergies.id, id),
          eq(patientAllergies.patientId, patientId)
        )
      )
      .returning();

    if (result.length === 0) return false;

    this.invalidateAllergyCaches(patientId);
    return true;
  }

  private invalidateAllergyCaches(patientId: string): void {
    queryCache.invalidatePrefix(`allergy:patient:${patientId}`);
    queryCache.invalidatePrefix(`patient:${patientId}:allergies`);
    queryCache.invalidate(`patient:${patientId}:full`);
  }
}

export const patientAllergyRepository = new PatientAllergyRepository(db);
