// packages/shared/src/schemas/clinic/who-growth.ts
import {
  realSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { metricTypeSchema, whoGenderSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const whoGrowthDataSchema = z.object({
  id: uuidSchema,
  gender: whoGenderSchema,
  metricType: metricTypeSchema,
  ageDays: z.number().int().nullable(),
  ageMonths: realSchema,
  L: realSchema,
  M: realSchema,
  S: realSchema,
  sd4neg: realSchema.nullable(),
  sd3neg: realSchema.nullable(),
  sd2neg: realSchema.nullable(),
  sd1neg: realSchema.nullable(),
  sd0: realSchema.nullable(),
  sd1: realSchema.nullable(),
  sd2: realSchema.nullable(),
  sd3: realSchema.nullable(),
  sd4: realSchema.nullable(),
  dataSource: z.string().nullable(),
  version: z.string().nullable(),
  ...timestampsShape,
});

export const newWhoGrowthDataSchema = whoGrowthDataSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WhoGrowthData = z.infer<typeof whoGrowthDataSchema>;
export type NewWhoGrowthData = z.infer<typeof newWhoGrowthDataSchema>;
