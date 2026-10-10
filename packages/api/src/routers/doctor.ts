// src/routers/doctor.ts

import { ORPCError } from "@orpc/server";
import { doctorRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, staffProcedure } from "../index";

const doctorSchema = z.object({
  id: z.string().optional(),
  staffId: z.string(),
  specialization: z.string().min(1).max(200),
  departmentId: z.string().optional(),
  licenseNumber: z.string().optional(),
  qualifications: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const doctorRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const doctor = await doctorRepository.findById(input);
    if (!doctor) {
      throw new ORPCError("NOT_FOUND", {
        message: "Doctor not found",
      });
    }
    return doctor;
  }),

  getByIdWithStaff: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const doctor = await doctorRepository.findByIdWithStaff(input);
      if (!doctor) {
        throw new ORPCError("NOT_FOUND", {
          message: "Doctor not found",
        });
      }
      return doctor;
    }),

  getByStaffId: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const doctor = await doctorRepository.findByStaffId(input);
    if (!doctor) {
      throw new ORPCError("NOT_FOUND", {
        message: "Doctor not found",
      });
    }
    return doctor;
  }),

  getByDepartment: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => doctorRepository.findByDepartment(input)),

  listActive: staffProcedure.handler(async () => doctorRepository.listActive()),

  // ─── Mutations ───

  create: adminProcedure.input(doctorSchema).handler(async ({ input }) => {
    const { id: _id, ...data } = input;
    void _id;
    return doctorRepository.create(
      data as Parameters<typeof doctorRepository.create>[0]
    );
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: doctorSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await doctorRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Doctor not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await doctorRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Doctor not found",
      });
    }
    return { success: true };
  }),
  findActive: staffProcedure
    .input(z.object({ clinicId: z.string().optional() }).optional().default({}))
    .handler(() => doctorRepository.listActive()),
};

export type DoctorRouter = typeof doctorRouter;
