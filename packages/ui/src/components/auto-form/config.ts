// components/auto-form/config.ts
import AutoFormCheckbox from "./fields/checkbox";
import AutoFormDate from "./fields/date";
import AutoFormEnum from "./fields/enum";
import AutoFormInput from "./fields/input";
import AutoFormNumber from "./fields/number";
import AutoFormRadioGroup from "./fields/radio-group";
import AutoFormSwitch from "./fields/switch";
import AutoFormTextarea from "./fields/textarea";

export const INPUT_COMPONENTS = {
  checkbox: AutoFormCheckbox,
  date: AutoFormDate,
  select: AutoFormEnum,
  radio: AutoFormRadioGroup,
  switch: AutoFormSwitch,
  textarea: AutoFormTextarea,
  number: AutoFormNumber,
  fallback: AutoFormInput,
} as const;

export type InputComponents = typeof INPUT_COMPONENTS;

export const DEFAULT_ZOD_HANDLERS: Record<
  string,
  keyof typeof INPUT_COMPONENTS
> = {
  // Zod v3
  ZodBoolean: "checkbox",
  ZodDate: "date",
  ZodEnum: "select",
  ZodNativeEnum: "select",
  ZodNumber: "number",
  // Zod v4
  boolean: "checkbox",
  date: "date",
  enum: "select",
  nativeEnum: "select",
  number: "number",
  int: "number",
  float: "number",
  // string fallbacks
  string: "fallback",
};
