// components/forms/fields/date-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Input } from "@pedia/ui/components/input";
import { cn } from "@pedia/ui/lib/utils";
import { useSelector } from "@tanstack/react-form";
import type * as React from "react";
import { useCallback } from "react";

import { isString } from "../core//types";
import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";

// ============================================================================
// Date Field
// ============================================================================

interface DateFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur" | "type"
> {
  description?: string;
  label: string;
  max?: string; // e.g., "2026-12-31"
  min?: string; // e.g., "2026-01-01"
  required?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function DateField(props: DateFieldProps) {
  return (
    <FormFieldSet>
      <DateFieldInner {...props} />
    </FormFieldSet>
  );
}

function DateFieldInner({
  label,
  description,
  required,
  className,
  ...inputProps
}: DateFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isString, "");
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <Input
          aria-invalid={isTouched && !isValid}
          className={cn(className)}
          id={field.name}
          onBlur={field.handleBlur}
          onChange={handleInputChange}
          type="date"
          value={value}
          {...inputProps}
        />
        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

// ============================================================================
// Time Field
// ============================================================================

export interface TimeFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur" | "type"
> {
  description?: string;
  label: string;
  required?: boolean;
  step?: number | string;
}

/**
 * Outer wrapper. See `DateField` above.
 */
export function TimeField(props: TimeFieldProps) {
  return (
    <FormFieldSet>
      <TimeFieldInner {...props} />
    </FormFieldSet>
  );
}

function TimeFieldInner({
  label,
  description,
  required,
  step = 900,
  className,
  ...inputProps
}: TimeFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isString, "");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

        <Input
          aria-invalid={isTouched && !isValid}
          className={cn(className)}
          id={field.name}
          onBlur={field.handleBlur}
          onChange={handleChange}
          required={required}
          step={step}
          type="time"
          value={value}
          {...inputProps}
        />

        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

// ============================================================================
// DateTime Field (Combined)
// ============================================================================

interface DateTimeFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur" | "type"
> {
  description?: string;
  label: string;
  max?: string;
  min?: string;
  required?: boolean;
  step?: number;
}

/**
 * Outer wrapper. See `DateField` above.
 */
export function DateTimeField(props: DateTimeFieldProps) {
  return (
    <FormFieldSet>
      <DateTimeFieldInner {...props} />
    </FormFieldSet>
  );
}

function DateTimeFieldInner({
  label,
  description,
  required,
  min,
  max,
  step = 900,
  className,
  ...inputProps
}: DateTimeFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isString, "");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <Input
          aria-invalid={isTouched && !isValid}
          className={className}
          id={field.name}
          max={max}
          min={min}
          onBlur={field.handleBlur}
          onChange={handleChange}
          required={required}
          step={step}
          type="datetime-local"
          value={value}
          {...inputProps}
        />
        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

// ============================================================================
// Exports
// ============================================================================

export const FormDateTimeField =
  createFormField<DateTimeFieldProps>(DateTimeField);
export const FormDateField = createFormField<DateFieldProps>(DateField);
export const FormTimeField = createFormField<TimeFieldProps>(TimeField);
