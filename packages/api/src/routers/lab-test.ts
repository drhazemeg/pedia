// src/routers/lab-test.ts

import { ORPCError } from "@orpc/server";
import { labTestRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, staffProcedure } from "../index";

const labTestSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().optional(),
  specimenType: z.string().optional(),
  referenceRange: z.string().optional(),
  unit: z.string().optional(),
  price: z.string().optional(),
  turnaroundHours: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const labTestRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const labTest = await labTestRepository.findById(input);
    if (!labTest) {
      throw new ORPCError("NOT_FOUND", {
        message: "Lab test not found",
      });
    }
    return labTest;
  }),

  getByCode: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const labTest = await labTestRepository.findByCode(input);
    if (!labTest) {
      throw new ORPCError("NOT_FOUND", {
        message: "Lab test not found",
      });
    }
    return labTest;
  }),

  listActive: staffProcedure.handler(async () =>
    labTestRepository.listActive()
  ),

  // ─── Mutations ───

  create: adminProcedure.input(labTestSchema).handler(async ({ input }) => {
    const { id: _id, ...data } = input;
    void _id;
    return labTestRepository.create(
      data as Parameters<typeof labTestRepository.create>[0]
    );
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: labTestSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await labTestRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab test not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await labTestRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Lab test not found",
      });
    }
    return { success: true };
  }),
};

export type LabTestRouter = typeof labTestRouter;
