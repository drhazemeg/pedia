// apps/web/src/features/encounters/components/icd10-combobox.tsx

import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { cn } from "@pedia/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useIcd10Search } from "../hooks/use-icd10-search";
import type { SoapDiagnosis } from "../types";

export interface Icd10ComboboxProps {
  label: string;
  value: SoapDiagnosis | null;
  onChange: (value: SoapDiagnosis | null) => void;
  disabled?: boolean;
}

/**
 * Searchable single-select ICD-10 picker.
 *
 * Not built on the library's `SelectField` because that component doesn't
 * support typeahead — it's a plain list. This is a lightweight combobox:
 * a text input triggers a dropdown of ranked results from the static
 * pediatric ICD-10 list. Picking a result sets the value and closes.
 *
 * Free-text entry is allowed: if the user types something and presses
 * Enter without picking a result, it's stored as `{ code: "", description: <text> }`.
 * This handles the "rare condition not in my list" case without forcing
 * the user to look up a code.
 */
export function Icd10Combobox({
  label,
  value,
  onChange,
  disabled = false,
}: Icd10ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results } = useIcd10Search();

  // Close on outside click. Same pattern as the library's TimeSelect.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!containerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback(
    (entry: SoapDiagnosis) => {
      onChange(entry);
      setQuery("");
      setOpen(false);
    },
    [onChange, setQuery]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
  }, [onChange, setQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0) {
          handleSelect(results[0]);
        } else if (query.trim()) {
          // Free-text fallback.
          handleSelect({ code: "", description: query.trim() });
        }
      }
    },
    [handleSelect, query, results]
  );

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>

      {value ? (
        <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
          <div className="flex-1">
            {value.code && (
              <span className="text-muted-foreground mr-2 font-mono text-xs">
                {value.code}
              </span>
            )}
            <span className="text-sm">{value.description}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-muted-foreground hover:bg-background hover:text-foreground rounded p-1"
            aria-label="Clear diagnosis"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by code or description…"
            disabled={disabled}
          />

          {open && (
            <div
              className={cn(
                "bg-popover absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border p-1 shadow-md"
              )}
            >
              {results.length === 0 ? (
                <p className="text-muted-foreground px-3 py-2 text-sm">
                  {query.trim()
                    ? "No matches. Press Enter to use this text."
                    : "Start typing to search."}
                </p>
              ) : (
                results.map((entry) => (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() =>
                      handleSelect({
                        code: entry.code,
                        description: entry.description,
                      })
                    }
                    className="hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm"
                  >
                    <CheckIcon className="mt-0.5 size-4 shrink-0 opacity-0" />
                    <span className="text-muted-foreground font-mono text-xs">
                      {entry.code}
                    </span>
                    <span className="flex-1">{entry.description}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
