// packages/shared/src/schemas/clinic/staff.ts
import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { roleSchema } from "@pedia/shared/schemas/role";
import { z } from "zod";

export const staffSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  role: roleSchema,
  licenseNumber: z.string(),
  avatarColor: z.string(),
  pinHash: z.string().nullable(),
  clinicId: z.string().nullable(),
  phone: z.string().max(32).nullable(),
  bio: z.string().nullable(),
  userId: z.string(),
  email: z.email(),
  isActive: z.boolean(),
  specialty: z.string().nullable(),
  department: z.string().nullable(),
  ...timestampsShape,
});

export const newStaffSchema = staffSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const staffUpdateSchema = newStaffSchema.partial();

export type Staff = z.infer<typeof staffSchema>;
export type NewStaff = z.infer<typeof newStaffSchema>;
export type StaffUpdate = z.infer<typeof staffUpdateSchema>;
