import { z } from "zod";

export const ROLE_VALUES = ["admin", "doctor", "patient", "staff"] as const;

export const roleSchema = z.enum(ROLE_VALUES);
export type Role = z.infer<typeof roleSchema>;

export const rolesMapSchema = z.record(z.string(), roleSchema);
export type RolesMap = z.infer<typeof rolesMapSchema>;

export const ROLES_MAP = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  STAFF: "staff",
  PATIENT: "patient",
} as const satisfies RolesMap;

export const DEFAULT_ROLE: Role = "doctor";
export const ADMIN_ROLES: Role[] = ["admin"];
