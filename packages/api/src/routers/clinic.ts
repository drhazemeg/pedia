// src/routers/clinic.ts

import { ORPCError } from "@orpc/server";
import { clinicRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, getClinicId, staffProcedure } from "../index";

const clinicSettingsSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.email().optional(),
  website: z.url().optional(),
  logoUrl: z.url().optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().optional(),
});

export const clinicRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const clinic = await clinicRepository.findById(input);
    if (!clinic) {
      throw new ORPCError("NOT_FOUND", {
        message: "Clinic not found",
      });
    }
    return clinic;
  }),

  getBySlug: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const clinic = await clinicRepository.findBySlug(input);
    if (!clinic) {
      throw new ORPCError("NOT_FOUND", {
        message: "Clinic not found",
      });
    }
    return clinic;
  }),

  getCurrent: staffProcedure.handler(async ({ context }) => {
    const clinicId = getClinicId(context);
    const clinic = await clinicRepository.findById(clinicId);
    if (!clinic) {
      throw new ORPCError("NOT_FOUND", {
        message: "Clinic not found",
      });
    }
    return clinic;
  }),

  getWithSettings: staffProcedure
    .input(z.string().optional())
    .handler(async ({ input, context }) => {
      const clinicId = input ?? getClinicId(context);
      const clinic = await clinicRepository.findWithSettings(clinicId);
      if (!clinic) {
        throw new ORPCError("NOT_FOUND", {
          message: "Clinic not found",
        });
      }
      return clinic;
    }),

  listActive: staffProcedure.handler(async () => clinicRepository.listActive()),

  // ─── Mutations ───

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        slug: z
          .string()
          .min(2)
          .max(100)
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Slug must be lowercase alphanumeric with hyphens"
          ),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.email().optional(),
        settings: clinicSettingsSchema.optional(),
      })
    )
    .handler(async ({ input }) => {
      const { settings, ...clinicData } = input;
      return clinicRepository.createWithSettings(clinicData, settings ?? {});
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(2).max(200).optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.email().optional(),
          active: z.boolean().optional(),
        }),
      })
    )
    .handler(async ({ input }) => {
      const { id, data } = input;
      const updated = await clinicRepository.update(id, data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Clinic not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await clinicRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Clinic not found",
      });
    }
    return { success: true };
  }),
};

export type ClinicRouter = typeof clinicRouter;
