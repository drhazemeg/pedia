// packages/db/src/repositories/doctor.repository.ts
import { db } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import type { staff } from "@pedia/db/schema";
import { doctors } from "@pedia/db/schema";
import type { Doctor, NewDoctor } from "@pedia/db/schema/types";
import { eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { CrudRepository } from "./base.repository";

type DoctorWithStaff = Doctor & { staff: typeof staff.$inferSelect };

export class DoctorRepository extends CrudRepository<Doctor> {
  protected readonly table = doctors;
  protected readonly idColumn: PgColumn = doctors.id;
  protected readonly tableName = "doctors";

  async findByIdWithStaff(id: string): Promise<DoctorWithStaff | null> {
    const key = `doctor:${id}:full`;
    const cached = queryCache.get<DoctorWithStaff>(key);
    if (cached) return cached;

    const row = await db.query.doctors.findFirst({
      where: { id },
      with: { staff: true },
    });
    if (!row) return null;

    const result = row as DoctorWithStaff;
    queryCache.set(key, result, { ttl: 60_000, tags: [`doctor:${id}`] });
    return result;
  }

  async findByStaffId(staffId: string): Promise<Doctor | null> {
    const key = `doctor:staff:${staffId}`;
    const cached = queryCache.get<Doctor>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(eq(doctors.staffId, staffId), {
      limit: 1,
    });
    const row = rows[0];
    if (!row) return null;
    const result = this.asRow(row);
    queryCache.set(key, result, {
      ttl: 60_000,
      tags: [`doctor:${result.id}`],
    });
    return result;
  }

  async findByDepartment(departmentId: string): Promise<Doctor[]> {
    const rows = await this.findManyImpl(
      eq(doctors.departmentId, departmentId),
      {
        orderBy: sql`${doctors.specialization} ASC`,
      }
    );
    return this.asRows(rows);
  }

  async listActive(): Promise<Doctor[]> {
    const rows = await this.findManyImpl(eq(doctors.isActive, true), {
      orderBy: sql`${doctors.specialization} ASC`,
    });
    return this.asRows(rows);
  }

  async create(data: NewDoctor): Promise<Doctor> {
    const row = await this.createImpl(data as Record<string, unknown>);
    return this.asRow(row);
  }
}

export const doctorRepository = new DoctorRepository(db);
