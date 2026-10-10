// src/routers/who.ts

import { whoGrowthRepository } from "@pedia/db/repositories";
import { genderSchema, metricTypeSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const whoGrowthDataSchema = z.object({
  id: z.string().optional(),
  gender: z.enum(["male", "female"]),
  metricType: z.enum(["weight", "height", "head_circumference", "bmi"]),
  ageDays: z.number().int().nonnegative(),
  ageMonths: z.number().nonnegative(),
  L: z.number(),
  M: z.number(),
  S: z.number(),
  sd4neg: z.number(),
  sd3neg: z.number(),
  sd2neg: z.number(),
  sd1neg: z.number(),
  sd0: z.number(),
  sd1: z.number(),
  sd2: z.number(),
  sd3: z.number(),
  sd4: z.number(),
});

export const whoRouter = {
  // ─── Queries ───

  getAll: staffProcedure.handler(async () => whoGrowthRepository.getAll()),

  getByGenderAndMetric: staffProcedure
    .input(
      z.object({
        gender: genderSchema,
        metricType: metricTypeSchema,
      })
    )
    .handler(async ({ input }) =>
      whoGrowthRepository.getByGenderAndMetric(input.gender, input.metricType)
    ),

  getLMSParameters: doctorProcedure
    .input(
      z.object({
        gender: z.enum(["male", "female"]),
        metricType: z.enum(["weight", "height", "head_circumference", "bmi"]),
        ageMonths: z.number().min(0).max(240),
      })
    )
    .handler(async ({ input }) =>
      whoGrowthRepository.getLMSParameters(
        input.gender,
        input.metricType,
        input.ageMonths
      )
    ),

  getAgeRange: staffProcedure
    .input(
      z.object({
        gender: z.enum(["male", "female"]),
        metricType: z.enum(["weight", "height", "head_circumference", "bmi"]),
      })
    )
    .handler(async ({ input }) =>
      whoGrowthRepository.getAgeRange(input.gender, input.metricType)
    ),

  getPercentileCurve: doctorProcedure
    .input(
      z.object({
        gender: z.enum(["male", "female"]),
        metricType: z.enum(["weight", "height", "head_circumference", "bmi"]),
        ageMonths: z.array(z.number().min(0).max(240)),
      })
    )
    .handler(async ({ input }) =>
      whoGrowthRepository.getPercentileCurve(
        input.gender,
        input.metricType,
        input.ageMonths
      )
    ),

  // ─── Mutations ───

  bulkInsert: adminProcedure
    .input(z.array(whoGrowthDataSchema))
    .handler(async ({ input }) =>
      whoGrowthRepository.bulkInsert(
        input as Parameters<typeof whoGrowthRepository.bulkInsert>[0]
      )
    ),

  upsert: adminProcedure
    .input(whoGrowthDataSchema)
    .handler(async ({ input }) => {
      const { id: _id, ...data } = input;
      void _id;
      return whoGrowthRepository.upsert(
        data as Parameters<typeof whoGrowthRepository.upsert>[0]
      );
    }),

  clearCache: adminProcedure.handler(async () => {
    whoGrowthRepository.clearCache();
    return { success: true };
  }),
};

export type WhoRouter = typeof whoRouter;
