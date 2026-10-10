// apps/web/src/features/encounters/components/key-value-editor.tsx

import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";

export interface KeyValueEditorProps {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

/**
 * Editor for `Record<string, string>` — the physical exam findings.
 *
 * Body systems are free-form keys (the doctor types "Cardiovascular" or
 * "Respiratory"), not a fixed enum. This is deliberate: pediatric exams
 * vary by visit type and a hard-coded list would be wrong for half of
 * them. A future version could offer autocomplete over a suggested list
 * without changing this component's shape.
 */
export function KeyValueEditor({
  label,
  value,
  onChange,
  keyPlaceholder = "System (e.g. Cardiovascular)",
  valuePlaceholder = "Findings",
  disabled = false,
}: KeyValueEditorProps) {
  const entries = Object.entries(value);

  const updateKey = useCallback(
    (oldKey: string, newKey: string) => {
      if (newKey === oldKey) return;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) {
        next[k === oldKey ? newKey : k] = v;
      }
      onChange(next);
    },
    [onChange, value]
  );

  const updateValue = useCallback(
    (key: string, newValue: string) => {
      onChange({ ...value, [key]: newValue });
    },
    [onChange, value]
  );

  const remove = useCallback(
    (key: string) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) {
        if (k !== key) {
          next[k] = v;
        }
      }
      onChange(next);
    },
    [onChange, value]
  );

  const add = useCallback(() => {
    // Pick a unique placeholder key so the new row is immediately visible.
    let key = "";
    let i = 1;
    while (key === "" || key in value) {
      key = `System ${i}`;
      i++;
    }
    onChange({ ...value, [key]: "" });
  }, [onChange, value]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-2">
            <Input
              value={key}
              onChange={(e) => updateKey(key, e.target.value)}
              placeholder={keyPlaceholder}
              disabled={disabled}
              className="max-w-[200px]"
            />
            <Input
              value={val}
              onChange={(e) => updateValue(key, e.target.value)}
              placeholder={valuePlaceholder}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(key)}
              disabled={disabled}
              aria-label={`Remove ${key}`}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
      >
        <PlusIcon className="mr-2 size-4" />
        Add system
      </Button>
    </div>
  );
}
