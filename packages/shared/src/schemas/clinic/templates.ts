// packages/shared/src/schemas/clinic/templates.ts
import { timestampsShape } from "@pedia/shared/schemas/_helper";
import { z } from "zod";

/**
 * Template body — free-form JSONB. Editor evolves independently of the
 * contract; tighten later if the block union stabilises.
 */
export const templateContentSchema = z.record(z.string(), z.unknown());

export const templateCategorySchema = z.string().min(1).max(100);
export const templateScopeSchema = z.string().min(1).max(100).nullable();

const templateLayerSchema: z.ZodType<{
  children: TemplateLayer[];
  id: string;
  props: Record<string, unknown>;
  type: string;
}> = z.lazy(() =>
  z.object({
    children: z.array(templateLayerSchema),
    id: z.string(),
    props: z.record(z.string(), z.unknown()),
    type: z.string(),
  })
);

export type TemplateLayer = {
  children: TemplateLayer[];
  id: string;
  props: Record<string, unknown>;
  type: string;
};

const templateVariableSchema = z.object({
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .optional(),
  label: z.string(),
  name: z.string(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  type: z.enum(["string", "number", "boolean", "date", "enum"]),
});

export const templateSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string(),
  category: templateCategorySchema,
  layers: z.array(templateLayerSchema),
  variables: z.array(templateVariableSchema),
  scope: templateScopeSchema,
  isActive: z.boolean().nullable(),
  createdById: z.string(),
  ...timestampsShape,
});

export const newTemplateSchema = templateSchema.omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true,
});

export const templateUpdateSchema = templateSchema
  .omit({
    id: true,
    clinicId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type Template = z.infer<typeof templateSchema>;
export type NewTemplate = z.infer<typeof newTemplateSchema>;
export type TemplateUpdate = z.infer<typeof templateUpdateSchema>;
