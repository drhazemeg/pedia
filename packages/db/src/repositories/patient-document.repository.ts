// packages/db/src/repositories/patient-document.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { patientDocuments } from "@pedia/db/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

type PatientDocumentRow = InferSelectModel<typeof patientDocuments>;
type NewPatientDocumentRow = InferInsertModel<typeof patientDocuments>;

export class PatientDocumentRepository extends CrudRepository<PatientDocumentRow> {
  protected readonly table = patientDocuments;
  protected readonly idColumn: PgColumn = patientDocuments.id;
  protected readonly tableName = "patient_documents";

  async findByPatient(patientId: string): Promise<PatientDocumentRow[]> {
    const key = `patient:${patientId}:documents`;
    const cached = queryCache.get<PatientDocumentRow[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      eq(patientDocuments.patientId, patientId),
      {
        orderBy: sql`${patientDocuments.createdAt} DESC`,
      }
    );
    const result = rows as PatientDocumentRow[];
    queryCache.set(key, result, {
      ttl: 60_000,
      tags: [`patient:${patientId}:documents`],
    });
    return result;
  }

  async create(data: NewPatientDocumentRow): Promise<PatientDocumentRow> {
    const row = await this.createImpl(data as Record<string, unknown>);
    queryCache.invalidateTag(`patient:${data.patientId}:documents`);
    return row as PatientDocumentRow;
  }
}

export const patientDocumentRepository = new PatientDocumentRepository(db);
