// src/routers/admission.ts

import { ORPCError } from "@orpc/server";
import { admissionRepository } from "@pedia/db/repositories";
import { z } from "zod/v4";

import { adminProcedure, doctorProcedure, staffProcedure } from "../index";

const admissionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  attendingStaffId: z.string(),
  admissionDate: z.date().optional(),
  admissionReason: z.string().min(1),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["Admitted", "Discharged", "Transferred"]).optional(),
});

const clinicalNoteSchema = z.object({
  admissionId: z.string(),
  noteType: z.enum(["Progress", "Nursing", "Consultation", "Discharge"]),
  content: z.string().min(1),
  authorId: z.string(),
});

export const admissionRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(async ({ input }) => {
    const admission = await admissionRepository.findById(input);
    if (!admission) {
      throw new ORPCError("NOT_FOUND", {
        message: "Admission not found",
      });
    }
    return admission;
  }),

  getActive: staffProcedure
    .input(z.object({ patientId: z.string().optional() }).optional())
    .handler(async ({ input }) =>
      admissionRepository.findActive(input?.patientId)
    ),

  getByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const { patientId, ...options } = input;
      return admissionRepository.findByPatient(patientId, options);
    }),

  // ─── Mutations ───

  admit: doctorProcedure
    .input(
      z.object({
        admission: admissionSchema,
        bedId: z.string(),
        allocatedById: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const { admission, bedId, allocatedById } = input;
      const { id: _id, ...data } = admission;
      void _id;
      return admissionRepository.admit(
        data as Parameters<typeof admissionRepository.admit>[0],
        bedId,
        allocatedById
      );
    }),

  discharge: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        summary: z.string().min(1),
        endedById: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const result = await admissionRepository.discharge(
        input.id,
        input.summary,
        input.endedById
      );
      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: "Admission not found",
        });
      }
      return result;
    }),

  addClinicalNote: doctorProcedure
    .input(clinicalNoteSchema)
    .handler(async ({ input }) => {
      await admissionRepository.addClinicalNote({
        admissionId: input.admissionId,
        authorUserId: input.authorId,
        noteText: input.content,
        noteType: input.noteType,
      } as Parameters<typeof admissionRepository.addClinicalNote>[0]);
      return { success: true };
    }),

  delete: adminProcedure.input(z.string()).handler(async ({ input }) => {
    const deleted = await admissionRepository.deleteWithCleanup(input);
    if (!deleted) {
      throw new ORPCError("NOT_FOUND", {
        message: "Admission not found",
      });
    }
    return { success: true };
  }),
};

export type AdmissionRouter = typeof admissionRouter;
