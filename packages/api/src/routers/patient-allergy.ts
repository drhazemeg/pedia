// src/routers/patient-allergy.ts

import { ORPCError } from "@orpc/server";
import { patientAllergyRepository } from "@pedia/db/repositories";
import { patientAllergySchema } from "@pedia/shared/schemas/clinic/index";
import { z } from "zod/v4";

import { doctorProcedure, staffProcedure } from "../index";

export const patientAllergyRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const allergy = await patientAllergyRepository.findById(input);
    if (!allergy) {
      throw new ORPCError("NOT_FOUND", {
        message: "Allergy not found",
      });
    }
    return allergy;
  }),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        status: z.enum(["Active", "Inactive", "Resolved"]).optional(),
      })
    )
    .handler(async ({ input }) =>
      patientAllergyRepository.findByPatient(input.patientId, input.status)
    ),

  // ─── Mutations ───

  create: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        data: patientAllergySchema,
      })
    )
    .handler(async ({ input }) =>
      patientAllergyRepository.createForPatient(
        input.patientId,
        input.data as Parameters<
          typeof patientAllergyRepository.createForPatient
        >[1]
      )
    ),

  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        patientId: z.string(),
        data: patientAllergySchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await patientAllergyRepository.updateForPatient(
        input.id,
        input.patientId,
        input.data as Parameters<
          typeof patientAllergyRepository.updateForPatient
        >[2]
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Allergy not found",
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
      const deleted = await patientAllergyRepository.deleteForPatient(
        input.id,
        input.patientId
      );
      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Allergy not found",
        });
      }
      return { success: true };
    }),
};

export type PatientAllergyRouter = typeof patientAllergyRouter;
