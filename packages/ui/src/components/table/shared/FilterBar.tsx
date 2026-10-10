import { Search, X } from "lucide-react";
import type React from "react";

export interface FilterConfig {
  /** Label for the sentinel option (e.g. "All Status"). */
  allLabel: string;
  /** Optional per-option label transform (e.g. capitalize gender). */
  formatOption?: (option: string) => string;
  /** Called with the raw <option value> string; caller narrows. */
  onChange: (value: string) => void;
  /** Full option list including the "All" sentinel. */
  options: readonly string[];
  /** Current selected value, e.g. "All" | "Scheduled" | ... */
  value: string;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  hasFilters: boolean;
  /** Hide the search input entirely (e.g. patient-scoped immunizations). */
  hideSearch?: boolean;
  onClear?: () => void;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchValue: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onClear,
  hasFilters,
  hideSearch = false,
}: FilterBarProps): React.ReactNode {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex flex-col gap-3 md:flex-row">
        {hideSearch ? null : (
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-10 pl-9 text-xs text-slate-800 focus:border-teal-500 focus:outline-hidden"
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={searchValue}
            />
            {searchValue ? (
              <button
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => onSearchChange("")}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        )}

        {filters.map((filter) => (
          <select
            className="..."
            key={filter.allLabel}
            onChange={(e) => filter.onChange(e.target.value)}
            value={filter.value}
          >
            {filter.options.map((option) => (
              <option key={option} value={option}>
                {option === "All"
                  ? filter.allLabel
                  : (filter.formatOption?.(option) ?? option)}
              </option>
            ))}
          </select>
        ))}

        {hasFilters && onClear ? (
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
