import { PRESCRIPTION_STATUSES } from "@pedia/shared/constants/enums";
import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

const prescriptionItemDataSchema = z.object({
  id: z.string(),
  medicationName: z.string(),
  genericName: z.string().optional(),
  form: z.string(),
  route: z.string(),
  frequency: z.string(),
  durationDays: z.number(),
  dose: z.string().optional(),
  dosePerKg: z.number().optional(),
  calculatedDoseMg: z.number().optional(),
  calculatedLiquidDoseMl: z.number(),
  concentration: z.string().optional(),
  dispenseQuantity: z.string().optional(),
  refills: z.number().optional(),
  substitutionAllowed: z.boolean().optional(),
  patientWeightKg: z.number().optional(),
  instructions: z.string().optional(),
  warnings: z.string().optional(),
  notes: z.string().optional(),
});

export const prescriptionSchema = z.object({
  id: z.string(),
  rxNumber: z.string(),
  patientId: z.string(),
  encounterId: z.string().nullable(),
  doctorId: z.string().nullable(),
  prescriberId: z.string(),
  prescriberName: z.string(),
  prescriberLicense: z.string(),
  prescribedDate: z.string(),
  patientWeightKg: z.number(),
  diagnosis: z.string().nullable(),
  prescriptionItems: z.array(prescriptionItemDataSchema),
  notes: z.string().nullable(),
  status: z.enum(PRESCRIPTION_STATUSES),
  filledAt: z.coerce.date().nullable(),
  filledById: z.string().nullable(),
  discontinuedAt: z.coerce.date().nullable(),
  discontinuedReason: z.string().nullable(),
  ...timestampsShape,
});

export const newPrescriptionSchema = prescriptionSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: z.enum(PRESCRIPTION_STATUSES).optional(),
  });

export const prescriptionUpdateSchema = newPrescriptionSchema.partial();

export const prescriptionItemSchema = z.object({
  id: z.string(),
  prescriptionId: z.string(),
  medicineId: z.string().nullable(),
  medicineNameSnapshot: z.string().max(255),
  dosage: z.string().max(100),
  route: z.string().max(100).nullable(),
  frequency: z.string().max(100),
  duration: z.string().max(100),
  quantity: z.number().int().nullable(),
  instructions: z.string().nullable(),
  ...timestampsShape,
});

export const newPrescriptionItemSchema = prescriptionItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Prescription = z.infer<typeof prescriptionSchema>;
export type NewPrescription = z.infer<typeof newPrescriptionSchema>;
export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;
export type NewPrescriptionItem = z.infer<typeof newPrescriptionItemSchema>;
