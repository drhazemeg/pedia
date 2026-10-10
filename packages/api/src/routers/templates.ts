import { ORPCError } from "@orpc/server";
import { templateRepository } from "@pedia/db/repositories";
import { templateSchema } from "@pedia/shared/schemas/clinic/templates";
import { z } from "zod/v4";

import { protectedProcedure } from "../index";

export const templatesRouter = {
  list: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const clinicId = context.clinicId ?? "";
      const { data } = await templateRepository.findAll({
        ...input,
        clinicId,
      });
      return data;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const template = await templateRepository.findById(input.id);
      if (!template) {
        throw new ORPCError("NOT_FOUND", {
          message: "Template not found",
        });
      }
      return template;
    }),

  create: protectedProcedure
    .input(templateSchema)
    .handler(async ({ input }) => templateRepository.create(input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: templateSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const template = await templateRepository.update(input.id, input.data);
      if (!template) {
        throw new ORPCError("NOT_FOUND", {
          message: "Template not found",
        });
      }
      return template;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const success = await templateRepository.delete(input.id);
      if (!success) {
        throw new ORPCError("NOT_FOUND", {
          message: "Template not found",
        });
      }
      return { success: true };
    }),
};
