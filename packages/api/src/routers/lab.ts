// src/routers/lab.ts

import { ORPCError } from "@orpc/server";
import { labRepository } from "@pedia/db/repositories";
import type { NewLabOrder } from "@pedia/db/schema/types";
import {
  labOrderSchema,
  labOrderUpdateSchema,
} from "@pedia/shared/schemas/clinic/index";
import { labOrderStatusSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

export const labRouter = {
  // ─── Queries ───

  getById: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const lab = await labRepository.findById(input);
    if (!lab) {
      throw new ORPCError("NOT_FOUND", {
        message: "Lab order not found",
      });
    }
    return lab;
  }),

  getByOrderNumber: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const lab = await labRepository.findByOrderNumber(input);
      if (!lab) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return lab;
    }),

  findAll: staffProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: labOrderStatusSchema.optional(),
        priority: z.enum(["Routine", "Urgent", "Stat"]).optional(),
        patientId: z.string().optional(),
        orderedBy: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        query: z.string().optional(),
      })
    )
    .handler(async ({ input }) => labRepository.findAll(input)),

  getByPatientId: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: labOrderStatusSchema.optional(),
        priority: z.enum(["Routine", "Urgent", "Stat"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return labRepository.findByPatientId(patientId, options);
    }),

  getPending: doctorProcedure
    .input(z.string().optional())
    .handler(async ({ input }) => labRepository.findPending(input)),

  getStats: adminProcedure.handler(async () => labRepository.getLabStats()),

  getAbnormalResults: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => labRepository.getAbnormalResults(input)),

  // ─── Mutations ───

  create: doctorProcedure.input(labOrderSchema).handler(async ({ input }) => {
    const result = await labRepository.create(input as unknown as NewLabOrder);
    return result;
  }),

  createBatch: doctorProcedure
    .input(z.array(labOrderSchema))
    .handler(async ({ input }) => {
      const result = await labRepository.createBatch(
        input as unknown as NewLabOrder[]
      );
      return result;
    }),

  update: doctorProcedure
    .input(labOrderUpdateSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await labRepository.update(
        id,
        data as unknown as Partial<NewLabOrder>
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),

  updateStatus: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        status: labOrderStatusSchema,
      })
    )
    .handler(async ({ input }) => {
      const updated = await labRepository.updateStatus(input.id, input.status);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),

  addResults: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        results: z.array(
          z.object({
            id: z.string(),
            testName: z.string(),
            testCode: z.string(),
            category: z.string(),
            result: z.string().optional(),
            referenceRange: z.string().optional(),
            flag: z.enum(["Normal", "Abnormal", "Critical"]).optional(),
            unit: z.string().optional(),
            isAbnormal: z.boolean().optional(),
          })
        ),
        status: labOrderStatusSchema.default("completed"),
      })
    )
    .handler(async ({ input }) => {
      const updated = await labRepository.update(input.id, {
        testsJson: input.results,
        status: input.status,
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => labRepository.delete(input)),

  // ✅ ADD: Cancel lab order
  cancel: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await labRepository.cancel(input.id, input.reason);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),

  // ✅ ADD: Submit lab results
  submitResults: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        results: z.array(
          z.object({
            labTestId: z.string(),
            testNameSnapshot: z.string(),
            resultValue: z.string().optional(),
            resultText: z.string().optional(),
            referenceRangeSnapshot: z.string().optional(),
            unitSnapshot: z.string().optional(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await labRepository.submitResults(
        input.id,
        input.results,
        input.notes
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),

  // ✅ ADD: Collect sample
  collectSample: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        specimenCollectedAt: z.date(),
        specimenType: z.string(),
        collectionNotes: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await labRepository.collectSample(
        input.id,
        input.specimenCollectedAt,
        input.specimenType,
        input.collectionNotes
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Lab order not found",
        });
      }
      return updated;
    }),
};
