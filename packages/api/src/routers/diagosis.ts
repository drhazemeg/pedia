// src/routers/diagnosis.ts
import { ORPCError } from "@orpc/server";
import { db } from "@pedia/db";
import { diagnoses } from "@pedia/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { doctorProcedure } from "../index";

export const diagnosisRouter = {
  list: doctorProcedure
    .input(z.object({ encounterId: z.string() }))
    .handler(({ input }) =>
      db
        .select()
        .from(diagnoses)
        .where(eq(diagnoses.encounterId, input.encounterId))
    ),

  create: doctorProcedure
    .input(
      z.object({
        encounterId: z.string(),
        patientId: z.string(),
        code: z.string().optional(),
        description: z.string().min(1),
        isPrimary: z.boolean().default(false),
      })
    )
    .handler(async ({ input }) => {
      const [created] = await db.insert(diagnoses).values(input).returning();
      return created;
    }),

  delete: doctorProcedure.input(z.string()).handler(async ({ input }) => {
    const [deleted] = await db
      .delete(diagnoses)
      .where(eq(diagnoses.id, input))
      .returning();
    if (!deleted) throw new ORPCError("NOT_FOUND");
    return { success: true };
  }),
};
