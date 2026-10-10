// src/routers/staff.ts

import { ORPCError } from "@orpc/server";
import { staffRepository } from "@pedia/db/repositories";
import type { NewStaff } from "@pedia/db/schema/types";
import { staffSchema } from "@pedia/shared/schemas/clinic/index";
import { roleSchema } from "@pedia/shared/schemas/role";
import { z } from "zod/v4";

import {
  adminProcedure,
  doctorProcedure,
  getClinicId,
  staffProcedure,
} from "../index";

export const staffRouter = {
  // ─── Queries ───
  getCount: staffProcedure
    .input(
      z.object({
        role: roleSchema.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => staffRepository.countBy(input)),

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const staff = await staffRepository.findById(input);
    if (!staff) {
      throw new ORPCError("NOT_FOUND", {
        message: "Staff member not found",
      });
    }
    return staff;
  }),

  getByEmail: staffProcedure
    .input(z.email())
    .handler(async ({ input, context }) => {
      const staff = await staffRepository.findByEmail(input, {
        clinicId: getClinicId(context),
      });
      if (!staff) {
        throw new ORPCError("NOT_FOUND", {
          message: "Staff member not found",
        });
      }
      return staff;
    }),

  findAll: staffProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        isActive: z.boolean().optional(),
        role: roleSchema.optional(),
        search: z.string().optional(),
        orderBy: z.enum(["name", "createdAt"]).default("name"),
        orderDirection: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .handler(async ({ input }) => staffRepository.findAll(input)),

  getActive: staffProcedure.handler(async () => staffRepository.findActive()),

  getByRole: staffProcedure
    .input(roleSchema)
    .handler(async ({ input }) => staffRepository.findByRole(input)),

  getWithPatients: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const staff = await staffRepository.getStaffWithPatients(input);
      if (!staff) {
        throw new ORPCError("NOT_FOUND", {
          message: "Staff member not found",
        });
      }
      return staff;
    }),

  getWithEncounters: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const staff = await staffRepository.getStaffWithEncounters(input);
      if (!staff) {
        throw new ORPCError("NOT_FOUND", {
          message: "Staff member not found",
        });
      }
      return staff;
    }),

  getWithPrescriptions: doctorProcedure
    .input(z.string())
    .handler(async ({ input }) => {
      const staff = await staffRepository.getStaffWithPrescriptions(input);
      if (!staff) {
        throw new ORPCError("NOT_FOUND", {
          message: "Staff member not found",
        });
      }
      return staff;
    }),

  getStats: adminProcedure.handler(async () => staffRepository.getStats()),

  // ─── Mutations ───

  create: adminProcedure
    .input(staffSchema)
    .handler(async ({ input }) =>
      staffRepository.create(input as unknown as NewStaff)
    ),

  createBatch: adminProcedure
    .input(z.array(staffSchema))
    .handler(async ({ input }) => staffRepository.bulkCreate(input)),

  update: adminProcedure.input(staffSchema).handler(async ({ input }) => {
    const { id, ...data } = input;
    const updated = await staffRepository.update(id ?? "", data);
    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Staff member not found",
      });
    }
    return updated;
  }),

  toggleActive: adminProcedure
    .input(z.string())
    .handler(async ({ input, context }) => {
      const updated = await staffRepository.toggleActive(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Staff member not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure
    .input(z.string())
    .handler(async ({ input }) => staffRepository.delete(input)),
};
