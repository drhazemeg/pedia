// packages/shared/src/schemas/clinic/clinics.ts
import { timestampsShape, uuidSchema } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

const jsonValueSchema: z.ZodType<
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const clinicSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  logo: z.string().nullable(),
  timezone: z.string().nullable(),
  currency: z.string().nullable(),
  active: z.boolean(),
  settings: z.record(z.string(), jsonValueSchema).nullable(),
  ...timestampsShape,
});

export const newClinicSchema = clinicSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    settings: z.record(z.string(), jsonValueSchema).nullable().optional(),
  });

export const clinicUpdateSchema = newClinicSchema.partial();

export const clinicSettingsSchema = z.object({
  id: uuidSchema,
  hospitalName: z.string().max(255),
  registrationNumber: z.string().max(100).nullable(),
  phone: z.string().max(50).nullable(),
  email: z.string().max(255).nullable(),
  addressLine1: z.string().max(255).nullable(),
  addressLine2: z.string().max(255).nullable(),
  city: z.string().max(100).nullable(),
  state: z.string().max(100).nullable(),
  postalCode: z.string().max(20).nullable(),
  country: z.string().max(100).nullable(),
  timezone: z.string().max(50),
  currencyCode: z.string().max(10),
  invoicePrefix: z.string().max(10).nullable(),
  patientPrefix: z.string().max(10).nullable(),
  appointmentPrefix: z.string().max(10).nullable(),
  admissionPrefix: z.string().max(10).nullable(),
  labOrderPrefix: z.string().max(10).nullable(),
  ...timestampsShape,
});

export const newClinicSettingsSchema = clinicSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Clinic = z.infer<typeof clinicSchema>;
export type NewClinic = z.infer<typeof newClinicSchema>;
export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;
export type NewClinicSettings = z.infer<typeof newClinicSettingsSchema>;
