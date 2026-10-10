// packages/db/src/repositories/dispensation.repository.ts
import { db, withTransaction } from "@pedia/db";
import type { Transaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import {
  dispensationItems,
  dispensations,
  medicineBatches,
} from "@pedia/db/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { BaseRepository } from "./base.repository";

type DispensationRow = InferSelectModel<typeof dispensations>;
type NewDispensationRow = InferInsertModel<typeof dispensations>;
type NewDispensationItemRow = InferInsertModel<typeof dispensationItems>;

export class DispensationRepository extends BaseRepository {
  protected readonly table = dispensations;
  protected readonly idColumn: PgColumn = dispensations.id;
  protected readonly tableName = "dispensations";

  async findById(id: string): Promise<DispensationRow | null> {
    const row = await db.query.dispensations.findFirst({
      where: { id },
      with: { items: true, prescription: true, patient: true },
    });
    return row ?? null;
  }

  async findByPrescription(prescriptionId: string): Promise<DispensationRow[]> {
    const rows = await db.query.dispensations.findMany({
      where: { prescriptionId },
      with: { items: true },
      orderBy: { dispensedAt: "desc" },
    });
    return rows;
  }

  async delete(id: string): Promise<void> {
    const dispensation = await this.findById(id);
    if (!dispensation) {
      return;
    }

    await db.delete(dispensations).where(eq(dispensations.id, id));
    queryCache.invalidateTag(`patient:${dispensation.patientId}:dispensations`);
    queryCache.invalidateTag("medicine:stock");
  }

  async dispense(
    data: NewDispensationRow,
    items: Omit<NewDispensationItemRow, "dispensationId">[]
  ): Promise<DispensationRow> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [dispensation] = await tx
        .insert(dispensations)
        .values(data)
        .returning();
      if (!dispensation) throw new Error("Failed to create dispensation");

      for (const item of items) {
        // Deduct stock
        const [batch] = await tx
          .update(medicineBatches)
          .set({
            quantityAvailable: sql`${medicineBatches.quantityAvailable} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(medicineBatches.id, item.batchId))
          .returning();
        if (!batch || batch.quantityAvailable < 0) {
          throw new Error(`Insufficient stock in batch ${item.batchId}`);
        }

        await tx
          .insert(dispensationItems)
          .values({ ...item, dispensationId: dispensation.id });
      }

      return dispensation;
    });

    queryCache.invalidateTag(`patient:${data.patientId}:dispensations`);
    queryCache.invalidateTag("medicine:stock");
    return result;
  }
}

export const dispensationRepository = new DispensationRepository(db);
