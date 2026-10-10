// src/routers/department.ts

import { ORPCError } from "@orpc/server";
import { departmentRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, getClinicId, staffProcedure } from "../index";

const departmentSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const departmentRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const dept = await departmentRepository.findById(input);
    if (!dept) {
      throw new ORPCError("NOT_FOUND", {
        message: "Department not found",
      });
    }
    return dept;
  }),

  getByCode: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const dept = await departmentRepository.findByCode(input);
    if (!dept) {
      throw new ORPCError("NOT_FOUND", {
        message: "Department not found",
      });
    }
    return dept;
  }),

  listActive: staffProcedure
    .input(z.object({ clinicId: z.string().optional() }).optional())
    .handler(async ({ input, context }) => {
      const clinicId = input?.clinicId ?? getClinicId(context);
      return departmentRepository.listActive(clinicId);
    }),

  // ─── Mutations ───

  create: adminProcedure
    .input(departmentSchema)
    .handler(async ({ input, context }) => {
      const { id: _id, clinicId, ...data } = input;
      void _id;
      return departmentRepository.create({
        ...data,
        clinicId: clinicId ?? getClinicId(context),
      } as Parameters<typeof departmentRepository.create>[0]);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: departmentSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await departmentRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Department not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await departmentRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Department not found",
      });
    }
    return { success: true };
  }),
};

export type DepartmentRouter = typeof departmentRouter;
