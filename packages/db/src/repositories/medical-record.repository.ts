// packages/db/src/repositories/medical-record.repository.ts
import { db } from "@pedia/db";
import {
  medicalRecords,
  type MedicalRecordStatus,
  type MedicalRecordType,
} from "@pedia/db/schema";
import type { MedicalRecord } from "@pedia/db/schema/types";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

export class MedicalRecordRepository extends CrudRepository<MedicalRecord> {
  protected readonly table = medicalRecords;
  protected readonly idColumn: PgColumn = medicalRecords.id;
  protected readonly tableName = "medical_records";

  async findByPatient(
    patientId: string,
    options: {
      recordType?: MedicalRecordType;
      status?: MedicalRecordStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: MedicalRecord[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const conditions = [eq(medicalRecords.patientId, patientId)];
    if (options.recordType)
      conditions.push(eq(medicalRecords.recordType, options.recordType));
    if (options.status)
      conditions.push(eq(medicalRecords.status, options.status));
    const where = and(...conditions);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${medicalRecords.createdAt} DESC`,
      }),
      this.count(where),
    ]);

    return { data: rows as MedicalRecord[], total };
  }

  async findByEncounter(encounterId: string): Promise<MedicalRecord[]> {
    const rows = await this.findManyImpl(
      eq(medicalRecords.encounterId, encounterId),
      {
        orderBy: sql`${medicalRecords.createdAt} DESC`,
      }
    );
    return rows as MedicalRecord[];
  }
}

export const medicalRecordRepository = new MedicalRecordRepository(db);
