// packages/shared/src/schemas/clinic/departments.ts
import { timestampsShape, uuidSchema } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

export const departmentSchema = z.object({
  id: uuidSchema,
  code: z.string().max(50),
  name: z.string().max(100),
  description: z.string().max(500).nullable(),
  isActive: z.boolean(),
  ...timestampsShape,
});

export const newDepartmentSchema = departmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const departmentUpdateSchema = newDepartmentSchema.partial();

export type Department = z.infer<typeof departmentSchema>;
export type NewDepartment = z.infer<typeof newDepartmentSchema>;
