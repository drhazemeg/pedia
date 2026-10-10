// src/form/tanstack-form.tsx

import type { buttonVariants } from "@pedia/ui/components/button";
import { Button } from "@pedia/ui/components/button";
import {
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldTitle,
} from "@pedia/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@pedia/ui/components/input-group";
import { cn } from "@pedia/ui/lib/utils";
import { createFormHook } from "@tanstack/react-form";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import {
  CheckboxField,
  ColorField,
  DateField,
  DateTimeField,
  FileUploadField,
  FormCheckboxField,
  FormColorField,
  FormDateField,
  FormDateTimeField,
  FormFileUploadField,
  FormRadioGroupField,
  FormSelectField,
  FormSliderField,
  FormSwitchField,
  FormTextareaField,
  FormTextField,
  FormTimeField,
  RadioGroupField,
  SelectField,
  SliderField,
  SwitchField,
  TextareaField,
  TextField,
  TimeField,
} from "../fields";
import { fieldContext, formContext, useFormContext } from "./context";
import type { WithTypedName } from "./types";

// ---------------------------------------------------------------------------
// Form-level components (used as form.ComponentName)
// ---------------------------------------------------------------------------

function Form({
  children,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit" | "noValidate"> & {
  children?: React.ReactNode;
}) {
  const form = useFormContext();

  const handleSubmit = React.useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <form
      className={cn(
        "mx-auto flex w-full flex-col gap-2 p-2 md:p-5",
        props.className
      )}
      noValidate
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

function SubmitButton({
  children,
  className,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  const form = useFormContext();
  const selector = React.useCallback(
    (state: { canSubmit: boolean; isSubmitting: boolean }) =>
      [state.canSubmit, state.isSubmitting] as const,
    []
  );

  return (
    <form.Subscribe selector={selector}>
      {([canSubmit]) => (
        <Button
          className={className}
          disabled={!canSubmit}
          size={size}
          type="submit"
          {...props}
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}

function SubscribeButton({ label }: { label: string }) {
  const form = useFormContext();
  const selector = React.useCallback(
    (state: { isSubmitting: boolean }) => state.isSubmitting,
    []
  );

  return (
    <form.Subscribe selector={selector}>
      {(isSubmitting) => (
        <Button disabled={isSubmitting} type="submit">
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}

function StepButton({
  label,
  handleMovement,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    label: React.ReactNode | string;
    handleMovement: () => void;
  }) {
  return (
    <Button
      onClick={handleMovement}
      size="sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Hook creation
// ---------------------------------------------------------------------------

/**
 * Registered field and form components.
 *
 * Two registration maps serve distinct call sites:
 *
 *   - `fieldComponents` are the *lazy* variants (`TextField`, `SelectField`,
 *     …). Used inside `<form.AppField>` render props where you want to bind
 *     the field name manually.
 *
 *   - `formComponents` are the *eager* variants (`FormTextField`,
 *     `FormSelectField`, …). Used directly as `<form.TextField name="…" />`;
 *     they internally render the `form.Field` slot.
 *
 * Anything in `formComponents` that shares a name with a `fieldComponents`
 * entry must be the eager `Form*` variant. Registering both a lazy and an
 * eager component under the same key produces ambiguous inference.
 */
const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldTitle,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    // Lazy (AppField) variants
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
    SwitchField,
    RadioGroupField,
    SliderField,
    FileUploadField,
    DateField,
  },
  formComponents: {
    // Shell
    Form,
    SubmitButton,
    StepButton,
    SubscribeButton,
    // Layout primitives re-exported on the form instance
    FieldLegend,
    FieldDescription,
    FieldSeparator,
    // Eager (form.X) field variants
    TextField: FormTextField,
    TextareaField: FormTextareaField,
    SelectField: FormSelectField,
    CheckboxField: FormCheckboxField,
    SwitchField: FormSwitchField,
    RadioGroupField: FormRadioGroupField,
    SliderField: FormSliderField,
    FileUploadField: FormFileUploadField,
    DateField: FormDateField,
    FormTimeField,
    FormDateTimeField,
    FormColorField,
    ColorField,
    TimeField,
    DateTimeField,
  },
});

function narrowFieldName<C extends React.ComponentType<never>, TValues>(
  Component: C
): WithTypedName<C, TValues> {
  return Component as WithTypedName<C, TValues>;
}

function useFormFields<TValues extends Record<string, unknown>>() {
  return {
    FormTextField: narrowFieldName<typeof FormTextField, TValues>(
      FormTextField
    ),
    FormTextareaField: narrowFieldName<typeof FormTextareaField, TValues>(
      FormTextareaField
    ),
    FormSelectField: narrowFieldName<typeof FormSelectField, TValues>(
      FormSelectField
    ),
    FormCheckboxField: narrowFieldName<typeof FormCheckboxField, TValues>(
      FormCheckboxField
    ),
    FormSwitchField: narrowFieldName<typeof FormSwitchField, TValues>(
      FormSwitchField
    ),
    FormRadioGroupField: narrowFieldName<typeof FormRadioGroupField, TValues>(
      FormRadioGroupField
    ),
    FormSliderField: narrowFieldName<typeof FormSliderField, TValues>(
      FormSliderField
    ),
    FormFileUploadField: narrowFieldName<typeof FormFileUploadField, TValues>(
      FormFileUploadField
    ),
    FormDateField: narrowFieldName<typeof FormDateField, TValues>(
      FormDateField
    ),
    FormTimeField: narrowFieldName<typeof FormTimeField, TValues>(
      FormTimeField
    ),
    FormDateTimeField: narrowFieldName<typeof FormDateTimeField, TValues>(
      FormDateTimeField
    ),
    FormColorField: narrowFieldName<typeof FormColorField, TValues>(
      FormColorField
    ),
  } as const;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Re-export the utilities so consumers can import everything from
// `#/form/tanstack-form` without reaching into `form-context` directly.
export {
  createFormField,
  FormErrors,
  FormField,
  FormFieldError,
  FormFieldSet,
  scrollToFirstError,
  typedField,
  useFieldContext,
  useFormContext,
} from "./context";

// Re-export the type surface once (form-context already re-exports it; this
// keeps the tanstack-form import path self-sufficient).

export { useAppForm, useFormFields };
