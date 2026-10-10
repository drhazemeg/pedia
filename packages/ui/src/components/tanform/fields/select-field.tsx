// components/ui/fields/select-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pedia/ui/components/select";
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

export type Option = { label: string; value: string };

export interface SelectFieldProps {
  children?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  label: string;
  options: readonly Option[];
  placeholder?: string;
  required?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 *
 * `children` is rendered OUTSIDE the fieldset (as before) — it's a caller-
 * controlled extension slot, not a field-consuming region.
 */
export function SelectField({ children, ...props }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <FormFieldSet>
        <SelectFieldInner {...props} />
      </FormFieldSet>
      {children}
    </div>
  );
}

function SelectFieldInner({
  label,
  description,
  required,
  disabled,
  options,
  placeholder = "Select an option",
}: Omit<SelectFieldProps, "children">) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isString, "");

  // Base UI Select needs `items` to resolve labels for the trigger.

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) field.handleBlur();
    },
    [field]
  );

  const handleValueChange = useCallback(
    (newValue: string | null) => {
      // Base UI passes `null` when the value is cleared
      field.handleChange(newValue ?? "");
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

        <Select
          disabled={disabled}
          onOpenChange={handleOpenChange}
          onValueChange={handleValueChange}
          value={value}
        >
          <SelectTrigger aria-invalid={isTouched && !isValid} id={field.name}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

export const FormSelectField = createFormField<SelectFieldProps>(SelectField);
