"use client";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Accordion,
} from "@pedia/ui/components/accordion";
import { Button } from "@pedia/ui/components/button";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@pedia/ui/components/form";
import { Input } from "@pedia/ui/components/input";
import { Separator } from "@pedia/ui/components/separator";
import {
  useFieldContext,
  useFormContext,
} from "@pedia/ui/components/tanform/core/context";
import type { FormFieldSlot } from "@pedia/ui/components/tanform/core/types";
import { useSelector } from "@tanstack/react-form";
import { Plus, Trash } from "lucide-react";
import * as z from "zod";

import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from "../config";
import resolveDependencies from "../dependencies";
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  getObjectFormSchema,
  sortFieldsByOrder,
  zodToHtmlInputProps,
} from "../helpers";
import type { Dependency, FieldConfig, FieldConfigItem } from "../types";
const EMPTY_PATH: readonly string[] = Object.freeze([]);
const EMPTY_DEPENDENCIES: readonly Dependency<any>[] = Object.freeze([]);

function DefaultParent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Resolve dependencies reactively. `getValue` reads from TanStack Form's
 * store, so the caller wraps this in `useSelector` at the top of the
 * component when reactive updates matter.
 */
function resolveDeps(
  dependencies: readonly Dependency<any>[] | undefined,
  fieldName: string,
  values: Record<string, unknown>
) {
  if (!dependencies?.length) {
    return {
      isDisabled: false,
      isHidden: false,
      isRequired: false,
      overrideOptions: undefined,
    };
  }
  return resolveDependencies(
    dependencies as Dependency<any>[],
    fieldName,
    (n) => values[n]
  );
}

