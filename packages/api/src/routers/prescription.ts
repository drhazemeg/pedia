// src/routers/prescription.ts

import { ORPCError } from "@orpc/server";
import { prescriptionRepository } from "@pedia/db/repositories";
import { prescriptionSchema } from "@pedia/shared/schemas/clinic/index";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure } from "../index";

export const prescriptionRouter = {
  // ─── Queries ───

  getById: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const prescription = await prescriptionRepository.findById(input);
    if (!prescription) {
      throw new ORPCError("NOT_FOUND", {
        message: "Prescription not found",
      });
    }
    return prescription;
  }),

  getByRxNumber: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const prescription =
        await prescriptionRepository.findByPrescriptionNumber(input);
      if (!prescription) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
      return prescription;
    }),

  findAll: doctorProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["active", "filled", "discontinued", "expired", "cancelled"])
          .optional(),
        patientId: z.string().optional(),
        prescriberId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        query: z.string().optional(),
      })
    )
    .handler(async ({ input }) => prescriptionRepository.findAll(input)),

  getByPatientId: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["active", "filled", "discontinued", "expired", "cancelled"])
          .optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return prescriptionRepository.findByPatientId(patientId, options);
    }),

  getActive: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      prescriptionRepository.findActiveByPatientId(input)
    ),

  getStats: adminProcedure.handler(async () =>
    prescriptionRepository.getPrescriptionStats()
  ),

  // ─── Mutations ───

  create: doctorProcedure
    .input(prescriptionSchema)
    .handler(async ({ input }) => prescriptionRepository.create(input)),

  createBatch: doctorProcedure
    .input(z.array(prescriptionSchema))
    .handler(async ({ input }) => prescriptionRepository.createBatch(input)),

  update: doctorProcedure
    .input(prescriptionSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await prescriptionRepository.update(id, data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
      return updated;
    }),

  updateStatus: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "active",
          "filled",
          "discontinued",
          "expired",
          "cancelled",
        ]),
      })
    )
    .handler(async ({ input }) => {
      const updated = await prescriptionRepository.updateStatus(
        input.id,
        input.status
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
      return updated;
    }),

  discontinue: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await prescriptionRepository.discontinue(
        input.id,
        input.reason
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
    }),

  // ✅ ADD: Fill prescription
  fill: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        filledBy: z.string(),
        filledAt: z.date().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await prescriptionRepository.fill(
        input.id,
        input.filledBy,
        input.filledAt
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
      return updated;
    }),

  // ✅ ADD: Renew prescription
  renew: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        renewedBy: z.string(),
        refills: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await prescriptionRepository.renew(
        input.id,
        input.renewedBy
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Prescription not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => prescriptionRepository.delete(input)),
};
