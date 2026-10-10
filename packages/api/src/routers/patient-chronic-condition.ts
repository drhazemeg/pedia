// src/routers/patient-chronic-condition.ts

import { ORPCError } from "@orpc/server";
import { patientChronicConditionRepository } from "@pedia/db/repositories";
import { patientChronicConditionSchema } from "@pedia/shared/schemas/clinic/index";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

export const patientChronicConditionRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const condition = await patientChronicConditionRepository.findById(input);
    if (!condition) {
      throw new ORPCError("NOT_FOUND", {
        message: "Chronic condition not found",
      });
    }
    return condition;
  }),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        status: z
          .enum(["active", "controlled", "resolved", "in_remission"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return patientChronicConditionRepository.findByPatient(
        patientId,
        options
      );
    }),

  getStats: adminProcedure.handler(async () =>
    patientChronicConditionRepository.getStats()
  ),

  // ─── Mutations ───

  create: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        data: patientChronicConditionSchema,
      })
    )
    .handler(async ({ input }) =>
      patientChronicConditionRepository.createForPatient(
        input.patientId,
        input.data as Parameters<
          typeof patientChronicConditionRepository.createForPatient
        >[1]
      )
    ),

  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        patientId: z.string(),
        data: patientChronicConditionSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await patientChronicConditionRepository.updateForPatient(
        input.id,
        input.patientId,
        input.data as Parameters<
          typeof patientChronicConditionRepository.updateForPatient
        >[2]
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Chronic condition not found",
        });
      }
      return updated;
    }),

  delete: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        patientId: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const deleted = await patientChronicConditionRepository.deleteForPatient(
        input.id,
        input.patientId
      );
      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Chronic condition not found",
        });
      }
      return { success: true };
    }),
};

export type PatientChronicConditionRouter =
  typeof patientChronicConditionRouter;
