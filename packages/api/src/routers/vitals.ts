// src/routers/vitals.ts

import { ORPCError } from "@orpc/server";
import { vitalsRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const vitalSignsSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  encounterId: z.string().optional(),
  recordedAt: z.date().optional(),
  temperature: z.number().optional(),
  heartRate: z.number().int().optional(),
  respiratoryRate: z.number().int().optional(),
  bloodPressureSystolic: z.number().int().optional(),
  bloodPressureDiastolic: z.number().int().optional(),
  oxygenSaturation: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  headCircumferenceCm: z.number().optional(),
  painScore: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export const vitalsRouter = {
  // ─── Queries ───

  getById: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const vital = await vitalsRepository.findById(input);
    if (!vital) {
      throw new ORPCError("NOT_FOUND", {
        message: "Vital signs record not found",
      });
    }
    return vital;
  }),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .handler(async ({ input }) =>
      vitalsRepository.findByPatient(input.patientId, input.limit)
    ),

  getLatest: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => vitalsRepository.getLatest(input)),

  // ─── Mutations ───

  create: doctorProcedure
    .input(vitalSignsSchema)
    .handler(async ({ input, context }) =>
      vitalsRepository.create({
        ...input,
        temperatureC: input.temperature ?? 0,
        heartRateBpm: input.heartRate ?? 0,
        respiratoryRateBpm: input.respiratoryRate ?? 0,
        oxygenSaturationPercent: input.oxygenSaturation ?? 0,
        recordedById: context.user?.id ?? "",
        recordedAt: new Date(),
      })
    ),

  update: doctorProcedure
    .input(vitalSignsSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await vitalsRepository.update(id, data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Vital signs record not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => vitalsRepository.delete(input)),
};

export type VitalsRouter = typeof vitalsRouter;
