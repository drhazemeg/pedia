// components/ui/fields/radio-group-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Label } from "@pedia/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@pedia/ui/components/radio-group";

import {
  createFormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isString } from "../core/types";

type Option = { value: string; label: string };

export interface RadioGroupFieldProps {
  description?: string;
  label: string;
  options: Option[];
  required?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function RadioGroupField(props: RadioGroupFieldProps) {
  return (
    <FormFieldSet>
      <RadioGroupFieldInner {...props} />
    </FormFieldSet>
  );
}

function RadioGroupFieldInner({
  label,
  description,
  required,
  options,
}: RadioGroupFieldProps) {
  const { field } = useFieldContext();
  const value = useFieldValue(field, isString, "");

  return (
    <>
      <FieldLabel>
        {label}
        {required}
      </FieldLabel>
      {Boolean(description) && (
        <FieldDescription>{description}</FieldDescription>
      )}
      <RadioGroup
        className="flex flex-wrap gap-x-6 gap-y-2"
        onBlur={field.handleBlur}
        onValueChange={field.handleChange}
        value={value}
      >
        {options.map((opt) => (
          <div className="flex items-center space-x-2" key={opt.value}>
            <RadioGroupItem
              id={`${field.name}-${opt.value}`}
              value={opt.value}
            />
            <Label htmlFor={`${field.name}-${opt.value}`}>{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
      <FormFieldError />
    </>
  );
}

export const FormRadioGroupField =
  createFormField<RadioGroupFieldProps>(RadioGroupField);
