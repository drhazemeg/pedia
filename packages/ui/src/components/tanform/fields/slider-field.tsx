// components/ui/fields/slider-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Slider } from "@pedia/ui/components/slider";
import { useCallback } from "react";

import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isNumber } from "../core/types";

export interface SliderFieldProps {
  description?: string;
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  step?: number;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function SliderField(props: SliderFieldProps) {
  return (
    <FormFieldSet>
      <SliderFieldInner {...props} />
    </FormFieldSet>
  );
}

function SliderFieldInner({
  label,
  description,
  required,
  min = 0,
  max = 100,
  step = 1,
}: SliderFieldProps) {
  const { field } = useFieldContext();
  const value = useFieldValue(field, isNumber, 0);

  const handleValueChange = useCallback(
    // Base UI passes `number | readonly number[]` because it supports
    // single-value and range sliders with the same API.
    (v: number | readonly number[]) => {
      const next = Array.isArray(v) ? v[0] : v;
      if (next !== undefined) {
        field.handleChange(next);
      }
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
        <div className="px-1">
          <Slider
            id={field.name}
            max={max}
            min={min}
            onBlur={field.handleBlur}
            onValueChange={handleValueChange}
            step={step}
            value={[value]}
          />
          <div className="text-muted-foreground mt-1 flex justify-between text-xs tabular-nums">
            <span>{min}</span>
            <span className="font-medium">
              {value}/{max}
            </span>
            <span>{max}</span>
          </div>
        </div>
        {Boolean(description) && (
          <FieldDescription>{description}</FieldDescription>
        )}
      </FormField>
      <FormFieldError />
    </>
  );
}

export const FormSliderField = createFormField<SliderFieldProps>(SliderField);
