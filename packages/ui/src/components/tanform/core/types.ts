import type { AnyFieldApi, DeepKeys } from "@tanstack/react-form";

/** Field-level validators forwarded to form.Field */
export type FieldValidatorConfig = {
  /** Sync validator — runs when the field loses focus. Accepts a function or Zod schema. */
  onBlur?: unknown;
  /** Async validator — runs on blur. */
  onBlurAsync?: unknown;
  /** Debounce (ms) for onBlurAsync. */
  onBlurAsyncDebounceMs?: number;
  /** Re-run onBlur/onBlurAsync when these other fields blur. */
  onBlurListenTo?: string[];
  /** Sync validator — runs on every value change. Accepts a function or Zod schema. */
  onChange?: unknown;
  /** Async validator — runs on value change (debounced). */
  onChangeAsync?: unknown;
  /** Debounce (ms) for onChangeAsync. */
  onChangeAsyncDebounceMs?: number;
  /** Re-run onChange/onChangeAsync when these other fields change (linked validation). */
  onChangeListenTo?: string[];
  /** Sync validator — runs on field mount. */
  onMount?: unknown;
  /** Sync validator — runs on form submission. */
  onSubmit?: unknown;
  /** Async validator — runs on form submission. */
  onSubmitAsync?: unknown;
};

/** Field-level side-effect listeners forwarded to form.Field */
export type FieldListenerConfig = {
  /** Fires when the field loses focus. */
  onBlur?: (props: { value: unknown; fieldApi: AnyFieldApi }) => void;
  /** Debounce (ms) for the onBlur listener. */
  onBlurDebounceMs?: number;
  /** Fires after the field value changes. Use for side effects (e.g., resetting dependent fields). */
  onChange?: (props: { value: unknown; fieldApi: AnyFieldApi }) => void;
  /** Debounce (ms) for the onChange listener. */
  onChangeDebounceMs?: number;
  /** Fires when the field mounts. */
  onMount?: (props: { value: unknown; fieldApi: AnyFieldApi }) => void;
  /** Fires on form submission. */
  onSubmit?: (props: { value: unknown; fieldApi: AnyFieldApi }) => void;
};

export type FieldConfig = {
  /** Default debounce (ms) for all async validators on this field. */
  asyncDebounceMs?: number;
  /** Default value for this field (useful for dynamically added fields). */
  defaultValue?: unknown;
  /** Side-effect listeners (onChange, onBlur, onMount, onSubmit). */
  listeners?: FieldListenerConfig;
  /** Set to 'array' for array fields (enables pushValue, removeValue, etc.). */
  mode?: "value" | "array";
  /** Field-level validators (onBlur, onChange, onSubmit + async variants). */
  validators?: FieldValidatorConfig;
};
export type FormFieldSlot = React.ComponentType<{
  name: string;
  validators?: unknown;
  asyncDebounceMs?: number;
  listeners?: unknown;
  mode?: "value" | "array";
  defaultValue?: unknown;
  children: (fieldApi: AnyFieldApi) => React.ReactNode;
}>;

export type FormItemContextValue = {
  field: AnyFieldApi;
  id: string;
  formItemId: string;
  store: AnyFieldApi["store"];
  formDescriptionId: string;
  formMessageId: string;
  errors: unknown[];
};
export type WithTypedName<C, TValues> =
  C extends React.ComponentType<infer P>
    ? P extends { name: string }
      ? React.ComponentType<
          Omit<P, "name"> & { name: DeepKeys<TValues> & string }
        >
      : C
    : C;
// src/components/form/core/guards.ts
// src/components/form/core/guards.ts

export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

/**
 * True iff `v` is an array whose every element is a `File` instance.
 *
 * Uses `instanceof File` rather than a duck-typed check so that a plain
 * object shaped like a File (`{ name, size, type, ... }`) is rejected. Only
 * actual File/Blob-derived objects (from `<input type="file">`, drag-drop,
 * or the clipboard) pass.
 *
 * The `File` global is available in browsers and in Node 20+. If this guard
 * is ever called in an older Node runtime, replace the check with a duck-typed
 * fallback:
 *
 *     typeof item === "object" && item !== null
 *     && "name" in item && "size" in item && "type" in item
 *     && "arrayBuffer" in item
 */
export function isFileArray(v: unknown): v is File[] {
  return Array.isArray(v) && v.every((item) => item instanceof File);
}