export default function AutoFormObject({
  schema,
  fieldConfig,
  path = EMPTY_PATH,
  dependencies = EMPTY_DEPENDENCIES,
}: {
  schema: z.ZodType;
  fieldConfig?: FieldConfig<any>;
  path?: readonly string[];
  dependencies?: readonly Dependency<any>[];
}) {
  const form = useFormContext();
  const FieldSlot = form.Field as FormFieldSlot;

  // Reactive read of all values. Every dependency check uses this snapshot.
  const values = useSelector(form.store, (s) => s.values) as Record<
    string,
    unknown
  >;

  const { shape } = getObjectFormSchema(schema);

  const sortedFieldKeys = sortFieldsByOrder(
    fieldConfig as never,
    Object.keys(shape)
  );

  return (
    <Accordion className="space-y-5 border-none">
      {sortedFieldKeys.map((name) => {
        const item = shape[name] as z.ZodType;
        const zodBaseType = getBaseType(item);
        const itemName = beautifyObjectName(name);
        const key = [...path, name].join(".");

        const {
          isHidden,
          isDisabled,
          isRequired: isRequiredByDependency,
          overrideOptions,
        } = resolveDeps(dependencies as never, name, values);

        if (isHidden) return null;

        // ── Nested object ───────────────────────────────────
        if (zodBaseType === "ZodObject" || zodBaseType === "object") {
          const objectFieldConfig: FieldConfigItem =
            (fieldConfig?.[name] as FieldConfigItem) ?? {};

          if (typeof objectFieldConfig.fieldType === "function") {
            const CustomComponent =
              objectFieldConfig.fieldType as React.ComponentType<any>;
            const ParentElement =
              objectFieldConfig.renderParent ?? DefaultParent;
            const zodInputProps = zodToHtmlInputProps(item);
            let isRequired =
              isRequiredByDependency ||
              Boolean(zodInputProps.required) ||
              false;
            if (objectFieldConfig.inputProps?.required !== undefined) {
              isRequired = objectFieldConfig.inputProps.required;
            }

            return (
              <FieldSlot key={key} name={key}>
                {(field) => {
                  const fieldProps = {
                    ...zodInputProps,
                    ...objectFieldConfig.inputProps,
                    disabled:
                      objectFieldConfig.inputProps?.disabled ?? isDisabled,
                    value: field.state.value,
                    onChange: field.handleChange,
                    onBlur: field.handleBlur,
                    name: field.name,
                    id: `field-${key}`,
                  };
                  return (
                    <ParentElement key={`${key}.parent`}>
                      <CustomComponent
                        field={field}
                        fieldConfigItem={objectFieldConfig}
                        fieldProps={fieldProps}
                        isRequired={isRequired}
                        label={objectFieldConfig.label ?? itemName}
                        zodInputProps={zodInputProps}
                        zodItem={item}
                      />
                    </ParentElement>
                  );
                }}
              </FieldSlot>
            );
          }

          return (
            <AccordionItem className="border-none" key={key} value={key}>
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  dependencies={dependencies}
                  fieldConfig={(fieldConfig?.[name] as FieldConfig<any>) ?? {}}
                  path={[...path, name]}
                  schema={item}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }

        // ── Array ───────────────────────────────────────────
        if (zodBaseType === "ZodArray" || zodBaseType === "array") {
          const arrayFieldConfig: FieldConfigItem =
            (fieldConfig?.[name] as FieldConfigItem) ?? {};
          return (
            <AutoFormArray
              fieldConfig={arrayFieldConfig}
              item={item as unknown as z.ZodArray<any>}
              key={key}
              name={name}
              path={[...path, name]}
            />
          );
        }

        // ── Leaf field ──────────────────────────────────────
        const fieldConfigItem: FieldConfigItem =
          (fieldConfig?.[name] as FieldConfigItem) ?? {};
        const zodInputProps = zodToHtmlInputProps(item);

        let isRequired =
          isRequiredByDependency || Boolean(zodInputProps.required) || false;
        if (fieldConfigItem.inputProps?.required !== undefined) {
          isRequired = fieldConfigItem.inputProps.required;
        }

        let leafItem: z.ZodType = item;
        if (overrideOptions) {
          leafItem = z.enum(
            overrideOptions as unknown as [string, ...string[]]
          );
        }

        const inputType =
          fieldConfigItem.fieldType ??
          DEFAULT_ZOD_HANDLERS[zodBaseType] ??
          "fallback";

        const InputComponent =
          typeof inputType === "function"
            ? inputType
            : INPUT_COMPONENTS[inputType];

        if (!InputComponent) {
          return (
            <span className="text-red-500" key={key}>
              No input component found for type: {zodBaseType}
            </span>
          );
        }

        const ParentElement = fieldConfigItem.renderParent ?? DefaultParent;

        return (
          <FieldSlot key={key} name={key}>
            {(field) => {
              const defaultValue = fieldConfigItem.inputProps?.defaultValue;
              const value = field.state.value ?? defaultValue ?? "";

              const fieldProps = {
                ...zodInputProps,
                ...fieldConfigItem.inputProps,
                className:
                  typeof fieldConfigItem.inputProps?.className === "string"
                    ? fieldConfigItem.inputProps.className
                    : undefined,
                disabled: fieldConfigItem.inputProps?.disabled ?? isDisabled,
                value,
                onChange: field.handleChange,
                onBlur: field.handleBlur,
                name: field.name,
                id: `field-${key}`,
              };

              return (
                <ParentElement key={`${key}.parent`}>
                  <InputComponent
                    className={fieldProps.className}
                    field={field}
                    fieldConfigItem={fieldConfigItem}
                    fieldProps={fieldProps as never}
                    isRequired={isRequired}
                    label={itemName}
                    zodInputProps={zodInputProps}
                    zodItem={leafItem}
                  />
                </ParentElement>
              );
            }}
          </FieldSlot>
        );
      })}
    </Accordion>
  );
}
export type ArrayFieldConfig = {
  label?: string;
} & Record<string, unknown>;

export function ObjectAutoFormArray({
  name,
  path = EMPTY_PATH,
  fieldConfig,
  itemDefType,
  title,
  value,
}: {
  name: string;
  path?: readonly string[]; // ✅ changed
  fieldConfig?: ArrayFieldConfig;
  itemDefType: z.ZodObject<any, any>;
  title: string;
  value: string;
}) {
  const field = useFieldContext();
  const values = useSelector(
    field.store,
    (s) => (s.value as Array<Record<string, unknown>> | undefined) ?? []
  );

  const addItem = () => field.field.handleChange([...values, {}]);
  const removeItem = (index: number) =>
    field.field.handleChange(
      values.filter((_value, itemIndex) => itemIndex !== index)
    );

  return (
    <AccordionItem className="border-none" value={value}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>
        {values.map((_value, index) => (
          <div className="mt-4 flex flex-col" key={`${value}.${index}`}>
            <AutoFormObject
              dependencies={[]}
              fieldConfig={fieldConfig as never}
              path={[...path, name, index.toString()]}
              schema={itemDefType}
            />
            <div className="my-4 flex justify-end">
              <Button
                aria-label={`Remove ${title} item ${index + 1}`}
                onClick={() => removeItem(index)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash className="size-4" />
              </Button>
            </div>
            <Separator />
          </div>
        ))}
        <Button
          className="mt-4 flex items-center"
          onClick={addItem}
          type="button"
          variant="secondary"
        >
          <Plus className="me-2" size={16} />
          Add
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

/* ------------------------------------------------------------------ */
/* Schema introspection                                                */
/* ------------------------------------------------------------------ */

function getDefType(schema: z.ZodType): string {
  return (
    (schema as { _zod?: { def?: { type?: string } } })._zod?.def?.type ?? ""
  );
}

function getArrayElementType(item: z.ZodType): z.ZodType | null {
  const def = (
    item as {
      _zod?: { def?: { element?: z.ZodType; innerType?: z.ZodType } };
    }
  )._zod?.def;
  const defType = getDefType(item);

  if (defType === "array") return def?.element ?? null;
  if (["default", "optional", "nullable"].includes(defType)) {
    return def?.innerType ? getArrayElementType(def.innerType) : null;
  }
  return null;
}

function getPrimitiveDefault(itemSchema: z.ZodType): unknown {
  const base = getBaseSchema(itemSchema);
  if (!base) return "";
  switch (getBaseType(base)) {
    case "ZodBoolean":
    case "boolean":
      return false;
    case "ZodNumber":
    case "number":
    case "int":
    case "float":
      return 0;
    default:
      return "";
  }
}

function isBooleanType(t: string): boolean {
  return t === "ZodBoolean" || t === "boolean";
}

function isNumberType(t: string): boolean {
  return t === "ZodNumber" || t === "number" || t === "int" || t === "float";
}

/* ------------------------------------------------------------------ */
/* Field config type                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export function AutoFormArray({
  name,
  item,
  path = EMPTY_PATH, // ← changed from []
  fieldConfig,
}: {
  name: string;
  item: z.ZodArray<any> | z.ZodDefault<any>;
  path?: readonly string[];
  fieldConfig?: ArrayFieldConfig;
}) {
  const itemDefType = getArrayElementType(item);
  const elementBaseSchema = itemDefType ? getBaseSchema(itemDefType) : null;
  const elementPrimitiveType = elementBaseSchema
    ? getBaseType(elementBaseSchema)
    : "";

  const isObjectArray =
    !!itemDefType &&
    (elementPrimitiveType === "ZodObject" || elementPrimitiveType === "object");

  const title = fieldConfig?.label ?? beautifyObjectName(name);
  const dottedPath = [...path, name].join(".");

  if (isObjectArray) {
    return (
      <ObjectAutoFormArray
        fieldConfig={fieldConfig}
        itemDefType={itemDefType as z.ZodObject<any, any>}
        name={name}
        path={path}
        title={title}
        value={dottedPath}
      />
    );
  }

  return (
    <PrimitiveAutoFormArray
      itemDefType={itemDefType}
      title={title}
      value={dottedPath}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Primitive array — items are scalars                                 */
/* ------------------------------------------------------------------ */

function PrimitiveAutoFormArray({
  itemDefType,
  title,
  value,
}: {
  itemDefType: z.ZodType | null;
  title: string;
  value: string;
}) {
  const field = useFieldContext();
  const values = useSelector(
    field.store,
    (s) => (s.value as unknown[] | undefined) ?? []
  );
  const list = Array.isArray(values) ? values : [];

  const appendItem = () => {
    const def = itemDefType ? getPrimitiveDefault(itemDefType) : "";
    field.field.handleChange([...list, def]);
  };

  const removeItem = (index: number) =>
    field.field.handleChange(
      list.filter((_value, itemIndex) => itemIndex !== index)
    );

  return (
    <AccordionItem className="border-none" value={value}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>
        {list.map((_value, index) => (
          <div className="mt-4 flex flex-col" key={`${value}.${index}`}>
            {itemDefType ? (
              <PrimitiveArrayRow index={index} itemSchema={itemDefType} />
            ) : null}
            <div className="my-4 flex justify-end">
              <Button
                aria-label={`Remove ${title} item ${index + 1}`}
                onClick={() => removeItem(index)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash className="size-4" />
              </Button>
            </div>
            <Separator />
          </div>
        ))}
        <Button
          className="mt-4 flex items-center"
          onClick={appendItem}
          type="button"
          variant="secondary"
        >
          <Plus className="me-2" size={16} />
          Add
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

/* ------------------------------------------------------------------ */
/* Primitive array row — reads/writes one slot of the parent array    */
/* ------------------------------------------------------------------ */

function PrimitiveArrayRow({
  itemSchema,
  index,
}: {
  itemSchema: z.ZodType;
  index: number;
}) {
  const parentField = useFieldContext();
  const values = useSelector(
    parentField.store,
    (s) => (s.value as unknown[] | undefined) ?? []
  );
  const currentValue = Array.isArray(values) ? values[index] : undefined;

  const baseSchema = getBaseSchema(itemSchema);
  const t = baseSchema ? getBaseType(baseSchema) : "";

  const setValue = (next: unknown) =>
    parentField.field.handleChange(
      values.map((value, itemIndex) => (itemIndex === index ? next : value))
    );

  if (isBooleanType(t)) {
    const checked = Boolean(currentValue);
    return (
      <FormItem className="flex flex-row items-center gap-2 space-y-0">
        <FormControl>
          <input
            aria-label={`Row ${index + 1} value`}
            checked={checked}
            onChange={(e) => setValue(e.target.checked)}
            type="checkbox"
          />
        </FormControl>
        <FormLabel className="cursor-pointer font-normal">
          {checked ? "Selected" : "Not selected"}
        </FormLabel>
        <FormMessage />
      </FormItem>
    );
  }

  const numeric = isNumberType(t);
  return (
    <FormItem className="space-y-2">
      <FormLabel className="sr-only">Row value</FormLabel>
      <FormControl>
        <Input
          onChange={(ev) => {
            if (numeric) {
              const n = ev.target.valueAsNumber;
              setValue(Number.isNaN(n) ? undefined : n);
            } else {
              setValue(ev.target.value);
            }
          }}
          type={numeric ? "number" : "text"}
          value={
            currentValue === undefined || currentValue === null
              ? ""
              : String(currentValue)
          }
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
