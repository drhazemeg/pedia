// src/routers/patient-document.ts

import { ORPCError } from "@orpc/server";
import { patientDocumentRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const patientDocumentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  title: z.string().min(1).max(300),
  documentType: z.enum([
    "Consent Form",
    "Discharge Summary",
    "External Record",
    "Imaging",
    "Insurance",
    "Lab Report",
    "Operative Report",
    "Other",
    "Pathology",
    "Referral",
  ]),
  fileUrl: z.url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  uploadedById: z.string(),
});

export const patientDocumentRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const doc = await patientDocumentRepository.findById(input);
    if (!doc) {
      throw new ORPCError("NOT_FOUND", {
        message: "Document not found",
      });
    }
    return doc;
  }),

  getByPatientId: staffProcedure
    .input(z.string())
    .handler(async ({ input }) =>
      patientDocumentRepository.findByPatient(input)
    ),

  // ─── Mutations ───

  create: doctorProcedure
    .input(patientDocumentSchema)
    .handler(async ({ input }) => {
      const { id: _id, ...data } = input;
      void _id;
      return patientDocumentRepository.create(
        data as Parameters<typeof patientDocumentRepository.create>[0]
      );
    }),

  update: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        data: patientDocumentSchema.partial(),
      })
    )
    .handler(async ({ input }) => {
      const updated = await patientDocumentRepository.update(
        input.id,
        input.data
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Document not found",
        });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await patientDocumentRepository.delete(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Document not found",
      });
    }
    return { success: true };
  }),
};

export type PatientDocumentRouter = typeof patientDocumentRouter;
