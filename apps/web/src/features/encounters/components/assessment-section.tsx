// apps/web/src/features/encounters/components/assessment-section.tsx

import { useCallback } from "react";

import type { SoapAssessment, SoapDiagnosis } from "../types";
import { Icd10Combobox } from "./icd10-combobox";
import { TagListField } from "./tag-list-field";

export interface AssessmentSectionProps {
  value: SoapAssessment;
  onChange: (value: SoapAssessment) => void;
  disabled?: boolean;
}

/**
 * SOAP "A" — Assessment. Diagnoses.
 *
 * The primary diagnosis is required (validated server-side). Secondary
 * diagnoses are optional and free-form — a subset of what the doctor
 * might record.
 */
export function AssessmentSection({
  value,
  onChange,
  disabled,
}: AssessmentSectionProps) {
  const setPrimary = useCallback(
    (primary: SoapDiagnosis | null) => {
      onChange({ ...value, primaryDiagnosis: primary });
    },
    [onChange, value]
  );

  const setSecondary = useCallback(
    (secondary: SoapDiagnosis[]) => {
      onChange({ ...value, secondaryDiagnoses: secondary });
    },
    [onChange, value]
  );

  return (
    <div className="space-y-4">
      <Icd10Combobox
        label="Primary diagnosis"
        value={value.primaryDiagnosis}
        onChange={setPrimary}
        disabled={disabled}
      />

      <TagListField<SoapDiagnosis>
        label="Secondary diagnoses"
        values={value.secondaryDiagnoses}
        onChange={setSecondary}
        // The parse function is only invoked when the user types free
        // text — the combobox handles the primary. For secondaries we
        // accept the raw text as the description with no code.
        parse={(s) => (s.trim() ? { code: "", description: s.trim() } : null)}
        renderTag={(tag) =>
          tag.code ? `${tag.code} — ${tag.description}` : tag.description
        }
        placeholder="Type a diagnosis and press Enter"
        disabled={disabled}
      />
    </div>
  );
}
