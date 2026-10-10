// packages/shared/src/schemas/clinic/counters.ts
import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

export const counterSchema = z.object({
  key: z.string().min(1),
  value: z.number().int().nonnegative(),
  ...timestampsShape,
});

export const newCounterSchema = counterSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type Counter = z.infer<typeof counterSchema>;
export type NewCounter = z.infer<typeof newCounterSchema>;
