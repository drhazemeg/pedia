// packages/db/src/repositories/patient.repository.ts

import { queryCache } from "@pedia/db/cache";
import { db } from "@pedia/db/index";
import {
  asUnknownArray,
  cacheKey,
  escapeLikePattern,
  isRecord,
} from "@pedia/db/repositories/_helper";
import type {
  ActiveStatus,
  LabStatus,
  PrescriptionStatus,
} from "@pedia/shared/constants/enums";
import type { SQL } from "drizzle-orm";
import { and, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  growthMeasurements,
  immunizations,
  patientAllergies,
  patientChronicConditions,
  patients,
} from "../schema";
import type {
  ChronicCondition,
  Encounter,
  GrowthMeasurement,
  Guardian,
  Immunization,
  LabOrder,
  NewPatient,
  Patient,
  PatientAllergy,
  Prescription,
  Staff,
} from "../schema/types";
import { CrudRepository, combineConditions } from "./base.repository";

// ============================================================
// Constants
// ============================================================

const CACHE_TTL_MS = 60_000;
const LIST_CACHE_TTL_MS = 30_000;

const AGE_GROUPS = [
  { label: "Neonate", minMonths: 0, maxMonths: 1 },
  { label: "Infant", minMonths: 1, maxMonths: 12 },
  { label: "Toddler", minMonths: 12, maxMonths: 36 },
  { label: "Preschooler", minMonths: 36, maxMonths: 72 },
  { label: "School Age", minMonths: 72, maxMonths: 144 },
  { label: "Adolescent", minMonths: 144, maxMonths: 216 },
] as const;

type AgeGroup = (typeof AGE_GROUPS)[number]["label"];
const AGE_GROUP_LABELS = new Set<string>(AGE_GROUPS.map((g) => g.label));

function isAgeGroup(value: string): value is AgeGroup {
  return AGE_GROUP_LABELS.has(value);
}

// ============================================================
// Types
// ============================================================

export type ClinicScope = { clinicId: string };

export type PatientWithRelations = Patient & {
  pediatrician: Staff | null;
  guardians: Guardian[];
  allergies: PatientAllergy[];
  chronicConditions: ChronicCondition[];
};

export type PatientWithPrimaryGuardian = Patient & {
  guardians: Guardian[];
};

export type SearchOptions = {
  activeStatus?: ActiveStatus;
  ageRange?: { min?: number; max?: number };
  gender?: "male" | "female";
  hasAllergies?: boolean;
  hasChronicConditions?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "firstName" | "lastName" | "createdAt" | "dateOfBirth";
  orderDirection?: "asc" | "desc";
  pediatricianId?: string;
  query?: string;
};

export type FindAllOptions = {
  activeStatus?: ActiveStatus;
  limit?: number;
  offset?: number;
};

export type PatientCountOptions = {
  activeStatus?: ActiveStatus;
};

export type PatientStats = {
  total: number;
  active: number;
  inactive: number;
  byGender: Record<"male" | "female", number>;
  byAgeGroup: Record<AgeGroup, number>;
  withAllergies: number;
  withChronicConditions: number;
};

// ============================================================
// Filter builder — single source of truth
// ============================================================

function buildPatientConditions(
  scope: ClinicScope | null,
  options: SearchOptions
): Array<SQL | undefined> {
  const conditions: Array<SQL | undefined> = [];

  if (scope) conditions.push(eq(patients.clinicId, scope.clinicId));

  if (options.query) {
    const pattern = `%${escapeLikePattern(options.query)}%`;
    conditions.push(
      or(
        ilike(patients.firstName, pattern),
        ilike(patients.lastName, pattern),
        ilike(patients.mrn, pattern)
      )
    );
  }

  if (options.gender) conditions.push(eq(patients.gender, options.gender));
  if (options.activeStatus) {
    conditions.push(eq(patients.activeStatus, options.activeStatus));
  }
  if (options.pediatricianId) {
    conditions.push(eq(patients.pediatricianId, options.pediatricianId));
  }

  if (options.ageRange) {
    const now = new Date();
    if (options.ageRange.max !== undefined) {
      const minDob = new Date();
      minDob.setFullYear(now.getFullYear() - options.ageRange.max - 1);
      minDob.setDate(minDob.getDate() + 1);
      conditions.push(gte(patients.dateOfBirth, minDob.toISOString()));
    }
    if (options.ageRange.min !== undefined) {
      const maxDob = new Date();
      maxDob.setFullYear(now.getFullYear() - options.ageRange.min);
      conditions.push(lte(patients.dateOfBirth, maxDob.toISOString()));
    }
  }

  return conditions;
}

