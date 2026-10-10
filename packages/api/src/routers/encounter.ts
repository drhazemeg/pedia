// src/routers/encounter.ts

import { ORPCError } from "@orpc/server";
import { encounterRepository } from "@pedia/db/repositories";
import {
  encounterSchema,
  encounterUpdateSchema,
} from "@pedia/shared/schemas/clinic/encounters";
import { visitTypeSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure } from "../index";

export const encounterRouter = {
  // ─── Queries ───

  getById: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const encounter = await encounterRepository.findById(input);
    if (!encounter) {
      throw new ORPCError("NOT_FOUND", {
        message: "Encounter not found",
      });
    }
    return encounter;
  }),

  findByPatientId: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        visitType: visitTypeSchema.optional(),
        status: z.enum(["Draft", "Completed", "Signed", "Amended"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return encounterRepository.findByPatientId(patientId, options);
    }),

  search: doctorProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        patientId: z.string().optional(),
        providerId: z.string().optional(),
        visitType: visitTypeSchema,
        status: z.enum(["Draft", "Completed", "Signed", "Amended"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .handler(async ({ input }) => encounterRepository.search(input)),

  getRecent: doctorProcedure
    .input(z.number().min(1).max(50).default(10))
    .handler(async ({ input }) =>
      encounterRepository.getRecentEncounters(input)
    ),

  getStats: adminProcedure.handler(async () => encounterRepository.getStats()),

  // ─── Mutations ───

  create: doctorProcedure
    .input(encounterSchema)
    .handler(async ({ input }) => encounterRepository.create(input)),

  createBatch: doctorProcedure
    .input(z.array(encounterSchema))
    .handler(async ({ input }) => encounterRepository.createBatch(input)),

  update: doctorProcedure
    .input(encounterUpdateSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await encounterRepository.update(id, data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Encounter not found",
        });
      }
      return updated;
    }),

  addDiagnosis: doctorProcedure
    .input(
      z.object({
        encounterId: z.string(),
        name: z.string().min(1).max(300),
        icdCode: z.string().optional(),
        primary: z.boolean().default(false),
      })
    )
    .handler(async ({ input }) => {
      const updated = await encounterRepository.addDiagnosis(
        input.encounterId,
        {
          name: input.name,
          icdCode: input.icdCode,
          primary: input.primary,
        }
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Encounter not found",
        });
      }
      return updated;
    }),

  // ✅ ADD: Add treatment plan
  addTreatmentPlan: doctorProcedure
    .input(
      z.object({
        encounterId: z.string(),
        treatments: z.array(z.string()).default([]),
        medications: z.array(z.string()).default([]),
        investigations: z.array(z.string()).default([]),
        patientEducation: z.array(z.string()).default([]),
        followUpDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await encounterRepository.updateTreatmentPlan(
        input.encounterId,
        {
          treatments: input.treatments,
          medications: input.medications,
          investigations: input.investigations,
          patientEducation: input.patientEducation,
          followUpDate: input.followUpDate,
          notes: input.notes,
        }
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Encounter not found",
        });
      }
      return updated;
    }),

  // ✅ ADD: Sign encounter
  sign: doctorProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const updated = await encounterRepository.complete(input.id);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Encounter not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => encounterRepository.delete(input)),
};
