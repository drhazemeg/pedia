// packages/shared/src/schemas/clinic/vitals.ts
import {
  realSchema,
  timestampsShape,
  uuidSchema,
} from "@pedia/shared/schemas/_helper";
import { temperatureMethodSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const vitalSignsSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable(),
  recordedAt: z.coerce.date(),
  temperatureC: realSchema,
  temperatureMethod: temperatureMethodSchema.nullable(),
  heartRateBpm: z.number().int(),
  respiratoryRateBpm: z.number().int(),
  systolicBp: z.number().int().nullable(),
  diastolicBp: z.number().int().nullable(),
  meanArterialPressure: z.number().int().nullable(),
  oxygenSaturationPercent: z.number().int(),
  painScore: z.number().int().nullable(),
  painScaleType: z.string().nullable(),
  weightKg: realSchema.nullable(),
  heightCm: realSchema.nullable(),
  headCircumferenceCm: realSchema.nullable(),
  bmi: realSchema.nullable(),
  notes: z.string().nullable(),
  recordedById: uuidSchema,
  ...timestampsShape,
});

export const newVitalSignsSchema = vitalSignsSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    temperatureMethod: temperatureMethodSchema.optional(),
    painScore: z.number().int().min(0).max(10).optional(),
    painScaleType: z.string().optional(),
  });

export const vitalSignsUpdateSchema = newVitalSignsSchema.partial();

export type VitalSigns = z.infer<typeof vitalSignsSchema>;
export type NewVitalSigns = z.infer<typeof newVitalSignsSchema>;
export type VitalSignsUpdate = z.infer<typeof vitalSignsUpdateSchema>;
