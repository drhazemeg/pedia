// src/lib/db/repositories/activity.repository.ts

import { db } from "@pedia/db";
import {
  appointments as AppointmentsTable,
  doctors as DoctorsTable,
  patients as PatientsTable,
} from "@pedia/db/schema";
import { feeForVisitType, statusToActivityStatus } from "@pedia/shared/patient";
import type {
  FindTodayActivityParams,
  PatientActivityRow,
} from "@pedia/shared/schemas/clinic/activity";
import { endOfDay, startOfDay } from "date-fns";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class ActivityRepository {
  /**
   * Return today's patient activity for a clinic: every appointment scheduled
   * for the given day, joined with the patient + provider, with derived
   * display fields the dashboard table expects.
   */
  async findToday(params: FindTodayActivityParams): Promise<{
    data: PatientActivityRow[];
    total: number;
  }> {
    const { clinicId, date = new Date(), limit = 20, offset = 0 } = params;

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const where = and(
      eq(PatientsTable.clinicId, clinicId),
      gte(AppointmentsTable.startTime, dayStart),
      lte(AppointmentsTable.startTime, dayEnd)
    );

    const rows = await db
      .select({
        id: AppointmentsTable.id,
        patientId: AppointmentsTable.patientId,
        firstName: PatientsTable.firstName,
        lastName: PatientsTable.lastName,
        mrn: PatientsTable.mrn,
        visitType: AppointmentsTable.type,
        status: AppointmentsTable.status,
        startTime: AppointmentsTable.startTime,
        providerName: DoctorsTable.specialization,
      })
      .from(AppointmentsTable)
      .innerJoin(
        PatientsTable,
        eq(PatientsTable.id, AppointmentsTable.patientId)
      )
      .leftJoin(DoctorsTable, eq(DoctorsTable.id, AppointmentsTable.doctorId))
      .where(where)
      .orderBy(AppointmentsTable.startTime)
      .limit(limit)
      .offset(offset);

    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(AppointmentsTable)
      .innerJoin(
        PatientsTable,
        eq(PatientsTable.id, AppointmentsTable.patientId)
      )
      .where(where);

    const data: PatientActivityRow[] = rows.map((row) => {
      return {
        id: row.id,
        patientId: row.patientId,
        patientName: `${row.firstName} ${row.lastName}`,
        mrn: row.mrn,
        avatarUrl: null,
        visitType: row.visitType,
        providerName: row.providerName ?? null,
        scheduledAt: row.startTime,
        amount: feeForVisitType(row.visitType),
        status: statusToActivityStatus(row.status),
        // TODO: replace with a real `paymentMethod` column once billing lands.
        paidBy: "insurance",
      };
    });

    return { data, total: Number(count) };
  }

  /** Compact schedule for the dashboard sidebar-style widget. */
  async findTodaySchedule(
    clinicId: string,
    date: Date = new Date(),
    limit = 4
  ): Promise<
    Array<{
      id: string;
      time: string;
      patientName: string;
      visitType: string;
      providerName: string | null;
    }>
  > {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const rows = await db
      .select({
        id: AppointmentsTable.id,
        startTime: AppointmentsTable.startTime,
        firstName: PatientsTable.firstName,
        lastName: PatientsTable.lastName,
        visitType: AppointmentsTable.type,
        providerName: DoctorsTable.specialization,
      })
      .from(AppointmentsTable)
      .innerJoin(
        PatientsTable,
        eq(PatientsTable.id, AppointmentsTable.patientId)
      )
      .leftJoin(DoctorsTable, eq(DoctorsTable.id, AppointmentsTable.doctorId))
      .where(
        and(
          eq(PatientsTable.clinicId, clinicId),
          gte(AppointmentsTable.startTime, dayStart),
          lte(AppointmentsTable.startTime, dayEnd)
        )
      )
      .orderBy(desc(AppointmentsTable.startTime))
      .limit(limit);

    return rows.map((row) => {
      return {
        id: row.id,
        time: new Date(row.startTime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        patientName: `${row.firstName} ${row.lastName}`,
        visitType: row.visitType,
        providerName: row.providerName ?? null,
      };
    });
  }
}

export const activityRepository = new ActivityRepository();
