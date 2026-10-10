// apps/web/src/features/encounters/components/collapsible-section.tsx

import { cn } from "@pedia/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface CollapsibleSectionProps {
  /** Short label rendered as a circle — "S", "O", "A", "P". */
  title: string;
  /** Full section name shown next to the letter. */
  subtitle: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * A minimal collapsible section header. TanStack doesn't have a
 * ready-made one and the SOAP editor needs four of them consistently.
 *
 * Uses `<details>` / `<summary>` rather than a state-driven accordion so
 * the browser handles the open/close animation and keyboard interaction.
 */
export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/30 flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full font-semibold">
          {title}
        </span>
        <span className="flex-1 font-medium">{subtitle}</span>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </section>
  );
}
