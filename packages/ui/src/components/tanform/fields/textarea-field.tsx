// fields/textarea-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Textarea } from "@pedia/ui/components/textarea";
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
import { isString } from "../core/types";

export interface TextareaFieldProps extends Omit<
  React.ComponentProps<"textarea">,
  "value" | "onChange" | "onBlur"
> {
  description?: string;
  label: string;
  maxLength?: number;
  required?: boolean;
  showCount?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function TextareaField(props: TextareaFieldProps) {
  return (
    <FormFieldSet>
      <TextareaFieldInner {...props} />
    </FormFieldSet>
  );
}

function TextareaFieldInner({
  label,
  description,
  required,
  maxLength,
  showCount = Boolean(maxLength),
  className,
  ...textareaProps
}: TextareaFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isString, "");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      field.handleChange(e.target.value);
    },
    [field]
  );

  return (
    <>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required}
        </FieldLabel>
        <Textarea
          aria-invalid={isTouched && !isValid}
          className={className}
          id={field.name}
          maxLength={maxLength}
          onBlur={field.handleBlur}
          onChange={handleChange}
          value={value}
          {...textareaProps}
        />
        {showCount ? (
          <div className="text-muted-foreground text-right text-xs tabular-nums">
            {value.length}
            {maxLength ? ` / ${maxLength}` : ""}
          </div>
        ) : null}
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FormField>
      <FormFieldError />
    </>
  );
}

export const FormTextareaField =
  createFormField<TextareaFieldProps>(TextareaField);
