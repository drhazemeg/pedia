import { cn } from "@pedia/ui/lib/utils";
import type React from "react";

export function GridPattern({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        "bg-size-[40px_40px]",
        "bg-[linear-gradient(to_right,var(--primary)_1px,transparent_1px),linear-gradient(to_bottom,var(--primary)_1px,transparent_1px)]",
        "dark:bg-[linear-gradient(to_right,var(--primary)_1px,transparent_1px),linear-gradient(to_bottom,var(--primary)_1px,transparent_1px)]",
        className
      )}
      {...props}
    />
  );
}

export function DotPattern({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        "bg-size-[40px_40px]",
        "bg-[radial-gradient(circle_at_1px_1px,var(--primary)_1px,transparent_1px)]",
        "dark:bg-[radial-gradient(circle_at_1px_1px,var(--primary)_1px,transparent_1px)]",
        className
      )}
      {...props}
    />
  );
}
