// src/routers/immunization.ts

import { ORPCError } from "@orpc/server";
import { immunizationRepository } from "@pedia/db/repositories";
import type { ImmunizationStatus } from "@pedia/db/schema";
import { immunizationSchema } from "@pedia/shared/schemas/clinic/immunizations";
import { immunizationStatusSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

export const immunizationRouter = {
  // ─── Queries ───

  getAll: doctorProcedure
    .input(immunizationSchema) // ← the critical line
    .handler(
      async (
        { input } // ← destructure `input`
      ) => immunizationRepository.listAll(input) // ← pass it through
    ),

  getById: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const immunization = await immunizationRepository.findById(input);
    if (!immunization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Immunization not found",
      });
    }
    return immunization;
  }),

  getByPatientId: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        status: immunizationStatusSchema.optional(),
      })
    )
    .handler(async ({ input }) =>
      immunizationRepository.findByPatientId(input.patientId, {
        status: input.status,
      })
    ),

  getOverdue: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      immunizationRepository.getOverdueImmunizations(input)
    ),

  getUpcoming: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        daysAhead: z.number().min(1).max(365).default(30),
      })
    )
    .handler(async ({ input }) =>
      immunizationRepository.getUpcomingImmunizations(
        input.patientId,
        input.daysAhead
      )
    ),

  getAllOverdue: staffProcedure.handler(async () =>
    immunizationRepository.getAllOverdueImmunizations()
  ),

  getComplianceRate: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      immunizationRepository.getVaccineComplianceRate(input)
    ),

  getCount: doctorProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        status: immunizationStatusSchema.optional(),
      })
    )
    .handler(async ({ input }) => {
      const count = await immunizationRepository.countBy({
        patientId: input.patientId,
        status: input.status,
      });
      return { count };
    }),

  // ─── Mutations ───

  create: doctorProcedure
    .input(immunizationSchema)
    .handler(async ({ input }) => immunizationRepository.create(input)),

  createBatch: doctorProcedure
    .input(z.array(immunizationSchema))
    .handler(async ({ input }) => immunizationRepository.createBatch(input)),

  update: doctorProcedure
    .input(immunizationSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await immunizationRepository.update(id ?? "", {
        ...data,
        status: data.status as ImmunizationStatus,
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Immunization not found",
        });
      }
      return updated;
    }),

  administer: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        administeredDate: z.iso.datetime(),
        administeredBy: z.string(),
        batchNumber: z.string().optional(),
        site: z.string().optional(),
        route: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await immunizationRepository.administer(
        id,
        data.administeredDate,
        data.administeredBy,
        data.batchNumber,
        data.site,
        data.route
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Immunization not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => immunizationRepository.delete(input)),

  defer: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
        deferredUntil: z.date(),
        deferredBy: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await immunizationRepository.defer(
        input.id,
        input.reason,
        input.deferredUntil,
        input.deferredBy
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Immunization not found",
        });
      }
      return updated;
    }),

  refuse: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
        refusedBy: z.string(),
        parentConsent: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await immunizationRepository.refuse(
        input.id,
        input.reason,
        input.refusedBy,
        input.parentConsent
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Immunization not found",
        });
      }
      return updated;
    }),

  recordAdverseReaction: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reaction: z.string(),
        severity: z.string(),
        reportedBy: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await immunizationRepository.recordAdverseReaction(
        input.id,
        input.reaction,
        input.severity,
        input.reportedBy
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Immunization not found",
        });
      }
      return updated;
    }),
};
