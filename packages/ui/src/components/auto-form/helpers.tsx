// components/auto-form/helpers.tsx
import { z } from "zod";

import type { FieldConfig } from "./types";

// ─── Type Guards ───────────────────────────────────────────────────────

export function getDefTypeName(schema: z.ZodType): string {
  const def = (schema as unknown as { _zod?: { def?: { type?: string } } })._zod
    ?.def;
  return def?.type ?? "";
}

export function getBaseSchema<T extends z.ZodType>(schema: T): z.ZodType {
  const def = (
    schema as unknown as { _zod?: { def?: { innerType?: z.ZodType } } }
  )._zod?.def;
  if (def?.innerType) {
    return getBaseSchema(def.innerType);
  }
  return schema;
}

export function getBaseType(schema: z.ZodType): string {
  const base = getBaseSchema(schema);
  return getDefTypeName(base);
}

export function getDefaultValueInZodStack(schema: z.ZodType): unknown {
  const def = (
    schema as unknown as { _zod?: { def?: { defaultValue?: unknown } } }
  )._zod?.def;
  if (def?.defaultValue !== undefined) {
    return def.defaultValue;
  }
  const base = getBaseSchema(schema);
  const type = getDefTypeName(base);

  switch (type) {
    case "boolean":
      return false;
    case "number":
    case "int":
    case "float":
      return 0;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

export function beautifyObjectName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

export function zodToHtmlInputProps(
  schema: z.ZodType
): Record<string, unknown> {
  const base = getBaseSchema(schema);
  const type = getBaseType(base);
  const props: Record<string, unknown> = {};

  if (type === "string") {
    props.type = "text";
  } else if (type === "number" || type === "int" || type === "float") {
    props.type = "number";
  } else if (type === "boolean") {
    props.type = "checkbox";
  }

  return props;
}

export function sortFieldsByOrder<SchemaType extends z.ZodRawShape>(
  fieldConfig: FieldConfig<z.infer<z.ZodObject<SchemaType>>> | undefined,
  keys: string[]
): string[] {
  if (!fieldConfig) return keys;

  return [...keys].toSorted((a, b) => {
    const orderA =
      (fieldConfig[a as keyof typeof fieldConfig] as { order?: number })
        ?.order ?? 999;
    const orderB =
      (fieldConfig[b as keyof typeof fieldConfig] as { order?: number })
        ?.order ?? 999;
    return orderA - orderB;
  });
}

export function getObjectFormSchema(
  schema: z.ZodObject<z.ZodRawShape> | z.ZodType
): z.ZodObject<z.ZodRawShape> {
  const base = getBaseSchema(schema);
  if (base instanceof z.ZodObject) {
    return base;
  }
  return base as z.ZodObject<z.ZodRawShape>;
}

export type ZodObjectOrWrapped =
  | z.ZodObject<z.ZodRawShape>
  | z.ZodType<z.infer<z.ZodObject<z.ZodRawShape>>>;

/**
 * Get all default values from a Zod schema.
 * Returns a flat record with dotted keys.
 */
export function getDefaultValues<Schema extends z.ZodObject<z.ZodRawShape>>(
  schema: Schema,
  fieldConfig?: FieldConfig<z.infer<Schema>>
): Record<string, unknown> | null {
  if (!schema) return null;
  const shape = schema.shape;
  const defaultValues: Record<string, unknown> = {};
  if (!shape) return defaultValues;

  for (const key of Object.keys(shape)) {
    const item = shape[key] as z.ZodType;

    if (getBaseType(item) === "object") {
      const defaultItems = getDefaultValues(
        getBaseSchema(item) as z.ZodObject<z.ZodRawShape>,
        fieldConfig?.[key] as FieldConfig<z.infer<Schema>>
      );

      if (defaultItems !== null) {
        for (const defaultItemKey of Object.keys(defaultItems)) {
          defaultValues[`${key}.${defaultItemKey}`] =
            defaultItems[defaultItemKey];
        }
      }
    } else {
      let defaultValue = getDefaultValueInZodStack(item);
      const fieldItemConfig = fieldConfig?.[key] as
        | { inputProps?: { defaultValue?: unknown } }
        | undefined;
      if (
        (defaultValue === undefined ||
          defaultValue === null ||
          defaultValue === "") &&
        fieldItemConfig?.inputProps
      ) {
        defaultValue = fieldItemConfig.inputProps.defaultValue;
      }
      if (defaultValue !== undefined) {
        defaultValues[key] = defaultValue;
      }
    }
  }

  return defaultValues;
}

/**
 * Convert a flat `{ "a.b": 1 }` record into a nested `{ a: { b: 1 } }` object.
 */
export function hydrateDefaults(
  flat: Record<string, unknown> | null
): Record<string, unknown> {
  if (!flat) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split(".");
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) continue;
      if (typeof cur[part] !== "object" || cur[part] === null) {
        cur[part] = {};
      }
      cur = cur[part] as Record<string, unknown>;
    }
    const lastPart = parts.at(-1);
    if (lastPart !== undefined) {
      cur[lastPart] = v;
    }
  }
  return out;
}
