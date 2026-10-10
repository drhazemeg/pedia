// packages/shared/src/schemas/_helper.ts

import { z } from "zod";

// ============================================================
// Primitives
// ============================================================

export const uuidSchema = z.uuid();
/** ISO calendar date, `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date();

/** Timestamps come back as Date from Drizzle, but over the wire as ISO strings. */
export const timestampSchema = z.coerce.date();

/** Postgres `numeric` columns come back as strings unless mode:'number'. */
export const numericStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Invalid numeric string");

export const realSchema = z.number();

export const jsonbSchema = z.record(z.string(), z.unknown());

export const textArraySchema = z.array(z.string());

// ============================================================
// Shared field builders
// ============================================================

export const timestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const timestampsShape = timestampsSchema.shape; // ← named export
export const idSchema = z.object({ id: uuidSchema });

// ============================================================
// Common shapes
// ============================================================

export const clinicScopeSchema = z.object({
  clinicId: uuidSchema,
});

export const dateRangeSchema = z.object({
  startDate: timestampSchema.optional(),
  endDate: timestampSchema.optional(),
});
