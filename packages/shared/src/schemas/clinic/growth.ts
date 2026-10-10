// packages/shared/src/schemas/clinic/growth.ts
import {
  realSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

export const growthMeasurementSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable(),
  recordedAt: z.coerce.date(),
  ageMonths: realSchema,
  ageDays: z.number().int().nullable(),
  weightKg: realSchema,
  heightCm: realSchema,
  headCircumferenceCm: realSchema.nullable(),
  bmi: realSchema,
  weightForAgeZscore: realSchema.nullable(),
  weightForAgePercentile: realSchema.nullable(),
  heightForAgeZscore: realSchema.nullable(),
  heightForAgePercentile: realSchema.nullable(),
  bmiForAgeZscore: realSchema.nullable(),
  bmiForAgePercentile: realSchema.nullable(),
  headCircumferenceZScore: realSchema.nullable(),
  headCircumferencePercentile: realSchema.nullable(),
  weightVelocity: realSchema.nullable(),
  heightVelocity: realSchema.nullable(),
  recordedById: uuidSchema,
  notes: z.string().nullable(),
  ...timestampsShape,
});

export const newGrowthMeasurementSchema = growthMeasurementSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const growthMeasurementUpdateSchema =
  newGrowthMeasurementSchema.partial();

export type GrowthMeasurement = z.infer<typeof growthMeasurementSchema>;
export type NewGrowthMeasurement = z.infer<typeof newGrowthMeasurementSchema>;