function orderColumnFor(
  orderBy: NonNullable<SearchOptions["orderBy"]>
): PgColumn {
  switch (orderBy) {
    case "firstName":
      return patients.firstName;
    case "lastName":
      return patients.lastName;
    case "createdAt":
      return patients.createdAt;
    case "dateOfBirth":
      return patients.dateOfBirth;
    default:
      return patients.lastName;
  }
}

// ============================================================
// Repository
// ============================================================

export class PatientRepository extends CrudRepository<Patient> {
  protected readonly table = patients;
  protected readonly idColumn: PgColumn = patients.id;
  protected readonly tableName = "patients";

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  async findByIdInClinic(
    id: string,
    scope: ClinicScope
  ): Promise<PatientWithRelations | null> {
    const key = `${cacheKey("patient", scope, id)}:full`;
    const cached = queryCache.get<PatientWithRelations>(key);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId)),
      with: {
        pediatrician: true,
        guardians: true,
        patientAllergies: true,
        chronicConditions: true,
      },
    });

    if (!isRecord(row)) return null;

    const allergiesRaw = row.patientAllergies;
    const allergies: PatientAllergy[] = Array.isArray(allergiesRaw)
      ? (allergiesRaw as PatientAllergy[])
      : [];

    const baseRecord = { ...row };
    delete (baseRecord as Record<string, unknown>).patientAllergies;

    const patient: PatientWithRelations = {
      ...(baseRecord as Patient),
      pediatrician:
        row.pediatrician && typeof row.pediatrician === "object"
          ? (row.pediatrician as Staff)
          : null,
      guardians: Array.isArray(row.guardians)
        ? (row.guardians as Guardian[])
        : [],
      allergies,
      chronicConditions: Array.isArray(row.chronicConditions)
        ? (row.chronicConditions as ChronicCondition[])
        : [],
    };

    queryCache.set(key, patient, {
      ttl: CACHE_TTL_MS,
      tags: [`patient:${id}`],
    });

    return patient;
  }

  async findByMrn(
    mrn: string,
    scope: ClinicScope
  ): Promise<PatientWithRelations | null> {
    const key = cacheKey("patient:mrn", scope, mrn);
    const cached = queryCache.get<PatientWithRelations>(key);
    if (cached) return cached;

    const query = this.getQueryBuilder();
    const row: unknown = await query.findFirst({
      where: and(eq(patients.mrn, mrn), eq(patients.clinicId, scope.clinicId)),
      with: {
        pediatrician: true,
        guardians: true,
        patientAllergies: true,
        chronicConditions: true,
      },
    });

    if (!isRecord(row)) return null;

    const allergiesRaw = row.patientAllergies;
    const allergies: PatientAllergy[] = Array.isArray(allergiesRaw)
      ? (allergiesRaw as PatientAllergy[])
      : [];

    const baseRecord = { ...row };
    delete (baseRecord as Record<string, unknown>).patientAllergies;

    const patient: PatientWithRelations = {
      ...(baseRecord as Patient),
      pediatrician:
        row.pediatrician && typeof row.pediatrician === "object"
          ? (row.pediatrician as Staff)
          : null,
      guardians: Array.isArray(row.guardians)
        ? (row.guardians as Guardian[])
        : [],
      allergies,
      chronicConditions: Array.isArray(row.chronicConditions)
        ? (row.chronicConditions as ChronicCondition[])
        : [],
    };

    queryCache.set(key, patient, {
      ttl: CACHE_TTL_MS,
      tags: [`patient:${patient.id}`],
    });

    return patient;
  }

  async getPatientFullData(
    id: string,
    scope: ClinicScope
  ): Promise<{
    patient: PatientWithRelations;
    encounters: Array<Encounter & { provider: Staff }>;
    growthMeasurements: GrowthMeasurement[];
    immunizations: Immunization[];
    prescriptions: Array<
      Prescription & { prescriber: Staff; encounter: Encounter | null }
    >;
    labOrders: Array<LabOrder & { encounter: Encounter | null }>;
  } | null> {
    const patient = await this.findByIdInClinic(id, scope);
    if (!patient) return null;

    const [encounters, measurements, vaccines, prescriptions, labOrders] =
      await Promise.all([
        this.getEncounters(id),
        this.getGrowthMeasurements(id),
        this.getImmunizations(id),
        this.getPrescriptions(id),
        this.getLabOrders(id),
      ]);

    return {
      patient,
      encounters,
      growthMeasurements: measurements,
      immunizations: vaccines,
      prescriptions,
      labOrders,
    };
  }

  async search(
    scope: ClinicScope,
    options: SearchOptions = {}
  ): Promise<{ data: PatientWithPrimaryGuardian[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      hasAllergies,
      hasChronicConditions,
      orderBy = "lastName",
      orderDirection = "asc",
    } = options;

    const key = `${cacheKey("patient:search", scope)}:${JSON.stringify({
      ...options,
      limit,
      offset,
      orderBy,
      orderDirection,
    })}`;

    const cached = queryCache.get<{
      data: PatientWithPrimaryGuardian[];
      total: number;
    }>(key);
    if (cached) return cached;

    const where = combineConditions(buildPatientConditions(scope, options));

    const orderCol = orderColumnFor(orderBy);
    const orderExpr =
      orderDirection === "desc" ? sql`${orderCol} DESC` : sql`${orderCol} ASC`;

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: orderExpr,
        with: { guardians: { where: { isPrimary: true } } },
      }),
      this.count(where),
    ]);

    let data = rows as PatientWithPrimaryGuardian[];

    if (hasAllergies && data.length > 0) {
      const ids = data.map((p) => p.id);
      const allergyRows = await this.db
        .select({ patientId: patientAllergies.patientId })
        .from(patientAllergies)
        .where(inArray(patientAllergies.patientId, ids))
        .groupBy(patientAllergies.patientId);
      const present = new Set(allergyRows.map((r) => r.patientId));
      data = data.filter((p) => present.has(p.id));
    }

    if (hasChronicConditions && data.length > 0) {
      const ids = data.map((p) => p.id);
      const conditionRows = await this.db
        .select({ patientId: patientChronicConditions.patientId })
        .from(patientChronicConditions)
        .where(inArray(patientChronicConditions.patientId, ids))
        .groupBy(patientChronicConditions.patientId);
      const present = new Set(conditionRows.map((r) => r.patientId));
      data = data.filter((p) => present.has(p.id));
    }

    const result = { data, total };

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: ["patients:list"],
    });

    return result;
  }

  async findAll(
    scope: ClinicScope,
    options: FindAllOptions = {}
  ): Promise<{ data: PatientWithPrimaryGuardian[]; total: number }> {
    const { limit = 50, offset = 0, activeStatus } = options;
    const key = cacheKey("patient:all", scope, options);

    const cached = queryCache.get<{
      data: PatientWithPrimaryGuardian[];
      total: number;
    }>(key);
    if (cached) return cached;

    const conditions: Array<SQL | undefined> = [
      eq(patients.clinicId, scope.clinicId),
    ];
    if (activeStatus) {
      conditions.push(eq(patients.activeStatus, activeStatus));
    }
    const where = combineConditions(conditions);

    const [rows, total] = await Promise.all([
      this.findManyImpl(where, {
        limit,
        offset,
        orderBy: sql`${patients.lastName} ASC`,
        with: { guardians: { where: { isPrimary: true } } },
      }),
      this.count(where),
    ]);

    const result = {
      data: rows as PatientWithPrimaryGuardian[],
      total,
    };

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: ["patients:all"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Sub-resource reads
  // --------------------------------------------------------------------------

  async getEncounters(
    patientId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Array<Encounter & { provider: Staff }>> {
    const { limit = 50, offset = 0 } = options;
    const key = `patient:${patientId}:encounters:${limit}:${offset}`;

    const cached = queryCache.get<Array<Encounter & { provider: Staff }>>(key);
    if (cached) return cached;

    const rows: unknown = await this.db.query.encounters.findMany({
      where: { patientId },
      limit,
      offset,
      // `encounters` has no `startedAt` column. The timeline column is
      // `encounterDate` — see `packages/db/src/schema/clinic.ts`.
      orderBy: { encounterDate: "desc" },
      with: { provider: true },
    });

    const arr = asUnknownArray(rows) ?? [];
    const result = arr.filter(isRecord) as Array<
      Encounter & { provider: Staff }
    >;

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:encounters`],
    });

    return result;
  }

  async getGrowthMeasurements(patientId: string): Promise<GrowthMeasurement[]> {
    const key = `patient:${patientId}:growth`;
    const cached = queryCache.get<GrowthMeasurement[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      eq(growthMeasurements.patientId, patientId),
      { orderBy: sql`${growthMeasurements.ageMonths} ASC` }
    );
    const result = rows as GrowthMeasurement[];

    queryCache.set(key, result, {
      ttl: CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:growth`],
    });

    return result;
  }

  async getImmunizations(patientId: string): Promise<Immunization[]> {
    const key = `patient:${patientId}:immunizations`;
    const cached = queryCache.get<Immunization[]>(key);
    if (cached) return cached;

    const rows = await this.findManyImpl(
      eq(immunizations.patientId, patientId),
      { orderBy: sql`${immunizations.recommendedAgeMonths} ASC` }
    );
    const result = rows as Immunization[];

    queryCache.set(key, result, {
      ttl: CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:immunizations`],
    });

    return result;
  }

  async getPrescriptions(
    patientId: string,
    status?: PrescriptionStatus
  ): Promise<
    Array<
      Prescription & {
        prescriber: Staff;
        encounter: Encounter | null;
      }
    >
  > {
    const key = `patient:${patientId}:prescriptions:${status ?? "all"}`;
    const cached = queryCache.get<
      Array<
        Prescription & {
          prescriber: Staff;
          encounter: Encounter | null;
        }
      >
    >(key);
    if (cached) return cached;

    const rows: unknown = await this.db.query.prescriptions.findMany({
      where: status ? { patientId, status } : { patientId },
      orderBy: { createdAt: "desc" },
      with: { prescriber: true, encounter: true },
    });

    const arr = asUnknownArray(rows) ?? [];
    const result = arr.filter(isRecord) as Array<
      Prescription & { prescriber: Staff; encounter: Encounter | null }
    >;

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:prescriptions`],
    });

    return result;
  }

  async getLabOrders(
    patientId: string,
    status?: LabStatus
  ): Promise<Array<LabOrder & { encounter: Encounter | null }>> {
    const key = `patient:${patientId}:labs:${status ?? "all"}`;
    const cached =
      queryCache.get<Array<LabOrder & { encounter: Encounter | null }>>(key);
    if (cached) return cached;

    const rows: unknown = await this.db.query.labOrders.findMany({
      where: status ? { patientId, status } : { patientId },
      orderBy: { createdAt: "desc" },
      with: { encounter: true },
    });

    const arr = asUnknownArray(rows) ?? [];
    const result = arr.filter(isRecord) as Array<
      LabOrder & { encounter: Encounter | null }
    >;

    queryCache.set(key, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${patientId}`, `patient:${patientId}:labs`],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Counts & stats
  // --------------------------------------------------------------------------

  async countForClinic(
    scope: ClinicScope,
    options: PatientCountOptions = {}
  ): Promise<number> {
    const key = cacheKey("patient:count", scope, options);
    const cached = queryCache.get<number>(key);
    if (cached !== null) return cached;

    const conditions: Array<SQL | undefined> = [
      eq(patients.clinicId, scope.clinicId),
    ];
    if (options.activeStatus) {
      conditions.push(eq(patients.activeStatus, options.activeStatus));
    }

    const value = await this.count(combineConditions(conditions));

    queryCache.set(key, value, {
      ttl: CACHE_TTL_MS,
      tags: ["patient:count"],
    });

    return value;
  }

  async getStats(scope: ClinicScope): Promise<PatientStats> {
    const key = cacheKey("patient:stats", scope);
    const cached = queryCache.get<PatientStats>(key);
    if (cached) return cached;

    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        // Title Case to match the `active_status` pgEnum members.
        active: sql<number>`count(*) filter (where ${patients.activeStatus} = 'active')::int`,
        inactive: sql<number>`count(*) filter (where ${patients.activeStatus} = 'inactive')::int`,
        male: sql<number>`count(*) filter (where ${patients.gender} = 'male')::int`,
        female: sql<number>`count(*) filter (where ${patients.gender} = 'female')::int`,
        withAllergies: sql<number>`count(*) filter (where exists (
					select 1 from ${patientAllergies}
					where ${patientAllergies.patientId} = ${patients.id}
				))::int`,
        withChronicConditions: sql<number>`count(*) filter (where exists (
					select 1 from ${patientChronicConditions}
					where ${patientChronicConditions.patientId} = ${patients.id}
				))::int`,
      })
      .from(patients)
      .where(eq(patients.clinicId, scope.clinicId));

    const ageRows = await this.db
      .select({
        bucket: sql<string>`
					case
						when ${patients.dateOfBirth} > now() - interval '1 month' then 'Neonate'
						when ${patients.dateOfBirth} > now() - interval '12 months' then 'Infant'
						when ${patients.dateOfBirth} > now() - interval '36 months' then 'Toddler'
						when ${patients.dateOfBirth} > now() - interval '72 months' then 'Preschooler'
						when ${patients.dateOfBirth} > now() - interval '144 months' then 'School Age'
						else 'Adolescent'
					end
				`,
        count: sql<number>`count(*)::int`,
      })
      .from(patients)
      .where(eq(patients.clinicId, scope.clinicId))
      .groupBy(sql`1`);

    const byAgeGroupTyped: Record<AgeGroup, number> = {
      Neonate: 0,
      Infant: 0,
      Toddler: 0,
      Preschooler: 0,
      "School Age": 0,
      Adolescent: 0,
    };

    for (const ageRow of ageRows) {
      if (!isAgeGroup(ageRow.bucket)) {
        throw new Error(
          `patient.getStats: unknown age bucket "${ageRow.bucket}" — ` +
            "AGE_GROUPS and the SQL CASE must be kept in sync."
        );
      }
      byAgeGroupTyped[ageRow.bucket] = ageRow.count;
    }

    const result: PatientStats = {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      inactive: row?.inactive ?? 0,
      byGender: { male: row?.male ?? 0, female: row?.female ?? 0 },
      byAgeGroup: byAgeGroupTyped,
      withAllergies: row?.withAllergies ?? 0,
      withChronicConditions: row?.withChronicConditions ?? 0,
    };

    queryCache.set(key, result, {
      ttl: CACHE_TTL_MS,
      tags: ["patient:stats"],
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async createInClinic(scope: ClinicScope, data: NewPatient): Promise<Patient> {
    const [created] = await this.db
      .insert(patients)
      .values({ ...data, clinicId: scope.clinicId })
      .returning();

    if (!created) throw new Error("Failed to create patient");

    this.invalidatePatientCaches(created.id);
    queryCache.invalidateTag("patients:list");
    queryCache.invalidateTag("patients:all");
    queryCache.invalidateTag("patient:count");
    queryCache.invalidateTag("patient:stats");

    return created;
  }

  async updateInClinic(
    id: string,
    scope: ClinicScope,
    data: Partial<NewPatient>
  ): Promise<Patient | null> {
    const [updated] = await this.db
      .update(patients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId)))
      .returning();

    if (!updated) return null;

    this.invalidatePatientCaches(id);
    queryCache.invalidateTag("patients:list");
    queryCache.invalidateTag("patients:all");
    queryCache.invalidateTag("patient:count");
    queryCache.invalidateTag("patient:stats");

    return updated;
  }

  async mergePatients(
    targetId: string,
    sourceId: string,
    scope: ClinicScope
  ): Promise<Patient | null> {
    if (targetId === sourceId) {
      throw new Error("Cannot merge a patient into itself");
    }

    const merged = await this.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(patients)
        .where(
          and(eq(patients.id, targetId), eq(patients.clinicId, scope.clinicId))
        )
        .limit(1);
      const [source] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(eq(patients.id, sourceId), eq(patients.clinicId, scope.clinicId))
        )
        .limit(1);
      if (!target || !source) return null;

      // Reassign dependent records before deleting the duplicate patient.
      await tx
        .update(growthMeasurements)
        .set({ patientId: targetId })
        .where(eq(growthMeasurements.patientId, sourceId));
      await tx
        .update(immunizations)
        .set({ patientId: targetId })
        .where(eq(immunizations.patientId, sourceId));
      await tx
        .update(patientAllergies)
        .set({ patientId: targetId })
        .where(eq(patientAllergies.patientId, sourceId));
      await tx
        .update(patientChronicConditions)
        .set({ patientId: targetId })
        .where(eq(patientChronicConditions.patientId, sourceId));

      const [deleted] = await tx
        .delete(patients)
        .where(
          and(eq(patients.id, sourceId), eq(patients.clinicId, scope.clinicId))
        )
        .returning({ id: patients.id });
      return deleted ? target : null;
    });

    if (!merged) return null;
    this.invalidatePatientCaches(targetId);
    this.invalidatePatientCaches(sourceId);
    queryCache.invalidateTag("patients:list");
    queryCache.invalidateTag("patients:all");
    queryCache.invalidateTag("patient:count");
    queryCache.invalidateTag("patient:stats");
    return merged;
  }

  // --------------------------------------------------------------------------
  // Cache invalidation
  // --------------------------------------------------------------------------

  private invalidatePatientCaches(patientId: string): void {
    queryCache.invalidate(`patient:${patientId}`);
    queryCache.invalidatePrefix(`patient:${patientId}:`);
    queryCache.invalidatePrefix(`patient:${patientId}:mrn:`);
  }

  async getPatientEncounters(
    id: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Array<Encounter & { provider: Staff | null }>> {
    const { limit = 50, offset = 0 } = options;
    const cacheKey = `patient:${id}:encounters:${limit}:${offset}`;
    const cached =
      queryCache.get<Array<Encounter & { provider: Staff | null }>>(cacheKey);
    if (cached) return cached;

    const result = await this.getEncounters(id, { limit, offset });
    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL_MS,
      tags: [`patient:${id}`, `patient:${id}:encounters`],
    });

    return result;
  }

  async getPatientGrowthData(id: string): Promise<GrowthMeasurement[]> {
    const cacheKey = `patient:${id}:growth`;
    const cached = queryCache.get<GrowthMeasurement[]>(cacheKey);
    if (cached) return cached;

    const result = await this.getGrowthMeasurements(id);
    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [`patient:${id}`, `patient:${id}:growth`],
    });

    return result;
  }

  async getPatientPrescriptions(
    id: string,
    status?: PrescriptionStatus
  ): Promise<
    Array<
      Prescription & {
        prescriber: Staff | null;
        encounter: Encounter | null;
      }
    >
  > {
    const cacheKey = `patient:${id}:prescriptions:${status || "all"}`;
    const cached = queryCache.get<
      Array<
        Prescription & {
          prescriber: Staff | null;
          encounter: Encounter | null;
        }
      >
    >(cacheKey);
    if (cached) return cached;

    const where = {
      patientId: id,
      ...(status ? { status } : {}),
    };

    const result = await db.query.prescriptions.findMany({
      where,
      orderBy: { createdAt: "desc" },
      with: {
        prescriber: true,
        encounter: true,
      },
    });

    queryCache.set(cacheKey, result, {
      ttl: 30_000,
      tags: [`patient:${id}`, `patient:${id}:prescriptions`],
    });

    return result;
  }

  async getPatientLabOrders(
    id: string,
    status?: LabStatus
  ): Promise<Array<LabOrder & { provider: Staff | null }>> {
    const cacheKey = `patient:${id}:lab-orders:${status || "all"}`;
    const cached =
      queryCache.get<Array<LabOrder & { provider: Staff | null }>>(cacheKey);
    if (cached) return cached;

    const where = {
      patientId: id,
      ...(status ? { status } : {}),
    };

    const result = await db.query.labOrders.findMany({
      where,
      orderBy: { createdAt: "desc" },
      with: {
        provider: true,
      },
    });

    queryCache.set(cacheKey, result, {
      ttl: 30_000,
      tags: [`patient:${id}`, `patient:${id}:lab-orders`],
    });

    return result;
  }
}

export const patientRepository = new PatientRepository(db);
