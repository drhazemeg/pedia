// src/routers/guardian.ts

import { ORPCError } from "@orpc/server";
import { guardianRepository } from "@pedia/db/repositories";
import { guardianSchema } from "@pedia/shared/schemas/clinic/index";
import { z } from "zod/v4";

import { doctorProcedure, staffProcedure } from "../index";

export const guardianRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const guardian = await guardianRepository.findById(input);
    if (!guardian) {
      throw new ORPCError("NOT_FOUND", {
        message: "Guardian not found",
      });
    }
    return guardian;
  }),

  getByPatientId: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => guardianRepository.findByPatient(input)),

  getPrimary: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const guardian = await guardianRepository.findPrimary(input);
    if (!guardian) {
      throw new ORPCError("NOT_FOUND", {
        message: "Primary guardian not found",
      });
    }
    return guardian;
  }),

  // ─── Mutations ───

  create: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        data: guardianSchema,
      })
    )
    .handler(async ({ input }) =>
      guardianRepository.createForPatient(
        input.patientId,
        input.data as Parameters<typeof guardianRepository.createForPatient>[1]
      )
    ),

  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        patientId: z.string(),
        data: guardianSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await guardianRepository.updateForPatient(
        input.id,
        input.patientId,
        input.data as Parameters<typeof guardianRepository.updateForPatient>[2]
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Guardian not found",
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
      const deleted = await guardianRepository.deleteForPatient(
        input.id,
        input.patientId
      );
      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Guardian not found",
        });
      }
      return { success: true };
    }),
};

export type GuardianRouter = typeof guardianRouter;
