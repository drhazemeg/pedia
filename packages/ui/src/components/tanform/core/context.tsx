// src/form/form-context.tsx

/**
 * Shared primitives for the TanStack Form + shadcn/ui integration.
 *
 * Exports:
 *   - `fieldContext` / `formContext` — TanStack Form contexts, consumed by
 *     `createFormHook` in `tanstack-form.tsx`.
 *   - `useFieldContext` / `useFormContext` — hooks used inside field and form
 *     components.
 *   - `FormField` / `FormFieldError` / `FormFieldSet` — shadcn wrappers that
 *     add `aria-*` wiring and error visibility rules on top of the base
 *     `ui/field` primitives.
 *   - `createFormField` — higher-order wrapper that turns a plain field
 *     component into one registrable with `createFormHook`.
 *   - `typedField` — helper for narrowing a component's `name` prop to
 *     `DeepKeys<TValues>` at the call site.
 *   - `FormErrors` / `scrollToFirstError` — form-level error summary and
 *     scroll-to-first-error helper for submit handlers.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Layering contract (why `FormFieldSet` is the boundary)
 * ──────────────────────────────────────────────────────────────────────────
 * Field components read their field API via `useFieldContext()`. That hook
 * reads a single merged context (`FormItemContext`) that contains BOTH:
 *   - the field API injected by `createFormField` via `fieldContext`, and
 *   - a stable DOM `id` generated per field.
 *
 * The merge happens in `FormFieldSet`, which is therefore the required
 * boundary. Consumers must render:
 *
 *     <FormFieldSet>          ← reads TanStack's fieldContext, generates id
 *       <FieldComponent />    ← calls useFieldContext() safely
 *     </FormFieldSet>
 *
 * If a leaf calls `useFieldContext()` ABOVE its own `<FormFieldSet>`, the
 * provider it needs has not mounted yet and the hook throws.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { fieldVariants } from "@pedia/ui/components/field";
import {
  Field as DefaultField,
  FieldError as DefaultFieldError,
  FieldSet as DefaultFieldSet,
} from "@pedia/ui/components/field";
import { cn } from "@pedia/ui/lib/utils";
import { createFormHookContexts, useSelector } from "@tanstack/react-form";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import type {
  FieldConfig,
  FormFieldSlot,
  FormItemContextValue,
  WithTypedName,
} from "./types";

/* ------------------------------------------------------------------ */
/* Small type guard — avoids `as Record<string, unknown>` casts        */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// 1. Contexts
// ---------------------------------------------------------------------------

const {
  fieldContext,
  formContext,
  useFieldContext: _useFieldContext,
  useFormContext,
} = createFormHookContexts();

/**
 * The merged per-field context consumed by `useFieldContext`.
 *
 * `null` default (rather than `{} as FormItemContextValue`) so a missing
 * `<FormFieldSet>` wrapper is caught at runtime instead of producing
 * `undefined-form-item` ids silently.
 */
const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/**
 * Read the merged field context.
 *
 * **Must be called from inside a `<FormFieldSet>`** (or another component
 * that provides `FormItemContext`). The provider is populated by `FieldSet`.
 *
 * @throws if called above the `FormFieldSet` boundary.
 */
const useFieldContext = (): FormItemContextValue => {
  const context = React.useContext(FormItemContext);
  if (!context) {
    throw new Error("useFieldContext must be used within a <FormFieldSet>");
  }
  return context;
};

/**
 * `FieldSet` is the merge point between TanStack Form's field API and the
 * DOM ids this module hands to `Field` / `FieldError` for `aria-*` wiring.
 *
 * `_useFieldContext()` is safe to call here because `createFormField` always
 * renders the field component *inside* `fieldContext.Provider`. `useSelector`
 * is called unconditionally at the top level — NOT inside `useMemo` — so the
 * Rules of Hooks hold across renders.
 */
