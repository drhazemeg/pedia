// components/ui/fields/color-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { Input } from "@pedia/ui/components/input";
import { Spinner } from "@pedia/ui/components/spinner";
import { cn } from "@pedia/ui/lib/utils";
import { useSelector } from "@tanstack/react-form";
import * as React from "react";
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

// ============================================================
// Types
// ============================================================

export interface ColorFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur"
> {
  description?: string;
  label: string;
  presetColors?: string[];
  previewSize?: "sm" | "md" | "lg";
  required?: boolean;
  showPresets?: boolean;
  showPreview?: boolean;
}

const HEX_EXACT_REGEX = /^#[0-9A-F]{6}$/i;
const HEX_PARTIAL_REGEX = /^[0-9A-F]{6}$/i;

const isValidHexColor = (color: string): boolean => HEX_EXACT_REGEX.test(color);
// ============================================================
// Constants & Regex
// ============================================================

const PRESET_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#a855f7",
  "#f43f5e",
  "#0ea5e9",
  "#84cc16",
  "#d946ef",
];

const PREVIEW_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

// ============================================================
// Sub-Components
// ============================================================

function ColorPreview({
  color,
  size = "md",
}: {
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "border-input shrink-0 rounded-md border shadow-sm transition-all",
        PREVIEW_SIZE_CLASSES[size]
      )}
      style={{ backgroundColor: color || "#ffffff" }}
    />
  );
}

interface ColorPresetProps {
  color: string;
  isSelected: boolean;
  label?: string;
  onClick: (color: string) => void;
}

function ColorPreset({ color, isSelected, onClick, label }: ColorPresetProps) {
  const handleClick = useCallback(() => {
    onClick(color);
  }, [onClick, color]);

  return (
    <button
      aria-label={label ?? `Select color ${color}`}
      aria-pressed={isSelected}
      className={cn(
        "focus:ring-primary size-6 rounded-full border-2 transition-all hover:scale-110 focus:ring-2 focus:ring-offset-2 focus:outline-none",
        isSelected
          ? "border-primary ring-primary ring-2 ring-offset-2"
          : "border-transparent"
      )}
      onClick={handleClick}
      style={{ backgroundColor: color }}
      type="button"
    />
  );
}

// ============================================================
// Main Component
// ============================================================

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function ColorField(props: ColorFieldProps) {
  return (
    <FormFieldSet>
      <ColorFieldInner {...props} />
    </FormFieldSet>
  );
}

function ColorFieldInner({
  label,
  description,
  required,
  className,
  showPreview = true,
  previewSize = "md",
  presetColors = PRESET_COLORS,
  showPresets = true,
  ...inputProps
}: ColorFieldProps) {
  const { field } = useFieldContext();
  const isTouched = useSelector(field.store, (s) => s.meta.isTouched);
  const isValid = useSelector(field.store, (s) => s.meta.isValid);
  const isValidating = useSelector(field.store, (s) => s.meta.isValidating);
  const value = useFieldValue(field, isString, "");

  const colorPickerRef = React.useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (newValue: string) => {
      field.handleChange(newValue);
      field.handleBlur();
    },
    [field]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (HEX_PARTIAL_REGEX.test(val)) {
        handleChange(`#${val.toUpperCase()}`);
      } else if (HEX_EXACT_REGEX.test(val)) {
        handleChange(val.toUpperCase());
      } else {
        handleChange(val);
      }
    },
    [handleChange]
  );

  const handlePickerTrigger = useCallback(() => {
    colorPickerRef.current?.click();
  }, []);

  const displayColor = isValidHexColor(value) ? value : "#ffffff";

  const colorPreviewElement = showPreview ? (
    <ColorPreview color={displayColor} size={previewSize} />
  ) : null;

  const presetsElement =
    showPresets && presetColors.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-muted-foreground text-xs">Presets:</span>
        {presetColors.map((color) => (
          <ColorPreset
            color={color}
            isSelected={value === color}
            key={color}
            onClick={handleChange}
          />
        ))}
      </div>
    ) : null;

  return (
    <>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required}
        </FieldLabel>

        <div className="space-y-3">
          <div className="relative flex items-center gap-3">
            {colorPreviewElement}

            <div className="relative flex-1">
              <Input
                aria-invalid={isTouched && !isValid}
                className={cn("font-mono", className, showPreview && "pl-10")}
                id={field.name}
                onBlur={field.handleBlur}
                onChange={handleInputChange}
                placeholder="#000000"
                type="text"
                value={value}
                {...inputProps}
              />

              <input
                className="absolute top-1/2 left-2 size-5 -translate-y-1/2 cursor-pointer rounded border-0 p-0 opacity-0"
                id={`${field.name}-picker`}
                onChange={handleInputChange}
                type="color"
                value={displayColor}
              />

              <button
                aria-label="Open color picker"
                className="border-input focus:ring-primary absolute top-1/2 left-2 size-5 -translate-y-1/2 cursor-pointer rounded border bg-white shadow-sm transition-all hover:shadow-md focus:ring-2 focus:outline-none dark:bg-slate-800"
                onClick={handlePickerTrigger}
                style={{ backgroundColor: displayColor }}
                type="button"
              />

              {isValidating && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Spinner className="size-4" />
                </div>
              )}
            </div>
          </div>

          {presetsElement}

          {Boolean(description) && (
            <FieldDescription>{description}</FieldDescription>
          )}
        </div>
      </FormField>
      <FormFieldError />
    </>
  );
}

// ============================================================
// Exports
// ============================================================

export const FormColorField = createFormField<ColorFieldProps>(ColorField);
