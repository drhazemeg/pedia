import { PROJECT_STATUS } from "@pedia/shared/constants";
import limax from "limax";
import { z } from "zod";

export const slugSchema = z
  .string()
  .nonempty()
  .max(100)
  .transform((value) => limax(value))
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "Invalid slug format",
  });

export const projectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string(),
  description: z.string(),
  logo: z.url(),
  screenshot: z.url().nullable(),
  repositoryUrl: z.url(),
  websiteUrl: z.url().nullable(),
  content: z.string().nullable(),
  categories: z.array(z.string()),
  status: z.enum(PROJECT_STATUS).default("published"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const paginationSchema = z.object({
  page: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});
export const moneySchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Expected decimal string");
