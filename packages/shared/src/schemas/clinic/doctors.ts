// packages/shared/src/schemas/clinic/doctors.ts
import {
  numericStringSchema,
  timestampsShape,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

import { departmentSchema } from "./departments";

export const doctorSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  departmentId: z.string().nullable(),
  doctorCode: z.string().max(50),
  registrationNumber: z.string().max(100),
  specialization: z.string().max(255),
  qualification: z.string().max(255).nullable(),
  consultationFee: numericStringSchema.nullable(),
  isActive: z.boolean(),
  ...timestampsShape,
});

export const newDoctorSchema = doctorSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const doctorUpdateSchema = newDoctorSchema.partial();

export const doctorScheduleSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number().int().positive(),
  isActive: z.boolean(),
  ...timestampsShape,
});

export const newDoctorScheduleSchema = doctorScheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Doctor = z.infer<typeof doctorSchema>;
export type NewDoctor = z.infer<typeof newDoctorSchema>;
export type DoctorSchedule = z.infer<typeof doctorScheduleSchema>;
export type NewDoctorSchedule = z.infer<typeof newDoctorScheduleSchema>;

export const listDepartmentsInputSchema = z.object({
  clinicId: z.uuid().optional(),
  isActive: z.boolean().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  orderBy: z.enum(["name", "createdAt"]).default("name"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const paginatedDepartmentsSchema = z.object({
  data: z.array(departmentSchema),
  total: z.number().int().nonnegative(),
});

export const departmentStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  inactive: z.number().int().nonnegative(),
});
