// packages/db/src/repositories/medicine.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { medicineBatches, medicines } from "@pedia/db/schema";
import type { Medicine, MedicineBatch } from "@pedia/db/schema/types";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

export class MedicineRepository extends CrudRepository<Medicine> {
  protected readonly table = medicines;
  protected readonly idColumn: PgColumn = medicines.id;
  protected readonly tableName = "medicines";

  async findByCode(code: string): Promise<Medicine | null> {
    const rows = await this.findManyImpl(eq(medicines.code, code), {
      limit: 1,
    });
    return rows[0] ? (rows[0] as Medicine) : null;
  }

  async findByGenericName(name: string, clinicId: string): Promise<Medicine[]> {
    const key = `medicine:generic:${clinicId}:${name}`;
    const cached = queryCache.get<Medicine[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      and(eq(medicines.clinicId, clinicId), eq(medicines.genericName, name))
    );
    const result = rows as Medicine[];
    queryCache.set(key, result, { ttl: 60_000, tags: ["medicine:list"] });
    return result;
  }

  async listActive(clinicId: string): Promise<Medicine[]> {
    const rows = await this.findManyImpl(
      and(eq(medicines.clinicId, clinicId), eq(medicines.isActive, true)),
      { orderBy: sql`${medicines.genericName} ASC` }
    );
    return rows as Medicine[];
  }

  async getBatches(medicineId: string): Promise<MedicineBatch[]> {
    const rows = await db.query.medicineBatches.findMany({
      where: { medicineId, quantityAvailable: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    });
    return rows;
  }

  async getLowStock(clinicId: string): Promise<Medicine[]> {
    const rows = await db
      .select({
        medicine: medicines,
        available: sql<number>`COALESCE(sum(${medicineBatches.quantityAvailable}), 0)::int`,
      })
      .from(medicines)
      .leftJoin(medicineBatches, eq(medicineBatches.medicineId, medicines.id))
      .where(eq(medicines.clinicId, clinicId))
      .groupBy(medicines.id)
      .having(
        sql`COALESCE(sum(${medicineBatches.quantityAvailable}), 0) <= ${medicines.reorderLevel}`
      );

    return rows.map((r) => r.medicine);
  }
}

export const medicineRepository = new MedicineRepository(db);
