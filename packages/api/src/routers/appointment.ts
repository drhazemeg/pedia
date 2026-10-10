// src/routers/appointment.ts

import { ORPCError } from "@orpc/server";
import { appointmentRepository } from "@pedia/db/repositories";
import {
  appointmentUpdateSchema,
  newAppointmentSchema,
} from "@pedia/shared/schemas/clinic/appointments";
import {
  appointmentStatusSchema,
  visitTypeSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod/v4";

import {
  adminProcedure,
  doctorProcedure,
  getClinicId,
  publicProcedure,
  staffProcedure,
  withErrorHandler,
} from "../index";

export const appointmentRouter = {
  // ─── Queries ───

  getById: staffProcedure.input(z.string()).handler(
    withErrorHandler("appointment.getById", async ({ input, context }) => {
      const appointment = await appointmentRepository.findById(input, {
        clinicId: getClinicId(context),
      });
      if (!appointment) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return appointment;
    })
  ),

  getAvailableSlots: publicProcedure
    .input(
      z.object({
        staffId: z.string(),
        date: z.iso.date(), // "YYYY-MM-DD"
        durationMinutes: z.number().int().min(5).max(240).default(30),
      })
    )
    .handler(
      withErrorHandler("appointment.getAvailableSlots", async ({ input }) =>
        appointmentRepository.getAvailableSlots(
          input.staffId,
          input.date,
          input.durationMinutes
        )
      )
    ),

  findAll: staffProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z
          .enum([
            "Scheduled",
            "Checked In",
            "In Progress",
            "Completed",
            "Cancelled",
            "No Show",
          ])
          .optional(),
        patientId: z.string().optional(),
        staffId: z.string().optional(),
        appointmentType: visitTypeSchema.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        query: z.string().optional(),
      })
    )
    .handler(
      withErrorHandler("appointment.findAll", async ({ input }) =>
        appointmentRepository.search(input)
      )
    ),

  noShow: doctorProcedure.input(z.string()).handler(
    withErrorHandler("appointment.noShow", async ({ input, context }) => {
      const updated = await appointmentRepository.markNoShow(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  findByPatientId: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: appointmentStatusSchema.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        appointmentType: visitTypeSchema.optional(),
      })
    )
    .handler(
      withErrorHandler("appointment.findByPatientId", async ({ input }) => {
        const { patientId, ...options } = input;
        return appointmentRepository.findByPatientId(patientId, options);
      })
    ),

  findByStaffId: staffProcedure
    .input(
      z.object({
        staffId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: appointmentStatusSchema.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        appointmentType: visitTypeSchema.optional(),
      })
    )
    .handler(
      withErrorHandler("appointment.findByStaffId", async ({ input }) => {
        const { staffId, ...options } = input;
        return appointmentRepository.findBydoctorId(staffId, options);
      })
    ),

  findByDate: staffProcedure
    .input(
      z.object({
        date: z.date(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(
      withErrorHandler("appointment.findByDate", async ({ input }) =>
        appointmentRepository.findByDate(input.date, {
          limit: input.limit,
          offset: input.offset,
        })
      )
    ),

  getUpcoming: staffProcedure
    .input(
      z.object({
        patientId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .handler(
      withErrorHandler("appointment.getUpcoming", async ({ input }) =>
        appointmentRepository.findUpcomingByPatientId(
          input.patientId,
          input.limit
        )
      )
    ),

  getStats: adminProcedure.handler(
    withErrorHandler("appointment.getStats", async () =>
      appointmentRepository.getStats()
    )
  ),

  // ─── Mutations ───

  create: doctorProcedure.input(newAppointmentSchema).handler(
    withErrorHandler("appointment.create", async ({ input, context }) =>
      appointmentRepository.create(input, {
        clinicId: getClinicId(context),
      })
    )
  ),

  createBatch: doctorProcedure.input(z.array(newAppointmentSchema)).handler(
    withErrorHandler("appointment.createBatch", async ({ input, context }) =>
      appointmentRepository.createBatch(input, {
        clinicId: getClinicId(context),
      })
    )
  ),

  update: doctorProcedure.input(appointmentUpdateSchema).handler(
    withErrorHandler("appointment.update", async ({ input, context }) => {
      const { id, ...data } = input;
      const updated = await appointmentRepository.update(id, data, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  updateStatus: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "Scheduled",
          "Checked In",
          "In Progress",
          "Completed",
          "Cancelled",
          "No Show",
        ]),
      })
    )
    .handler(
      withErrorHandler(
        "appointment.updateStatus",
        async ({ input, context }) => {
          const updated = await appointmentRepository.updateStatus(
            input.id,
            input.status,
            {
              clinicId: getClinicId(context),
            }
          );
          if (!updated) {
            throw new ORPCError("NOT_FOUND", {
              message: "Appointment not found",
            });
          }
          return updated;
        }
      )
    ),

  checkIn: doctorProcedure.input(z.string()).handler(
    withErrorHandler("appointment.checkIn", async ({ input, context }) => {
      const updated = await appointmentRepository.checkIn(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  start: doctorProcedure.input(z.string()).handler(
    withErrorHandler("appointment.start", async ({ input, context }) => {
      const updated = await appointmentRepository.startAppointment(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  complete: doctorProcedure.input(z.string()).handler(
    withErrorHandler("appointment.complete", async ({ input, context }) => {
      const updated = await appointmentRepository.completeAppointment(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  cancel: doctorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .handler(
      withErrorHandler("appointment.cancel", async ({ input, context }) => {
        const updated = await appointmentRepository.cancelAppointment(
          input.id,
          input.reason,
          {
            clinicId: getClinicId(context),
          }
        );
        if (!updated) {
          throw new ORPCError("NOT_FOUND", {
            message: "Appointment not found",
          });
        }
        return updated;
      })
    ),

  markNoShow: doctorProcedure.input(z.string()).handler(
    withErrorHandler("appointment.markNoShow", async ({ input, context }) => {
      const updated = await appointmentRepository.markNoShow(input, {
        clinicId: getClinicId(context),
      });
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Appointment not found",
        });
      }
      return updated;
    })
  ),

  delete: adminProcedure.input(z.string()).handler(
    withErrorHandler("appointment.delete", async ({ input, context }) =>
      appointmentRepository.delete(input, {
        clinicId: getClinicId(context),
      })
    )
  ),
};

export type AppointmentRouter = typeof appointmentRouter;
