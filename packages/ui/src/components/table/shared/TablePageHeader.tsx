import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface TablePageHeaderProps {
  actionIcon: LucideIcon;
  actionLabel: string;
  onAction: () => void;
  subtitle: string;
  title: string;
  total: number;
}

export function TablePageHeader({
  title,
  subtitle,
  total,
  actionIcon: ActionIcon,
  actionLabel,
  onAction,
}: TablePageHeaderProps): React.ReactNode {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
            {total} total
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>

      <button
        className="flex items-center gap-2 self-start rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-700 sm:self-auto"
        onClick={onAction}
        type="button"
      >
        <ActionIcon className="size-4" />
        {actionLabel}
      </button>
    </header>
  );
}
