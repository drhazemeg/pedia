import { timestampsShape } from "@pedia/shared/schemas/_helper";
import {
  encounterStatusSchema,
  visitTypeSchema,
} from "@pedia/shared/schemas/enums";
import { z } from "zod";

const encounterDataSchema = z.record(z.string(), z.unknown());

export const encounterSchema = z.object({
  id: z.string(),
  encounterNumber: z.string().max(50),
  patientId: z.string(),
  appointmentId: z.string().nullable(),
  providerId: z.string(),
  providerName: z.string(),
  doctorId: z.string().nullable(),
  encounterDate: z.coerce.date(),
  visitType: visitTypeSchema,
  chiefComplaint: z.string(),
  status: encounterStatusSchema,
  signedAt: z.coerce.date().nullable(),
  signedById: z.uuid().nullable(),
  durationMinutes: z.number().int().nullable(),
  followUpDate: z.string().nullable(),
  notes: z.string().nullable(),
  subjectiveJson: encounterDataSchema,
  objectiveJson: encounterDataSchema,
  assessmentJson: encounterDataSchema,
  planJson: encounterDataSchema,
  ...timestampsShape,
});

export const newEncounterSchema = encounterSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: encounterStatusSchema.optional(),
  });

export const encounterUpdateSchema = newEncounterSchema.partial();

export type Encounter = z.infer<typeof encounterSchema>;
export type NewEncounter = z.infer<typeof newEncounterSchema>;
