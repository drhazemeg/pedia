// packages/api/src/keys.ts (or packages/tanstack/src/query/keys.ts)

import type {
  AppointmentStatus,
  EncounterStatus,
  LabStatus,
  Role,
  VisitType,
} from "@pedia/db/schema/enums";

import { STALE_TIMES } from "./config";

// ============================================================
// Stale-time metadata
// ============================================================

export const QUERY_METADATA = {
  patients: {
    defaultStaleTime: STALE_TIMES.DEFAULT,
    detailStaleTime: STALE_TIMES.DETAIL,
  },
  appointments: {
    defaultStaleTime: STALE_TIMES.DEFAULT,
    detailStaleTime: STALE_TIMES.DETAIL,
    realTimeStaleTime: STALE_TIMES.REAL_TIME,
  },
  growth: {
    defaultStaleTime: STALE_TIMES.DEFAULT,
    staticReferenceStaleTime: STALE_TIMES.STATIC_REFERENCE,
  },
} as const;

// ============================================================
// Filter types
// ============================================================

export interface PatientListFilters {
  // ✅ Matches ACTIVE_STATUSES in @pedia/shared/constants/enums
  activeStatus?: "active" | "inactive" | "resolved";
  clinicId?: string;
  dateOfBirth?: string;
  limit?: number;
  mrn?: string;
  page?: number;
  parentName?: string;
  q?: string;
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface EncounterListFilters {
  endDate?: Date;
  limit?: number;
  page?: number;
  patientId?: string;
  providerId?: string;
  startDate?: Date;
  status?: EncounterStatus;
  visitType?: VisitType;
}

export interface AppointmentListFilters {
  clinicId?: string;
  date?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  page?: number;
  patientId?: string;
  staffId?: string;
  startDate?: Date;
  status?: AppointmentStatus;
}

export interface StaffListFilters {
  clinicId?: string;
  department?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
  q?: string;
  role?: Role;
  specialty?: string;
}

export interface VitalListFilters {
  encounterId?: string;
  endDate?: Date;
  limit?: number;
  offset?: number;
  page?: number;
  patientId?: string;
  startDate?: Date;
}

export interface LabListFilters {
  clinicId?: string;
  encounterId?: string;
  limit?: number;
  orderDateFrom?: Date;
  orderDateTo?: Date;
  page?: number;
  patientId?: string;
  priority?: string;
  status?: LabStatus;
}

export interface ImmunizationListFilters {
  dueDateFrom?: Date;
  dueDateTo?: Date;
  limit?: number;
  page?: number;
  patientId?: string;
  status?: string;
  vaccineCode?: string;
}

export interface PrescriptionListFilters {
  clinicId?: string;
  limit?: number;
  page?: number;
  patientId?: string;
  prescribedDateFrom?: Date;
  prescribedDateTo?: Date;
  query?: string;
  status?: string;
}

// ============================================================
// Query keys
// ============================================================

export const queryKeys = {
  // ─── Auth ───────────────────────────────────────────────
  auth: {
    all: ["auth"] as const,
    session: () => ["auth", "session"] as const,
    user: (id: string) => ["auth", "user", id] as const,
    users: {
      all: ["auth", "users"] as const,
      lists: () => ["auth", "users", "list"] as const,
      list: (filters?: {
        page?: number;
        limit?: number;
        role?: Role;
        q?: string;
      }) => ["auth", "users", "list", filters] as const,
      detail: (id: string) => ["auth", "users", "detail", id] as const,
    },
  },

  // ─── Patients ───────────────────────────────────────────
  patients: {
    all: ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    infinite: (options: { filters?: PatientListFilters; limit: number }) =>
      [...queryKeys.patients.lists(), "infinite", options] as const,
    list: (query?: string, filters?: PatientListFilters) =>
      ["patients", "list", filters, query] as const,
    details: () => ["patients", "detail"] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
    full: (id: string) => ["patients", "full", id] as const,
    mrn: (mrn: string) => ["patients", "mrn", mrn] as const,
    stats: () => ["patients", "stats"] as const,
    encounters: (id: string, options?: { limit?: number; offset?: number }) =>
      ["patients", "encounters", id, options] as const,
    growth: (id: string) => ["patients", "growth", id] as const,
    immunizations: (id: string) => ["patients", "immunizations", id] as const,
    prescriptions: (id: string, status?: string) =>
      ["patients", "prescriptions", id, status] as const,
    labOrders: (id: string, status?: string) =>
      ["patients", "labOrders", id, status] as const,
    vitals: (id: string, limit?: number) =>
      ["patients", "vitals", id, limit] as const,
    count: (filters?: PatientListFilters) =>
      ["patients", "count", filters] as const,
    search: (query: string, limit?: number) =>
      ["patients", "search", query, limit] as const,
    guardians: (id: string) => ["patients", "guardians", id] as const,
    allergies: (id: string) => ["patients", "allergies", id] as const,
    conditions: (id: string) => ["patients", "conditions", id] as const,
  },

  // ─── Appointments ───────────────────────────────────────
  appointments: {
    all: ["appointments"] as const,
    lists: () => ["appointments", "list"] as const,
    list: (filters?: AppointmentListFilters) =>
      ["appointments", "list", filters] as const,
    details: () => ["appointments", "detail"] as const,
    detail: (id: string) => ["appointments", "detail", id] as const,
    available: (params: {
      date: string;
      staffId?: string;
      duration?: number;
    }) => ["appointments", "available", params] as const,
    patient: (id: string) => ["appointments", "patient", id] as const,
    staff: (id: string) => ["appointments", "staff", id] as const,
    clinic: (id: string) => ["appointments", "clinic", id] as const,
    today: (clinicId?: string) => ["appointments", "today", clinicId] as const,
    stats: () => ["appointments", "stats"] as const,
    upcoming: (patientId: string) =>
      ["appointments", "upcoming", patientId] as const,
  },

  // ─── Encounters ─────────────────────────────────────────
  encounters: {
    all: ["encounters"] as const,
    lists: () => ["encounters", "list"] as const,
    list: (params?: {
      patientId?: string;
      providerId?: string;
      visitType?: VisitType;
      startDate?: Date;
      endDate?: Date;
      status?: EncounterStatus;
      page?: number;
      limit?: number;
    }) => ["encounters", "list", params] as const,
    search: (params: {
      query?: string;
      patientId?: string;
      limit?: number;
      offset?: number;
      visitType?: VisitType;
      providerId?: string;
      status?: "Draft" | "Completed" | "Signed" | "Amended";
      startDate?: Date;
      endDate?: Date;
    }) => ["encounters", "search", params] as const,
    details: () => ["encounters", "detail"] as const,
    detail: (id: string) => ["encounters", "detail", id] as const,
    byAppointment: (id: string) => ["encounters", "byAppointment", id] as const,
    vitals: (id: string) => ["encounters", "vitals", id] as const,
    diagnoses: (id: string) => ["encounters", "diagnoses", id] as const,
    treatment: (id: string) => ["encounters", "treatment", id] as const,
    stats: () => ["encounters", "stats"] as const,
  },

  // ─── Vitals ─────────────────────────────────────────────
  vitals: {
    all: ["vitals"] as const,
    lists: () => ["vitals", "list"] as const,
    list: (params?: {
      patientId?: string;
      encounterId?: string;
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }) => ["vitals", "list", params] as const,
    details: () => ["vitals", "detail"] as const,
    detail: (id: string) => ["vitals", "detail", id] as const,
    patient: (patientId: string, limit?: number) =>
      ["vitals", "patient", patientId, limit] as const,
    encounter: (encounterId: string) =>
      ["vitals", "encounter", encounterId] as const,
    abnormal: (patientId: string, limit?: number) =>
      ["vitals", "abnormal", patientId, limit] as const,
    latest: (patientId: string) => ["vitals", "latest", patientId] as const,
    percentiles: (patientId: string) =>
      ["vitals", "percentiles", patientId] as const,
    dateRange: (
      patientId: string,
      startDate: Date,
      endDate: Date,
      options?: { limit?: number }
    ) =>
      [
        ...queryKeys.vitals.all,
        "dateRange",
        patientId,
        startDate.toISOString(),
        endDate.toISOString(),
        options,
      ] as const,
    count: (filters?: {
      patientId?: string;
      startDate?: Date;
      endDate?: Date;
    }) => [...queryKeys.vitals.all, "count", filters] as const,
  },

  // ─── Growth ─────────────────────────────────────────────
  growth: {
    all: ["growth"] as const,
    lists: () => ["growth", "list"] as const,
    list: (params: {
      patientId: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }) => ["growth", "list", params] as const,
    latest: (patientId: string) =>
      [...queryKeys.growth.all, "latest", patientId] as const,
    details: () => ["growth", "detail"] as const,
    detail: (id: string) => ["growth", "detail", id] as const,
    percentiles: (patientId: string) =>
      ["growth", "percentiles", patientId] as const,
    velocity: (params: {
      patientId: string;
      fromDate: string;
      toDate: string;
    }) => ["growth", "velocity", params] as const,
    stats: (params?: { patientId?: string }) =>
      ["growth", "stats", params] as const,
    chart: (params: {
      patientId: string;
      metricType: string;
      startAgeMonths?: number;
      endAgeMonths?: number;
      includePercentiles?: boolean;
    }) => ["growth", "chart", params] as const,
    who: (params: {
      gender: string;
      metricType: string;
      ageMonths?: number[];
      ageRange?: boolean;
    }) => ["growth", "who", params] as const,
  },

  // ─── Immunizations ──────────────────────────────────────
  immunizations: {
    all: ["immunizations"] as const,
    count: (filters?: { patientId?: string; status?: string }) =>
      [...queryKeys.immunizations.all, "count", filters] as const,
    lists: () => ["immunizations", "list"] as const,
    list: (params?: {
      patientId?: string;
      vaccineCode?: string;
      status?: string;
      dueDateFrom?: string;
      dueDateTo?: string;
      page?: number;
      limit?: number;
    }) => ["immunizations", "list", params] as const,
    details: () => ["immunizations", "detail"] as const,
    compliance: (patientId: string) =>
      ["immunizations", "compliance", patientId] as const,
    detail: (id: string) => ["immunizations", "detail", id] as const,
    status: (patientId: string) =>
      ["immunizations", "status", patientId] as const,
    schedule: (patientId: string) =>
      ["immunizations", "schedule", patientId] as const,
    upcoming: (patientId: string) =>
      ["immunizations", "upcoming", patientId] as const,
    due: (patientId: string) => ["immunizations", "due", patientId] as const,
    overdue: (patientId: string) =>
      ["immunizations", "overdue", patientId] as const,
    administered: (patientId: string) =>
      ["immunizations", "administered", patientId] as const,
  },

  // ─── Labs ───────────────────────────────────────────────
  labs: {
    all: ["labs"] as const,
    lists: () => ["labs", "list"] as const,
    list: (params?: {
      patientId?: string;
      status?: LabStatus;
      priority?: string;
      orderDateFrom?: Date;
      orderDateTo?: Date;
      page?: number;
      limit?: number;
    }) => ["labs", "list", params] as const,
    details: () => ["labs", "detail"] as const,
    detail: (id: string) => ["labs", "detail", id] as const,
    results: (id: string) => ["labs", "results", id] as const,
    stats: () => ["labs", "stats"] as const,
    abnormal: (patientId: string) => ["labs", "abnormal", patientId] as const,
    pending: (patientId?: string) => ["labs", "pending", patientId] as const,
    patient: (id: string) => ["labs", "patient", id] as const,
    history: (patientId: string, status?: string) =>
      ["labs", "history", patientId, status] as const,
    types: () => ["labs", "types"] as const,
  },

  // ─── Prescriptions ──────────────────────────────────────
  prescriptions: {
    all: ["prescriptions"] as const,
    lists: () => ["prescriptions", "list"] as const,
    list: (params?: {
      patientId?: string;
      status?: string;
      prescribedDateFrom?: Date;
      prescribedDateTo?: Date;
      page?: number;
      limit?: number;
    }) => ["prescriptions", "list", params] as const,
    stats: () => ["prescriptions", "stats"] as const,
    details: () => ["prescriptions", "detail"] as const,
    detail: (id: string) => ["prescriptions", "detail", id] as const,
    patient: (id: string) => ["prescriptions", "patient", id] as const,
    active: (patientId: string) =>
      ["prescriptions", "active", patientId] as const,
    history: (patientId: string) =>
      ["prescriptions", "history", patientId] as const,
  },

  // ─── Staff ──────────────────────────────────────────────
  staff: {
    all: ["staff"] as const,
    lists: () => ["staff", "list"] as const,
    list: (filters: {
      limit?: number;
      offset?: number;
      role?: Role;
      isActive?: boolean;
      search?: string;
      orderBy?: "name" | "createdAt";
      orderDirection?: "asc" | "desc";
    }) => ["staff", "list", filters] as const,
    details: () => ["staff", "detail"] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
    email: (email: string) => ["staff", "email", email] as const,
    active: () => ["staff", "active"] as const,
    role: (role: Role) => ["staff", "role", role] as const,
    withPatients: (id: string) => ["staff", "withPatients", id] as const,
    withEncounters: (id: string) => ["staff", "withEncounters", id] as const,
    withPrescriptions: (id: string) =>
      ["staff", "withPrescriptions", id] as const,
    count: (filters?: { role?: Role; isActive?: boolean }) =>
      ["staff", "count", filters] as const,
    stats: () => ["staff", "stats"] as const,
    availability: (params: {
      id: string;
      date: string;
      startTime?: string;
      endTime?: string;
    }) => ["staff", "availability", params] as const,
    schedule: (params: { id: string; startDate: string; endDate: string }) =>
      ["staff", "schedule", params] as const,
    appointments: (params: {
      id: string;
      startDate: string;
      endDate: string;
    }) => ["staff", "appointments", params] as const,
    byRole: (role: Role) => ["staff", "byRole", role] as const,
  },

  // ─── Clinics ────────────────────────────────────────────
  clinics: {
    all: ["clinics"] as const,
    lists: () => ["clinics", "list"] as const,
    list: (params?: {
      active?: boolean;
      name?: string;
      page?: number;
      limit?: number;
    }) => ["clinics", "list", params] as const,
    details: () => ["clinics", "detail"] as const,
    detail: (id: string) => ["clinics", "detail", id] as const,
    stats: (id: string) => ["clinics", "stats", id] as const,
    staff: (id: string, params?: { active?: boolean; role?: string }) =>
      ["clinics", "staff", id, params] as const,
    patients: (id: string, params?: { page?: number; limit?: number }) =>
      ["clinics", "patients", id, params] as const,
    appointments: (id: string, date?: string) =>
      ["clinics", "appointments", id, date] as const,
  },

  // ─── Stores ─────────────────────────────────────────────
  stores: {
    all: ["stores"] as const,
    lists: () => ["stores", "list"] as const,
    list: () => ["stores", "list"] as const,
  },

  // ─── System ─────────────────────────────────────────────
  system: {
    all: ["system"] as const,
    health: () => ["system", "health"] as const,
    ping: () => ["system", "ping"] as const,
  },
} as const;

// ============================================================
// Convenience aliases (declared AFTER queryKeys, no cycles)
// ============================================================

export const patientQueryKeys = queryKeys.patients;
export const appointmentQueryKeys = queryKeys.appointments;
export const encounterQueryKeys = queryKeys.encounters;
export const growthQueryKeys = queryKeys.growth;
export const immunizationQueryKeys = queryKeys.immunizations;
export const labQueryKeys = queryKeys.labs;
export const prescriptionQueryKeys = queryKeys.prescriptions;
export const staffQueryKeys = queryKeys.staff;
export const clinicQueryKeys = queryKeys.clinics;
export const authQueryKeys = queryKeys.auth;
export const vitalQueryKeys = queryKeys.vitals;

export type QueryKeys = typeof queryKeys;

// ============================================================
// Utility type — extract the array type from a query key
// ============================================================

export type QueryKeyArray<T> = T extends (
  ...args: unknown[]
) => readonly [...infer R]
  ? R
  : T extends readonly [...infer R]
    ? R
    : never;
