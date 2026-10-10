// apps/web/src/features/encounters/components/subjective-section.tsx

import { Label } from "@pedia/ui/components/label";
import { Textarea } from "@pedia/ui/components/textarea";
import { useCallback } from "react";

import type { SoapSubjective } from "../types";
import { TagListField } from "./tag-list-field";

export interface SubjectiveSectionProps {
  value: SoapSubjective;
  onChange: (value: SoapSubjective) => void;
  disabled?: boolean;
}

/**
 * SOAP "S" — Subjective. Everything the patient (or parent) reports,
 * plus their history. No exam findings here.
 */
export function SubjectiveSection({
  value,
  onChange,
  disabled,
}: SubjectiveSectionProps) {
  const update = useCallback(
    <K extends keyof SoapSubjective>(key: K, v: SoapSubjective[K]) => {
      onChange({ ...value, [key]: v });
    },
    [onChange, value]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="soap-history">History of present illness</Label>
        <Textarea
          id="soap-history"
          rows={5}
          value={value.history}
          onChange={(e) => update("history", e.target.value)}
          placeholder="Chief complaint, onset, duration, character, aggravating/relieving factors…"
          disabled={disabled}
        />
      </div>

      <TagListField
        label="Past medical history"
        values={value.pastMedicalHistory}
        onChange={(v) => update("pastMedicalHistory", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Premature birth, asthma"
        disabled={disabled}
      />

      <TagListField
        label="Current medications"
        values={value.medications}
        onChange={(v) => update("medications", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Albuterol PRN"
        disabled={disabled}
      />

      <TagListField
        label="Allergies"
        values={value.allergies}
        onChange={(v) => update("allergies", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="Auto-populated from patient record; add visit-specific findings"
        disabled={disabled}
      />

      <TagListField
        label="Family history"
        values={value.familyHistory}
        onChange={(v) => update("familyHistory", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Maternal asthma"
        disabled={disabled}
      />

      <TagListField
        label="Social history"
        values={value.socialHistory}
        onChange={(v) => update("socialHistory", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Attends daycare, lives with both parents"
        disabled={disabled}
      />
    </div>
  );
}
