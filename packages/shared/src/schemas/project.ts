import { PROJECT_STATUS } from "@pedia/shared/constants";
import limax from "limax";
import { z } from "zod";

const slugSchema = z
  .string()
  .nonempty()
  .max(100)
  .transform((value) => limax(value))
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "Invalid slug format",
  });

const projectField = {
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
  status: z.enum(PROJECT_STATUS).default("published"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};

const githubField = {
  owner: z.string(),
  repo: z.string(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  fetchedAt: z.coerce.date(),
};

export const getProjectBySlugInputSchema = z.object({
  slug: slugSchema,
});

export const getProjectBySlugOutputSchema = z.object({
  ...projectField,
  github: z.object(githubField),
});

export const listProjectsInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const listProjectItemSchema = z
  .object({
    ...projectField,
    github: z.object(githubField),
  })
  .omit({ content: true });

const paginationOutputSchema = z.object({
  page: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const listProjectsOutputSchema = z.object({
  projects: z.array(listProjectItemSchema),
  pagination: paginationOutputSchema,
});

export const searchSortSchema = z.enum([
  "newest",
  "oldest",
  "name",
  "most-stars",
  "most-forks",
]);

export type SearchSortType = z.infer<typeof searchSortSchema>;

export const searchProjectsInputSchema = z.object({
  q: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value === undefined || value === "" ? undefined : value
    ),
  category: z.string().trim().min(1).max(100).optional(),
  sort: searchSortSchema.optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const searchProjectsOutputSchema = z.object({
  projects: z.array(
    listProjectItemSchema.extend({ categories: z.array(z.string()) })
  ),
  pagination: paginationOutputSchema,
});

export const categoryItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const listCategoriesInputSchema = z.object({});

export const listCategoriesOutputSchema = z.object({
  categories: z.array(categoryItemSchema),
});

// /**
//  * Template body. Kept as a `Record<string, unknown>` on the wire rather than
//  * a strongly-typed block union because the editor evolves independently of
//  * the API contract. If the block schema stabilises, replace this with a
//  * discriminated union — the rest of the schema does not need to change.
//  */
// export const templateContentSchema = z.record(z.string(), z.unknown())

// /**
//  * Which clinical workflow a template targets. Kept as a plain `string`
//  * (nullable) rather than an enum because the set is expected to grow
//  * (`'encounter' | 'prescription' | 'lab' | ...`) and today the DB column
//  * is `text` with no CHECK constraint.
//  */
// export const templateScopeSchema = z.string().min(1).max(100).nullable()

// export const templateCategorySchema = z.string().min(1).max(100)

// /**
//  * Slug: lowercased, hyphen-separated, no leading/trailing dashes.
//  * Matches the DB index `templates_clinic_slug_idx` semantics (unique per
//  * clinic). Uses `limax` for transliteration, same as the project slug.
//  */
// export const templateSlugSchema = z
// 	.string()
// 	.nonempty()
// 	.max(255)
// 	.transform((value) => limax(value))
// 	.refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
// 		message: 'Invalid slug format',
// 	})

// /**
//  * The canonical read schema. Every template endpoint returns this shape.
//  * Fields match the `templates` table 1:1 — if the table gains a column,
//  * add it here and to the contract.
//  */
// export const templateSchema = z.object({
// 	id: z.uuid(),
// 	clinicId: z.uuid(),
// 	name: z.string().min(1).max(255),
// 	slug: templateSlugSchema,
// 	description: z.string().nullable(),
// 	category: templateCategorySchema,
// 	content: templateContentSchema,
// 	scope: templateScopeSchema,
// 	isActive: z.boolean(),
// 	parentTemplateId: z.uuid().nullable(),
// 	createdBy: z.uuid(),
// 	createdAt: z.coerce.date(),
// 	updatedAt: z.coerce.date(),
// })

// /**
//  * The insert shape: everything the DB defaults or generates is removed.
//  * This is what a create endpoint accepts.
//  */
// export const newTemplateSchema = templateSchema.omit({
// 	id: true,
// 	clinicId: true,
// 	createdAt: true,
// 	updatedAt: true,
// 	parentTemplateId: true, // set via a separate "fork" endpoint
// 	createdBy: true, // derived from the session
// })

// /**
//  * The patch shape: every field optional, but not the read-only ones.
//  * A partial `templateSchema` would also make `id` optional, which is a bug
//  * waiting to happen — the caller cannot change `id`.
//  */
// export const templateUpdateSchema = templateSchema
// 	.omit({
// 		id: true,
// 		clinicId: true,
// 		createdAt: true,
// 		updatedAt: true,
// 		parentTemplateId: true,
// 		createdBy: true,
// 	})
// 	.partial()
