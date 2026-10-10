// src/routers/medicine.ts

import { ORPCError } from "@orpc/server";
import { medicineRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, staffProcedure } from "../index";

const medicineSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().optional(),
  code: z.string().min(1).max(50),
  genericName: z.string().min(1).max(200),
  brandName: z.string().optional(),
  form: z.string().optional(),
  strength: z.string().optional(),
  unit: z.string().optional(),
  reorderLevel: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const medicineRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const medicine = await medicineRepository.findById(input);
    if (!medicine) {
      throw new ORPCError("NOT_FOUND", {
        message: "Medicine not found",
      });
    }
    return medicine;
  }),

  getByCode: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const medicine = await medicineRepository.findByCode(input);
    if (!medicine) {
      throw new ORPCError("NOT_FOUND", {
        message: "Medicine not found",
      });
    }
    return medicine;
  }),

  getByGenericName: staffProcedure
    .input(
      z.object({
        name: z.string(),
        clinicId: z.string(),
      })
    )
    .handler(async ({ input }) =>
      medicineRepository.findByGenericName(input.name, input.clinicId)
    ),

  listActive: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => medicineRepository.listActive(input)),

  getBatches: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => medicineRepository.getBatches(input)),

  getLowStock: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => medicineRepository.getLowStock(input)),

  // ─── Mutations ───

  create: adminProcedure.input(medicineSchema).handler(async ({ input }) => {
    const { id: _id, ...data } = input;
    void _id;
    return medicineRepository.create(
      data as Parameters<typeof medicineRepository.create>[0]
    );
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: medicineSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await medicineRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Medicine not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await medicineRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Medicine not found",
      });
    }
    return { success: true };
  }),
};

export type MedicineRouter = typeof medicineRouter;
