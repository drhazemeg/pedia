// packages/db/src/repositories/admission.repository.ts
import { db, withTransaction } from "@pedia/db";
import type { Transaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { and, eq, isNull } from "drizzle-orm";

import { admissions, bedAllocations, beds, clinicalNotes } from "../schema";
import type { Admission, NewAdmission, NewClinicNote } from "../schema/types";
import { BaseRepository } from "./base.repository";

export class AdmissionRepository extends BaseRepository<
  Admission,
  NewAdmission
> {
  protected readonly table = admissions;
  protected readonly idColumn = admissions.id;
  protected readonly tableName = "admissions";
  async findActive(patientId?: string): Promise<Admission[]> {
    const rows = await this.findManyImpl(
      patientId ? eq(admissions.patientId, patientId) : undefined
    );
    return this.asRows(rows); // ← typed helper
  }

  async findByPatient(
    patientId: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<Admission[]> {
    const rows = await this.findManyImpl(eq(admissions.patientId, patientId), {
      limit: opts.limit,
      offset: opts.offset,
    });
    return this.asRows(rows); // ← typed helper
  }

  async findById(id: string): Promise<Admission | null> {
    const row = await db.query.admissions.findFirst({
      where: { id },
      with: {
        patient: true,
        attendingStaff: true,
        bedAllocations: true,
        clinicalNotes: true,
      },
    });
    return row ?? null;
  }

  async admit(
    data: NewAdmission,
    bedId: string,
    allocatedById: string
  ): Promise<Admission> {
    const result = await withTransaction(async (tx: Transaction) => {
      // Reserve the bed
      const [bed] = await tx
        .update(beds)
        .set({ status: "occupied", updatedAt: new Date() })
        .where(and(eq(beds.id, bedId), eq(beds.status, "available")))
        .returning();
      if (!bed) throw new Error("Bed not available");

      const [admission] = await tx.insert(admissions).values(data).returning();
      if (!admission) throw new Error("Failed to create admission");

      await tx.insert(bedAllocations).values({
        admissionId: admission.id,
        bedId,
        allocatedById,
        startedAt: new Date(),
      });

      return admission;
    });

    queryCache.invalidateTag(`patient:${data.patientId}:admissions`);
    queryCache.invalidateTag("admission:active");
    return result;
  }

  async discharge(
    id: string,
    summary: string,
    endedById: string
  ): Promise<Admission | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [admission] = await tx
        .update(admissions)
        .set({
          status: "Discharged",
          dischargedAt: new Date(),
          dischargeSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(admissions.id, id))
        .returning();
      if (!admission) return null;

      const allocations = await tx
        .select()
        .from(bedAllocations)
        .where(
          and(
            eq(bedAllocations.admissionId, id),
            isNull(bedAllocations.endedAt)
          )
        );

      for (const alloc of allocations) {
        await tx
          .update(bedAllocations)
          .set({ endedAt: new Date(), endedById })
          .where(eq(bedAllocations.id, alloc.id));
        await tx
          .update(beds)
          .set({ status: "available", updatedAt: new Date() })
          .where(eq(beds.id, alloc.bedId));
      }

      return admission;
    });

    queryCache.invalidateTag(`patient:${result?.patientId}:admissions`);
    queryCache.invalidateTag("admission:active");
    return result;
  }

  /**
   * Delete an admission and free associated bed allocations.
   *
   * Returns the deleted admission record if found, null otherwise.
   * This is a named method (not an override) because it has a different
   * contract than the base `delete` method which returns only a boolean.
   */
  async deleteWithCleanup(id: string): Promise<Admission | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [admission] = await tx
        .delete(admissions)
        .where(eq(admissions.id, id))
        .returning();
      if (!admission) return null;

      const allocations = await tx
        .select()
        .from(bedAllocations)
        .where(eq(bedAllocations.admissionId, id));

      for (const alloc of allocations) {
        await tx
          .update(beds)
          .set({ status: "available", updatedAt: new Date() })
          .where(eq(beds.id, alloc.bedId));
      }

      await tx.delete(bedAllocations).where(eq(bedAllocations.admissionId, id));

      return admission;
    });

    queryCache.invalidateTag(`patient:${result?.patientId}:admissions`);
    queryCache.invalidateTag("admission:active");
    return result;
  }

  async addClinicalNote(data: NewClinicNote): Promise<void> {
    await db.insert(clinicalNotes).values(data);
    queryCache.invalidateTag(`admission:${data.admissionId}:notes`);
  }
}

export const admissionRepository = new AdmissionRepository(db);
