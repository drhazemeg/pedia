// src/routers/patient.ts

import { ORPCError } from "@orpc/server";
import { patientRepository } from "@pedia/db/repositories";
import { activityRepository } from "@pedia/db/repositories/activity-repository";
import {
  guardianSchema,
  patientAllergySchema,
  patientChronicConditionSchema,
  patientSchema,
} from "@pedia/shared/schemas/clinic/index";
import { z } from "zod/v4";

import {
  adminProcedure,
  doctorProcedure,
  getClinicId,
  protectedProcedure,
  staffProcedure,
} from "../index";

export const patientRouter = {
  // ─── Queries ───
  getPatientActivityToday: staffProcedure
    .input(
      z.object({
        date: z.date().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input, context }) => {
      const { date, limit, offset } = input;
      const clinicId = getClinicId(context);
      return activityRepository.findToday({
        clinicId,
        ...(date ? { date } : {}),
        limit,
        offset,
      });
    }),
  merge: adminProcedure
    .input(
      z.object({
        sourcePatientId: z.string(),
        targetPatientId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const { sourcePatientId, targetPatientId } = input;
      return patientRepository.mergePatients(sourcePatientId, targetPatientId, {
        clinicId: getClinicId(context),
      });
    }),
  lookupSummary: staffProcedure
    .input(
      z.object({
        clinicId: z.string(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .handler(async ({ input }) => {
      const result = await patientRepository.search(
        { clinicId: input.clinicId },
        {
          query: input.query,
          limit: input.limit,
          offset: 0,
        }
      );
      return result.data.map((p) => ({
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
      }));
    }),
  list: staffProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        activeStatus: z.enum(["active", "inactive", "resolved"]).optional(),
        gender: z.enum(["male", "female"]).optional(),
      })
    )
    .handler(async ({ input, context }) =>
      patientRepository.search({ clinicId: getClinicId(context) }, input)
    ),

  /** Get patient by ID with all relations */
  getById: protectedProcedure.input(z.string()).handler(async ({ input }) => {
    const patient = await patientRepository.findById(input);
    if (!patient) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient not found",
      });
    }
    return patient;
  }),

  /** Get patient by MRN */
  getByMRN: protectedProcedure
    .input(z.string())
    .handler(async ({ input, context }) => {
      const patient = await patientRepository.findByMrn(input, {
        clinicId: getClinicId(context),
      });
      if (!patient) {
        throw new ORPCError("NOT_FOUND", {
          message: "Patient not found",
        });
      }
      return patient;
    }),

  /** Search patients with filters */
  search: staffProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        activeStatus: z.enum(["active", "inactive", "resolved"]).optional(),
        gender: z.enum(["male", "female"]).optional(),
        ageRange: z
          .object({
            min: z.number().optional(),
            max: z.number().optional(),
          })
          .optional(),
        pediatricianId: z.string().optional(),
        hasAllergies: z.boolean().optional(),
        hasChronicConditions: z.boolean().optional(),
        orderBy: z
          .enum(["firstName", "lastName", "createdAt", "dateOfBirth"])
          .default("lastName"),
        orderDirection: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .handler(async ({ input, context }) =>
      patientRepository.search({ clinicId: getClinicId(context) }, input)
    ),

  /** Get all patients (paginated) */
  getAll: staffProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        activeStatus: z.enum(["active", "inactive", "resolved"]).optional(),
      })
    )
    .handler(async ({ input, context }) =>
      patientRepository.findAll({ clinicId: getClinicId(context) }, input)
    ),

  /** Get full patient data (all related records) */
  getFullData: doctorProcedure
    .input(z.string())
    .handler(async ({ input, context }) => {
      const data = await patientRepository.getPatientFullData(input, {
        clinicId: getClinicId(context),
      });
      if (!data) {
        throw new ORPCError("NOT_FOUND", {
          message: "Patient not found",
        });
      }
      return data;
    }),

  /** Get patient encounters */
  getEncounters: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) =>
      patientRepository.getPatientEncounters(input.patientId, {
        limit: input.limit,
        offset: input.offset,
      })
    ),

  /** Get patient growth data */
  getGrowthData: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      patientRepository.getPatientGrowthData(input)
    ),

  /** Get patient immunizations */
  getImmunizations: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => patientRepository.getImmunizations(input)),

  /** Get patient prescriptions */
  getPrescriptions: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        status: z
          .enum(["active", "filled", "discontinued", "cancelled"])
          .optional(),
      })
    )
    .handler(async ({ input }) =>
      patientRepository.getPatientPrescriptions(input.patientId, input.status)
    ),

  /** Get patient lab orders */
  getLabOrders: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        status: z
          .enum([
            "ordered",
            "collected",
            "in_progress",
            "completed",
            "cancelled",
          ])
          .optional(),
      })
    )
    .handler(async ({ input }) =>
      patientRepository.getPatientLabOrders(input.patientId, input.status)
    ),

  /** Get patient statistics */
  getStats: adminProcedure.handler(async ({ context }) =>
    patientRepository.getStats({ clinicId: getClinicId(context) })
  ),

  /** Count patients */
  count: staffProcedure
    .input(
      z
        .object({
          activeStatus: z.enum(["active", "inactive", "resolved"]).optional(),
        })
        .optional()
    )
    .handler(async ({ input, context }) =>
      patientRepository.countForClinic(
        { clinicId: getClinicId(context) },
        input
      )
    ),

  // ─── Mutations ───

  /** Create a new patient */
  create: doctorProcedure
    .input(
      z.object({
        patient: patientSchema,
        guardians: z.array(guardianSchema).optional(),
        allergies: z.array(patientAllergySchema).optional(),
        chronicConditions: z.array(patientChronicConditionSchema).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const { patient, allergies } = input;
      return patientRepository.create({
        ...patient,
        clinicId: getClinicId(context),
        allergies: allergies ?? [],
      });
    }),

  /** Update a patient */
  update: doctorProcedure.input(patientSchema).handler(async ({ input }) => {
    const { id, ...data } = input;
    const updated = await patientRepository.update(id ?? "", data);
    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient not found",
      });
    }
    return updated;
  }),

  /** Delete a patient (soft delete via archive) */
  delete: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => patientRepository.delete(input)),
};
