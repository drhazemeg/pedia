"use client";

import { Button } from "@pedia/ui/components/button";
import { formContext } from "@pedia/ui/components/tanform/core/context";
import { cn } from "@pedia/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import type React from "react";
import { useState } from "react";
import type { z } from "zod";

import AutoFormObject from "./fields/object";
import type { ZodObjectOrWrapped } from "./helpers";
import {
  getDefaultValues,
  getObjectFormSchema,
  hydrateDefaults,
} from "./helpers";
import type { Dependency, FieldConfig } from "./types";

export function AutoFormSubmit({
  children,
  className,
  disabled,
}: {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button className={className} disabled={disabled} type="submit">
      {children ?? "Submit"}
    </Button>
  );
}

function AutoForm<SchemaType extends ZodObjectOrWrapped>({
  formSchema,
  values: valuesProp,
  onValuesChange: onValuesChangeProp,
  onParsedValuesChange,
  onSubmit: onSubmitProp,
  fieldConfig,
  children,
  className,
  dependencies,
}: {
  formSchema: SchemaType;
  values?: Partial<z.infer<SchemaType>>;
  onValuesChange?: (values: Partial<z.infer<SchemaType>>) => void;
  onParsedValuesChange?: (values: Partial<z.infer<SchemaType>>) => void;
  onSubmit?: (values: z.infer<SchemaType>) => void;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  children?:
    | React.ReactNode
    | ((formState: {
        isSubmitting: boolean;
        errors: unknown;
      }) => React.ReactNode);
  className?: string;
  dependencies?: Array<Dependency<z.infer<SchemaType>>>;
}) {
  const objectFormSchema = getObjectFormSchema(formSchema);

  const flatDefaults = getDefaultValues(objectFormSchema, fieldConfig as never);
  const defaultValues = hydrateDefaults(flatDefaults);

  const [schemaSubmitError, setSchemaSubmitError] = useState<string | null>(
    null
  );

  const form = useForm({
    defaultValues: (valuesProp ?? defaultValues) as z.infer<SchemaType>,
    validators: {
      onChange: ({ value }) => {
        onValuesChangeProp?.(value as Partial<z.infer<SchemaType>>);
        const parsed = formSchema.safeParse(value);
        if (parsed.success) {
          onParsedValuesChange?.(parsed.data as Partial<z.infer<SchemaType>>);
          return;
        }
        return parsed.error.issues.reduce<Record<string, string>>(
          (acc, issue) => {
            const path = issue.path.join(".");
            if (path) acc[path] = issue.message;
            return acc;
          },
          {}
        );
      },
    },
    onSubmit: async ({ value }) => {
      setSchemaSubmitError(null);
      const parsed = formSchema.safeParse(value);
      if (parsed.success) {
        await onSubmitProp?.(parsed.data as z.infer<SchemaType>);
      } else {
        setSchemaSubmitError(
          parsed.error.issues
            .map((i) =>
              i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message
            )
            .join(" · ")
        );
      }
    },
  });

  const renderChildren =
    typeof children === "function"
      ? children({
          isSubmitting: form.state.isSubmitting,
          errors: form.state.errors,
        })
      : children;

  return (
    <div className="w-full">
      <formContext.Provider value={form}>
        <form
          className={cn("space-y-5", className)}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <AutoFormObject
            dependencies={dependencies as never}
            fieldConfig={fieldConfig as never}
            schema={objectFormSchema}
          />

          {schemaSubmitError ? (
            <div
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
              role="alert"
            >
              {schemaSubmitError}
            </div>
          ) : null}

          {renderChildren}
        </form>
      </formContext.Provider>
    </div>
  );
}

export default AutoForm;
