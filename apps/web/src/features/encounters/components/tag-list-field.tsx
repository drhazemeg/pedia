// apps/web/src/features/encounters/components/tag-list-field.tsx

import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { PlusIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

export interface TagListFieldProps<T> {
  label: string;
  values: T[];
  onChange: (values: T[]) => void;
  /** Turn a raw input string into a tag. Return null to reject. */
  parse: (input: string) => T | null;
  /** Render a tag's display text. */
  renderTag: (tag: T, index: number) => string;
  placeholder?: string;
  /**
   * Optional custom entry component. If omitted, a plain text input is
   * shown and `parse` is called on submit.
   */
  renderEntry?: (
    submit: (value: string) => void,
    cancel: () => void
  ) => React.ReactNode;
  disabled?: boolean;
}

/**
 * A generic "list of tags" editor. Tags are rendered as removable chips;
 * a compact input below accepts new entries.
 *
 * Generic over `T` so the same component handles `string[]` (family
 * history) and `SoapDiagnosis[]` (secondary diagnoses) without a union
 * type or a discriminator.
 */
export function TagListField<T>({
  label,
  values,
  onChange,
  parse,
  renderTag,
  placeholder = "Add entry and press Enter",
  disabled = false,
}: TagListFieldProps<T>) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(() => {
    const parsed = parse(draft);
    if (parsed === null) return;
    onChange([...values, parsed]);
    setDraft("");
  }, [draft, onChange, parse, values]);

  const remove = useCallback(
    (index: number) => {
      const next = [...values];
      next.splice(index, 1);
      onChange(next);
    },
    [onChange, values]
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((tag, i) => (
            <li
              // Tags have no stable id at this layer; the composite of
              // display text + index is the best identity we have, and
              // it's stable enough for a chip's lifetime.
              key={`${renderTag(tag, i)}-${i}`}
              className="bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
            >
              <span>{renderTag(tag, i)}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full p-0.5"
                aria-label={`Remove ${renderTag(tag, i)}`}
              >
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={commit}
          disabled={disabled || draft.trim() === ""}
          aria-label="Add entry"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
