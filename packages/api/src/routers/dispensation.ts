// src/routers/dispensation.ts

import { ORPCError } from "@orpc/server";
import { dispensationRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const dispensationItemSchema = z.object({
  batchId: z.string(),
  medicineId: z.string(),
  quantity: z.number().int().positive(),
  instructions: z.string().optional(),
});

const dispensationSchema = z.object({
  id: z.string().optional(),
  prescriptionId: z.string(),
  patientId: z.string(),
  dispensedById: z.string(),
  dispensedAt: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(dispensationItemSchema).min(1),
});

export const dispensationRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const dispensation = await dispensationRepository.findById(input);
    if (!dispensation) {
      throw new ORPCError("NOT_FOUND", {
        message: "Dispensation not found",
      });
    }
    return dispensation;
  }),

  getByPrescriptionId: staffProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      dispensationRepository.findByPrescription(input)
    ),

  // ─── Mutations ───

  dispense: doctorProcedure
    .input(dispensationSchema)
    .handler(async ({ input }) => {
      const { items, id: _id, ...data } = input;
      void _id;
      return dispensationRepository.dispense(
        data as Parameters<typeof dispensationRepository.dispense>[0],
        items as Parameters<typeof dispensationRepository.dispense>[1]
      );
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    await dispensationRepository.delete(input);
    return { success: true };
  }),
};

export type DispensationRouter = typeof dispensationRouter;
