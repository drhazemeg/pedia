// components/ui/fields/switch-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Switch } from "@pedia/ui/components/switch";
import { useSelector } from "@tanstack/react-form";
import { useCallback } from "react";

import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isBoolean } from "../core/types";

export interface SwitchFieldProps {
  description?: string;
  label: string;
  required?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function SwitchField(props: SwitchFieldProps) {
  return (
    <FormFieldSet>
      <SwitchFieldInner {...props} />
    </FormFieldSet>
  );
}

function SwitchFieldInner({ label, description, required }: SwitchFieldProps) {
  const { field } = useFieldContext();
  const value = useFieldValue(field, isBoolean, false);
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      field.handleChange(checked);
      field.handleBlur();
    },
    [field]
  );

  return (
    <>
      <FormField orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1.5 leading-snug">
          <FieldLabel className="text-base" htmlFor={field.name}>
            {label}
            {required}
          </FieldLabel>
          {Boolean(description) && (
            <FieldDescription>{description}</FieldDescription>
          )}
        </div>
        <Switch
          aria-invalid={isTouched && !isValid}
          checked={value}
          id={field.name}
          onBlur={field.handleBlur}
          onCheckedChange={handleCheckedChange}
        />
      </FormField>
      <FormFieldError />
    </>
  );
}

export const FormSwitchField = createFormField<SwitchFieldProps>(SwitchField);
