// src/routers/medical-record.ts

import { ORPCError } from "@orpc/server";
import { medicalRecordRepository } from "@pedia/db/repositories";
import { medicalRecordSchema } from "@pedia/shared/schemas/clinic/index";
import {
  medicalRecordStatusSchema,
  medicalRecordTypeSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

export const medicalRecordRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const record = await medicalRecordRepository.findById(input);
    if (!record) {
      throw new ORPCError("NOT_FOUND", {
        message: "Medical record not found",
      });
    }
    return record;
  }),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        recordType: medicalRecordTypeSchema.optional(),
        status: medicalRecordStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return medicalRecordRepository.findByPatient(patientId, options);
    }),

  getByEncounterId: staffProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      medicalRecordRepository.findByEncounter(input)
    ),

  // ─── Mutations ───

  create: doctorProcedure
    .input(medicalRecordSchema)
    .handler(async ({ input }) => {
      const { id: _id, ...data } = input;
      void _id;
      return medicalRecordRepository.create({
        patientId: data.patientId,
        encounterId: data.encounterId,
        title: data.title,
        description: data.description,
        documentDate: data.createdAt?.toISOString().slice(0, 10),
        recordType: data.recordType,
      });
    }),

  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        data: medicalRecordSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const { metadata, ...data } = input.data;
      const updated = await medicalRecordRepository.update(input.id, {
        ...data,
        ...(metadata === undefined
          ? {}
          : {
              metadata: z
                .record(z.string(), z.json())
                .nullable()
                .parse(metadata),
            }),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Medical record not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await medicalRecordRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Medical record not found",
      });
    }
    return { success: true };
  }),
};

export type MedicalRecordRouter = typeof medicalRecordRouter;
