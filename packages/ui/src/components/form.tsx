"use client";

import { Field as BaseField } from "@base-ui/react/field";
import { Label } from "@pedia/ui/components/label";
import {
  useFieldContext,
  useFormContext,
} from "@pedia/ui/components/tanform/core/context";
import { cn } from "@pedia/ui/lib/utils";
import type * as React from "react";

// ─── Form shell ────────────────────────────────────────────────────────

type FormProps = React.ComponentProps<"form">;

function Form({ className, ...props }: FormProps) {
  return (
    <form
      className={cn("mx-auto flex w-full flex-col gap-4", className)}
      noValidate
      {...props}
    />
  );
}

// ─── FormField ─────────────────────────────────────────────────────────
//
// Renders Base UI's Field.Root, but reads validity from the TanStack field
// context. Must be placed INSIDE a <FormFieldSet> (from form-context.tsx)
// so the context is available.

type FormFieldProps = {
  name: string;
  children: React.ReactNode;
  className?: string;
};
function FormField({ name, children, className }: FormFieldProps) {
  const form = useFormContext();

  return (
    <form.Field name={name as never}>
      {(field) => (
        <BaseField.Root
          className={cn("grid gap-2", className)}
          id={field.name}
          invalid={field.state.meta.errors.length > 0}
        >
          {children}
        </BaseField.Root>
      )}
    </form.Field>
  );
}

// ─── FormItem ──────────────────────────────────────────────────────────

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

// ─── FormLabel ─────────────────────────────────────────────────────────

function FormLabel({
  className,
  required,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  return <Label className={cn(className)} required={required} {...props} />;
}

// ─── FormControl ───────────────────────────────────────────────────────
//
// Base UI's Field.Control clones its child and injects ARIA wiring. Use it
// when you don't already have a controlled input wired to TanStack.

function FormControl({ children }: { children: React.ReactElement }) {
  return <BaseField.Control render={children} />;
}

// ─── FormDescription ───────────────────────────────────────────────────

function FormDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// ─── FormMessage ───────────────────────────────────────────────────────

function FormMessage({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { field } = useFieldContext();
  const errors = field.state.meta.errors;
  const body = errors[0] ?? children;
  if (!body) return null;
  return (
    <BaseField.Error
      className={cn("text-destructive text-sm font-medium", className)}
      role="alert"
    >
      {typeof body === "string" ? body : (body as { message?: string }).message}
    </BaseField.Error>
  );
}

export {
  FormErrors,
  scrollToFirstError,
  useFieldContext,
  useFormContext,
} from "@pedia/ui/components/tanform/core/context";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
};
