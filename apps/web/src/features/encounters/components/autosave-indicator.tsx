// apps/web/src/features/encounters/components/autosave-indicator.tsx

import { cn } from "@pedia/ui/lib/utils";
import {
  CheckIcon,
  Loader2,
  PencilIcon,
  TriangleAlertIcon,
} from "lucide-react";

import type { AutosaveStatus } from "../hooks/use-soap-autosave";

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  className?: string;
}

const CONFIG: Record<
  AutosaveStatus,
  { label: string; icon: React.ReactNode; className?: string }
> = {
  idle: {
    label: "Saved",
    icon: <CheckIcon className="size-4" />,
  },
  saved: {
    label: "Saved",
    icon: <CheckIcon className="size-4" />,
  },
  pending: {
    label: "Unsaved changes",
    icon: <PencilIcon className="size-4" />,
  },
  saving: {
    label: "Saving…",
    icon: <Loader2 className="size-4 animate-spin" />,
  },
  error: {
    label: "Save failed — retry on next edit",
    icon: <TriangleAlertIcon className="size-4" />,
    className: "text-destructive",
  },
};

/**
 * Small inline indicator for the autosave hook's state.
 *
 * The four visible states map to what the user cares about:
 *   - idle + saved → "Saved"
 *   - pending      → "Unsaved changes"
 *   - saving       → "Saving…"
 *   - error        → "Save failed"
 */
export function AutosaveIndicator({
  status,
  className,
}: AutosaveIndicatorProps) {
  const config = CONFIG[status];

  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1.5 text-sm",
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
