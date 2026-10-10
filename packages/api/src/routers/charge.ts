// src/routers/charge.ts

import { ORPCError } from "@orpc/server";
import { chargeRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, staffProcedure } from "../index";

const chargeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  isActive: z.boolean().default(true),
});

export const chargeRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const charge = await chargeRepository.findById(input);
    if (!charge) {
      throw new ORPCError("NOT_FOUND", {
        message: "Charge not found",
      });
    }
    return charge;
  }),

  getByCode: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const charge = await chargeRepository.findByCode(input);
    if (!charge) {
      throw new ORPCError("NOT_FOUND", {
        message: "Charge not found",
      });
    }
    return charge;
  }),

  listActive: staffProcedure.handler(async () => chargeRepository.listActive()),

  listByCategory: staffProcedure
    .input(z.string())
    .handler(async ({ input }) => chargeRepository.listByCategory(input)),

  // ─── Mutations ───

  create: adminProcedure.input(chargeSchema).handler(async ({ input }) => {
    const { id: _id, unitPrice, currency: _currency, ...data } = input;
    void _id;
    void _currency;
    return chargeRepository.create({
      ...data,
      defaultAmount: unitPrice.toString(),
    } satisfies Parameters<typeof chargeRepository.create>[0]);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: chargeSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await chargeRepository.update(input.id, input.data);
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Charge not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await chargeRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Charge not found",
      });
    }
    return { success: true };
  }),
};

export type ChargeRouter = typeof chargeRouter;
