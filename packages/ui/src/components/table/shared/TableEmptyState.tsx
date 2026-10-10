import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface TableEmptyStateProps {
  actionLabel?: string;
  emptyMessage: string; // "Schedule your first appointment to get started."
  entityName: string; // "appointments", "patients", ...
  filteredMessage?: string; // defaults to "Try adjusting your search or filter criteria."
  hasFilters: boolean;
  icon: LucideIcon;
  onAction?: () => void;
}

export function TableEmptyState({
  icon: Icon,
  hasFilters,
  entityName,
  emptyMessage,
  filteredMessage = "Try adjusting your search or filter criteria.",
  actionLabel,
  onAction,
}: TableEmptyStateProps): React.ReactNode {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 size-10 text-slate-300" />
      <h3 className="text-sm font-bold text-slate-700">
        {hasFilters ? `No matching ${entityName}` : `No ${entityName} yet`}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
        {hasFilters ? filteredMessage : emptyMessage}
      </p>
      {!hasFilters && actionLabel && onAction ? (
        <button
          className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
