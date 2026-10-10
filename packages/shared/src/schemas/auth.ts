import { roleSchema } from "@pedia/shared/schemas/role";
import { z } from "zod";

import { timestampsShape, uuidSchema } from "./_helper";

// =============================================================================
// user
// =============================================================================
export const userSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: roleSchema.nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  banExpires: z.date().nullable(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  twoFactorEnabled: z.boolean().nullable(),
  clinicId: z.string().nullable(),
  apiKey: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  ...timestampsShape,
});

export const newUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================================================================
// session
// =============================================================================
export const sessionSchema = z.object({
  id: uuidSchema,
  expiresAt: z.coerce.date(),
  token: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: uuidSchema,
  impersonatedById: z.string().nullable(),
  activeOrganizationId: z.string().nullable(),
  ...timestampsShape,
});

export const newSessionSchema = sessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================================================================
// account
// =============================================================================
export const accountSchema = z.object({
  id: uuidSchema,
  accountId: z.string(),
  providerId: z.string(),
  userId: uuidSchema,
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const newAccountSchema = accountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================================================================
// verification
// =============================================================================
export const verificationSchema = z.object({
  id: uuidSchema,
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  ...timestampsShape,
});

export const newVerificationSchema = verificationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================================================================
// twoFactor
// =============================================================================
export const twoFactorSchema = z.object({
  id: uuidSchema,
  secret: z.string(),
  backupCodes: z.string(),
  userId: uuidSchema,
  verified: z.boolean().nullable(),
  failedVerificationCount: z.number().int().nullable(),
  lockedUntil: z.coerce.date().nullable(),
  ...timestampsShape,
});

// =============================================================================
// organization / member / invitation / rateLimit
// =============================================================================
export const organizationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  metadata: z.string().nullable(),
  ...timestampsShape,
});

export const organizationRoleSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  role: z.string(),
  permission: z.string(),
  ...timestampsShape,
});

export const memberSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  role: z.string(),
  ...timestampsShape,
});

export const invitationSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  email: z.email(),
  role: z.string().nullable(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  inviterId: uuidSchema,
  ...timestampsShape,
});

export const rateLimitSchema = z.object({
  id: uuidSchema,
  key: z.string(),
  count: z.number().int(),
  lastRequest: z.number().int(),
});
