// components/ui/fields/text-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Input } from "@pedia/ui/components/input";
import { Spinner } from "@pedia/ui/components/spinner";
import { cn } from "@pedia/ui/lib/utils";
import { useSelector } from "@tanstack/react-form";
import type * as React from "react";
import { useCallback } from "react";

import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isNumber, isString } from "../core/types";

export interface TextFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur"
> {
  description?: string;
  label: string;
  required?: boolean;
  type?:
    | "text"
    | "email"
    | "password"
    | "tel"
    | "url"
    | "number"
    | "time"
    | "color";
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function TextField(props: TextFieldProps) {
  return (
    <FormFieldSet>
      <TextFieldInner {...props} />
    </FormFieldSet>
  );
}

function TextFieldInner({
  label,
  description,
  required,
  type = "text",
  className,
  ...inputProps
}: TextFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const isValidating = useSelector(field.store, (s) => s.meta.isValidating);

  // The field value can be `string` or `number`:
  //   - number inputs coerce to `number` on change (see handleChange below)
  //   - everything else stores the raw `string` from the input
  //   - initial render can be `undefined` before hydration
  //
  // `boolean` is deliberately excluded — no `<input>` type supported by this
  // field produces a boolean, and letting it through would render "true"/"false"
  // as literal text.
  const value = useFieldValue(
    field,
    (v): v is string | number => isString(v) || isNumber(v),
    type === "number" ? 0 : ""
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "number") {
        const v = e.target.value;
        field.handleChange(v === "" ? "" : Number.parseFloat(v));
      } else {
        field.handleChange(e.target.value);
      }
    },
    [field, type]
  );

  return (
    <>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required}
        </FieldLabel>
        <div className="relative">
          <Input
            aria-invalid={isTouched && !isValid}
            className={cn(className)}
            id={field.name}
            onBlur={field.handleBlur}
            onChange={handleChange}
            type={type}
            value={value}
            {...inputProps}
          />
          {isValidating && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <Spinner className="size-4" />
            </div>
          )}
        </div>
        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

export interface NumberFieldProps {
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  step?: number;
}

export const FormTextField = createFormField<TextFieldProps>(TextField);
