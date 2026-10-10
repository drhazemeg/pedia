import {
  LAB_PRIORITIES,
  LAB_STATUSES,
  LAB_TEST_FLAGS,
  LAB_TEST_STATUSES,
} from "@pedia/shared/constants/enums";
import {
  numericStringSchema,
  timestampsShape,
} from "@pedia/shared/schemas/_helper";
import { z } from "zod";

const labTestDataSchema = z.object({
  id: z.string(),
  testCode: z.string(),
  testName: z.string(),
  category: z.string(),
  sampleType: z.string().optional(),
  referenceRange: z.string().optional(),
  unit: z.string().optional(),
  result: z.string().optional(),
  flag: z.enum(LAB_TEST_FLAGS).optional(),
  status: z.enum(LAB_TEST_STATUSES).optional(),
  isAbnormal: z.boolean().optional(),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const labOrderSchema = z.object({
  id: z.string(),
  labOrderNumber: z.string(),
  patientId: z.string(),
  encounterId: z.string().nullable(),
  orderedByDoctorId: z.string().nullable(),
  orderedById: z.uuid(),
  clinicalIndication: z.string(),
  orderDate: z.coerce.date(),
  status: z.enum(LAB_STATUSES),
  priority: z.enum(LAB_PRIORITIES),
  specimenType: z.string().nullable(),
  specimenCollectionNotes: z.string().nullable(),
  specimenCollectedAt: z.coerce.date().nullable(),
  completedDate: z.coerce.date().nullable(),
  resultsReleasedAt: z.coerce.date().nullable(),
  instructions: z.string().nullable(),
  notes: z.string().nullable(),
  testsJson: z.array(labTestDataSchema),
  ...timestampsShape,
});

export const newLabOrderSchema = labOrderSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    orderDate: z.coerce.date().optional(),
    status: z.enum(LAB_STATUSES).optional(),
    priority: z.enum(LAB_PRIORITIES).optional(),
  });

export const labOrderUpdateSchema = newLabOrderSchema.partial();

export const labTestSchema = z.object({
  id: z.string(),
  code: z.string().max(50),
  name: z.string().max(255),
  description: z.string().max(1000).nullable(),
  category: z.string().max(100).nullable(),
  sampleType: z.string().max(100).nullable(),
  price: numericStringSchema,
  referenceRange: z.string().max(255).nullable(),
  unit: z.string().max(50).nullable(),
  isActive: z.boolean(),
  ...timestampsShape,
});

export const newLabTestSchema = labTestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const labTestUpdateSchema = newLabTestSchema.partial();

export const labOrderItemSchema = z.object({
  id: z.string(),
  labOrderId: z.string(),
  labTestId: z.string().nullable(),
  testNameSnapshot: z.string().max(255),
  priceSnapshot: numericStringSchema,
  status: z.enum(LAB_TEST_STATUSES),
  flag: z.enum(LAB_TEST_FLAGS).nullable(),
  resultValue: z.string().max(255).nullable(),
  resultText: z.string().max(2000).nullable(),
  referenceRangeSnapshot: z.string().max(255).nullable(),
  unitSnapshot: z.string().max(50).nullable(),
  resultedByUserId: z.string().nullable(),
  resultedAt: z.coerce.date().nullable(),
  ...timestampsShape,
});

export const abnormalLabOrderItemSchema = labOrderItemSchema.omit({
  flag: true,
  createdAt: true,
  updatedAt: true,
});

export const newLabOrderItemSchema = labOrderItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LabOrder = z.infer<typeof labOrderSchema>;
export type NewLabOrder = z.infer<typeof newLabOrderSchema>;
export type LabTest = z.infer<typeof labTestSchema>;
export type NewLabTest = z.infer<typeof newLabTestSchema>;
export type LabOrderItem = z.infer<typeof labOrderItemSchema>;
export type NewLabOrderItem = z.infer<typeof newLabOrderItemSchema>;
