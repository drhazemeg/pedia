// components/ui/fields/checkbox-field.tsx

import { Checkbox } from "@pedia/ui/components/checkbox";
import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { useSelector } from "@tanstack/react-form";
import * as React from "react";

import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isBoolean } from "../core/types";

export interface CheckboxFieldProps {
  description?: string;
  label: string;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function CheckboxField(props: CheckboxFieldProps) {
  return (
    <FormFieldSet>
      <CheckboxFieldInner {...props} />
    </FormFieldSet>
  );
}

function CheckboxFieldInner({ label, description }: CheckboxFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const value = useFieldValue(field, isBoolean, false);
  const handleCheckedChange = React.useCallback(
    (checked: boolean | "indeterminate") => {
      field.handleChange(checked === true);
      field.handleBlur();
    },
    [field]
  );

  return (
    <FormField orientation="horizontal">
      <Checkbox
        aria-invalid={isTouched && !isValid}
        checked={value}
        onCheckedChange={handleCheckedChange}
      />
      <div className="flex flex-1 flex-col gap-1.5 leading-snug">
        <FieldLabel className="leading-none">{label}</FieldLabel>
        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
        <FormFieldError />
      </div>
    </FormField>
  );
}

export const FormCheckboxField =
  createFormField<CheckboxFieldProps>(CheckboxField);
