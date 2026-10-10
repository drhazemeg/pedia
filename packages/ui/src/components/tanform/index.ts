// src/form/index.ts
//
// Public entry point for the form module.
//
// Consumers in apps/web should import from `#/form` (or the equivalent path
// alias) rather than reaching into `core/`, `fields/`, etc. directly.

// ---------------------------------------------------------------------------
// Core — contexts, hooks, HOC, typed helpers, error utilities, types
// ---------------------------------------------------------------------------

export {
  createFormField,
  FormErrors,
  FormField,
  FormFieldError,
  FormFieldSet,
  FormItemContext,
  fieldContext,
  formContext,
  scrollToFirstError,
  typedField,
  useFieldContext,
  useFormContext,
} from "./core/context";

export { useFieldValue } from "./core/select";

export type {
  FieldConfig,
  FieldListenerConfig,
  FieldValidatorConfig,
  FormFieldSlot,
  FormItemContextValue,
  WithTypedName,
} from "./core/types";

export {
  isBoolean,
  isFileArray,
  isNumber,
  isString,
  isStringArray,
} from "./core/types";

// ---------------------------------------------------------------------------
// Registry — `useAppForm`, `useFormFields`, and re-exported core utilities
// ---------------------------------------------------------------------------

export { useAppForm, useFormFields } from "./core/registry";

// ---------------------------------------------------------------------------
// Fields — lazy (`AppField`) and eager (`form.X`) variants
// ---------------------------------------------------------------------------

export type {
  CheckboxFieldProps,
  ColorFieldProps,
  FileUploadFieldProps,
  Option,
  RadioGroupFieldProps,
  SelectFieldProps,
  SliderFieldProps,
  SwitchFieldProps,
  TextareaFieldProps,
  TextFieldProps,
  TimeFieldProps,
} from "./fields";
export {
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
} from "./fields";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export { FormActions } from "./layout/FormActions";
export { FormPageLayout } from "./layout/FormPageLayout";
export { FormSection } from "./layout/FormSection";

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

export type { TimeSelectProps } from "./widgets/TimeSelector";
export { TimeSelect } from "./widgets/TimeSelector";
