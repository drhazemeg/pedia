import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { admissionStatusSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const admissionSchema = z.object({
  id: z.string(),
  admissionNumber: z.string().max(50),
  patientId: z.string(),
  attendingStaffId: z.string(),
  attendingDoctorId: z.string().nullable(),
  status: admissionStatusSchema,
  admissionReason: z.string().max(500),
  admittedAt: z.coerce.date(),
  expectedDischargeAt: z.coerce.date().nullable(),
  dischargedAt: z.coerce.date().nullable(),
  dischargeSummary: z.string().max(2000).nullable(),
  createdById: z.uuid(),
  ...timestampsShape,
});

export const newAdmissionSchema = admissionSchema
  .omit({
    id: true,
    admissionNumber: true,
    status: true,
    admittedAt: true,
    dischargedAt: true,
    dischargeSummary: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    attendingDoctorId: z.string().nullable().optional(),
    expectedDischargeAt: z.coerce.date().nullable().optional(),
  });

export const admissionUpdateSchema = newAdmissionSchema.partial();

export type Admission = z.infer<typeof admissionSchema>;
export type NewAdmission = z.infer<typeof newAdmissionSchema>;
export type AdmissionUpdate = z.infer<typeof admissionUpdateSchema>;

export const listAdmissionsInputSchema = z.object({
  clinicId: z.string().optional(),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  wardId: z.string().optional(),
  roomId: z.string().optional(),
  bedId: z.string().optional(),
  status: admissionStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  query: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const paginatedAdmissionsSchema = z.object({
  data: z.array(admissionSchema),
  total: z.number().int().nonnegative(),
});

export const admissionStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.object({
    admitted: z.number().int().nonnegative(),
    discharged: z.number().int().nonnegative(),
    transferred: z.number().int().nonnegative(),
    deceased: z.number().int().nonnegative(),
  }),
  currentlyAdmitted: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  thisWeek: z.number().int().nonnegative(),
  thisMonth: z.number().int().nonnegative(),
  averageLengthOfStay: z.number().nonnegative(),
});
