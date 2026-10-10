import { cn } from "@pedia/ui/lib/utils";
import type * as React from "react";

type LabelProps = React.ComponentProps<"label"> & {
  /** Render a decorative asterisk after the label text. */
  required?: boolean;
};

function Label({
  className,
  htmlFor,
  required,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm leading-none font-medium select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      data-required={required ?? undefined}
      data-slot="label"
      htmlFor={htmlFor}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden className="text-destructive">
          *
        </span>
      )}
    </label>
  );
}

export type { LabelProps };
export { Label };
