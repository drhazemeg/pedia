// src/components/form/layout/FormSection.tsx

// 1. Add FieldLabel to your imports
import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { cn } from "@pedia/ui/lib/utils";
import type { ReactNode } from "react";

interface FormSectionProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  description?: string;
  label?: string; // 2. Add label to your props if you need it
  title?: string;
}

const gridCols = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

export function FormSection({
  title,
  description,
  label, // 3. Destructure label
  children,
  className,
  columns = 1,
}: FormSectionProps) {
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(label);

  return (
    <section className={cn("space-y-4", className)}>
      {hasHeader && (
        <header className="space-y-0.5">
          {title ? (
            <h3 className="text-foreground text-base leading-none font-semibold tracking-tight">
              {title}
            </h3>
          ) : null}
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          {/* 4. Fix typo and use the correct variable */}
          {label ? <FieldLabel>{label}</FieldLabel> : null}
        </header>
      )}
      <div className={cn("grid gap-4", gridCols[columns])}>{children}</div>
    </section>
  );
}