function FieldSet({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"fieldset">) {
  const fieldApi = _useFieldContext();
  const id = React.useId();

  // `_useFieldContext()` returns `AnyFieldApi | null`; when null, `fieldApi`
  // has no store. Bail out early with a clear error rather than trying to
  // render a half-populated provider — the leaf's own `useFieldContext()`
  // would throw anyway, and this surfaces the actual mistake (a FieldSet
  // rendered outside a field) with a more useful message.
  if (!fieldApi) {
    throw new Error(
      "FormFieldSet must be rendered inside a field created by " +
        "createFormField / AppField (no field context available)."
    );
  }

  // Hooks must run unconditionally, so compute `errors` here — before the
  // memo, before the early-return branch above (which is safe because it is
  // not conditional on state, only on the presence of a context that is
  // stable for the lifetime of the component).
  const errors = useSelector(fieldApi.store, (state) => state.meta.errors);
  const contextValue = React.useMemo<FormItemContextValue>(() => {
    return {
      field: fieldApi,
      id,
      store: fieldApi.store,
      formItemId: `${id}-form-item`,
      formDescriptionId: `${id}-form-item-description`,
      formMessageId: `${id}-form-item-message`,
      errors,
    };
  }, [id, fieldApi, errors]);
  return (
    <FormItemContext.Provider value={contextValue}>
      <DefaultFieldSet className={cn("grid gap-1", className)} {...props}>
        {children}
      </DefaultFieldSet>
    </FormItemContext.Provider>
  );
}

function Field({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DefaultField> &
  VariantProps<typeof fieldVariants>) {
  const { field, errors, formItemId, formDescriptionId, formMessageId } =
    useFieldContext();
  const form = useFormContext();
  const isTouched = useSelector(field.store, (state) => state.meta.isTouched);
  const hasSubmitted = useSelector(form.store, (s) => s.submissionAttempts > 0);
  const hasVisibleErrors = errors.length > 0 && (isTouched || hasSubmitted);

  return (
    <DefaultField
      aria-describedby={
        hasVisibleErrors
          ? `${formDescriptionId} ${formMessageId}`
          : formDescriptionId
      }
      aria-invalid={hasVisibleErrors}
      data-invalid={hasVisibleErrors}
      id={formItemId}
      {...props}
    >
      {children}
    </DefaultField>
  );
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  const { errors, formMessageId, store } = useFieldContext();
  const form = useFormContext();
  const isTouched = useSelector(store, (state) => state.meta.isTouched);
  const hasSubmitted = useSelector(form.store, (s) => s.submissionAttempts > 0);

  if (!(errors.length > 0 && (isTouched || hasSubmitted))) return null;

  return (
    <DefaultFieldError
      className={cn("text-destructive text-sm", className)}
      data-slot="form-message"
      id={formMessageId}
      {...props}
      // `ui/field`'s FieldError expects `({ message?: string } | undefined)[]`.
      // Our `errors` is `unknown[]` because that's what TanStack exposes.

      errors={errors as Array<{ message?: string } | undefined>}
    />
  );
}

/**
 * Renders a `<ul>` summary of every error currently attached to the form.
 *
 * Useful at the top of a form (or in a `FormActions` block) so a user sees
 * why submission failed even when the offending field is scrolled out of view.
 * Silently renders nothing when there are no errors.
 *
 * The error-normalization logic handles three shapes:
 *   - `string` — a plain message
 *   - `{ message: string }` — the common Zod/validator shape
 *   - `{ fieldName: Array<{ message: string }> }` — TanStack Form's aggregated
 *     error map for whole-form validators
 */
function FormErrors() {
  const form = useFormContext();

  const selector = React.useCallback(
    (state: { errors: unknown[] }) => state.errors,
    []
  );

  const getErrorMessages = React.useCallback((errs: unknown[]): string[] => {
    const messages: string[] = [];

    for (const err of errs) {
      if (typeof err === "string") {
        messages.push(err);
        continue;
      }
      if (!isRecord(err)) continue;

      if ("message" in err && typeof err.message === "string") {
        messages.push(err.message);
        continue;
      }

      for (const key of Object.keys(err)) {
        const issues = err[key];
        if (!Array.isArray(issues)) continue;
        for (const issue of issues) {
          if (isRecord(issue) && typeof issue.message === "string") {
            messages.push(issue.message);
          } else if (typeof issue === "string") {
            messages.push(issue);
          }
        }
      }
    }

    return [...new Set(messages)];
  }, []);

  return (
    <form.Subscribe selector={selector}>
      {(errors) => {
        if (errors.length === 0) return null;
        const messages = getErrorMessages(errors);
        if (messages.length === 0) return null;

        return (
          <ul className="text-destructive ms-4 flex list-disc flex-col gap-1 text-sm">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        );
      }}
    </form.Subscribe>
  );
}

/**
 * Smooth-scrolls the first field marked `data-invalid="true"` into view and
 * focuses its first focusable child.
 *
 * Call this from a form's `onSubmit` after `form.handleSubmit()` fails
 * validation — the check runs inside `requestAnimationFrame` so React has
 * flushed the invalid state before the query selector runs.
 */
function scrollToFirstError() {
  requestAnimationFrame(() => {
    const firstError = document.querySelector('[data-invalid="true"]');
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = firstError.querySelector<HTMLElement>(
        "input, textarea, select, button, [tabindex]"
      );
      focusable?.focus({ preventScroll: true });
    }
  });
}

/**
 * Wraps a field component so it can be registered with `createFormHook` and
 * used as `<form.TextField name="..." label="..." />`.
 *
 * The wrapper handles three concerns:
 *   1. Injects the field API into `fieldContext` so `FormFieldSet` (rendered
 *      by the field component itself) can merge it with a DOM id and hand
 *      the result to `useFieldContext`.
 *   2. Forwards the standard `FieldConfig` props (`validators`, `listeners`,
 *      `asyncDebounceMs`, `mode`, `defaultValue`) to `form.Field`.
 *   3. Auto-disables the field while the form is submitting.
 *
 * The generic is `P extends object` (not `Record<string, unknown>`) because
 * concrete props interfaces — like `TextareaFieldProps` — do not have an
 * index signature and therefore do not satisfy `Record<string, unknown>`.
 */
function createFormField<P extends object>(
  FieldComponent: React.ComponentType<P>
) {
  type Props = { name: string } & FieldConfig &
    Omit<P, keyof FieldConfig | "name" | "disabled"> & {
      disabled?: boolean;
    };

  function ComposedFormField({
    name,
    validators,
    asyncDebounceMs,
    listeners,
    mode,
    defaultValue,
    ...rest
  }: Props) {
    const form = useFormContext();
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const finalDisabled = rest.disabled || isSubmitting;

    // `rest` holds every P-specific prop except the config keys extracted
    // above. At runtime these are the exact props `FieldComponent` reads.

    const componentProps = rest as P;

    // `form.Field`'s generic slot signature does not infer cleanly against
    // our concrete `FormFieldSlot` type. The shapes match at runtime.

    const FieldSlot = form.Field as FormFieldSlot;

    return (
      <FieldSlot
        asyncDebounceMs={asyncDebounceMs}
        defaultValue={defaultValue}
        listeners={listeners}
        mode={mode}
        name={name}
        validators={validators}
      >
        {(fieldApi) => (
          <fieldContext.Provider value={fieldApi}>
            {/*
              The leaf component MUST wrap its own contents in `<FormFieldSet>`
              so its descendants can call `useFieldContext()`. See the
              layering contract at the top of this file.
            */}
            <FieldComponent {...componentProps} disabled={finalDisabled} />
          </fieldContext.Provider>
        )}
      </FieldSlot>
    );
  }
  ComposedFormField.displayName = `FormField(${FieldComponent.displayName ?? FieldComponent.name})`;

  return ComposedFormField;
}

/**
 * Narrows a field component's `name` prop to `DeepKeys<TValues>`. Returns the
 * same component, only retyped.
 *
 * The cast is unavoidable: TypeScript cannot verify that a component accepting
 * `name: string` is safely assignable to one accepting `name: DeepKeys<TValues>`
 * because prop types are contravariant. The runtime component is unchanged.
 */
function narrowFieldName<
  C extends React.ComponentType<{ name: string }>,
  TValues,
>(Component: C): WithTypedName<C, TValues> {
  return Component as WithTypedName<C, TValues>;
}

/**
 * Narrows a field component's `name` prop to `DeepKeys<TValues>` at the call
 * site. Returns the same component, only retyped.
 *
 * Usage:
 *
 *     const fields = useFormFields<PatientFormValues>();
 *     <fields.FormTextField name="firstName" label="First name" />
 */
function typedField<TValues extends Record<string, unknown>>() {
  return <C extends React.ComponentType<{ name: string }>>(
    Component: C
  ): WithTypedName<C, TValues> => narrowFieldName<C, TValues>(Component);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  createFormField,
  Field as FormField,
  FieldError as FormFieldError,
  FieldSet as FormFieldSet,
  FormErrors,
  FormItemContext,
  fieldContext,
  formContext,
  scrollToFirstError,
  typedField,
  useFieldContext,
  useFormContext,
};
