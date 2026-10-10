// apps/web/src/features/encounters/components/objective-section.tsx

import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { useCallback } from "react";

import type { SoapObjective, VitalsSnapshot } from "../types";
import { KeyValueEditor } from "./key-value-editor";
import { VitalsPanel } from "./vitals-panel";

export interface ObjectiveSectionProps {
  value: SoapObjective;
  onChange: (value: SoapObjective) => void;
  /** Latest vitals, shown as a read-only panel. */
  latestVitals: VitalsSnapshot | null;
  disabled?: boolean;
}

/**
 * SOAP "O" — Objective. Exam findings and vitals.
 *
 * Vitals are auto-populated from the vitals router on first open (the
 * parent does that once, when the encounter loads, by setting
 * `value.vitalsSnapshot` if it's currently null). The panel below is
 * read-only because the snapshot is a record, not a live view.
 */
export function ObjectiveSection({
  value,
  onChange,
  latestVitals,
  disabled,
}: ObjectiveSectionProps) {
  const update = useCallback(
    <K extends keyof SoapObjective>(key: K, v: SoapObjective[K]) => {
      onChange({ ...value, [key]: v });
    },
    [onChange, value]
  );

  // Prefer the recorded snapshot; fall back to the freshest vitals so a
  // brand-new encounter still shows something useful.
  const vitals = value.vitalsSnapshot ?? latestVitals;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="soap-general-appearance">General appearance</Label>
        <Input
          id="soap-general-appearance"
          value={value.generalAppearance}
          onChange={(e) => update("generalAppearance", e.target.value)}
          placeholder="e.g. Well-appearing, no acute distress"
          disabled={disabled}
        />
      </div>

      <VitalsPanel vitals={vitals} />

      <KeyValueEditor
        label="Physical exam"
        value={value.physicalExam}
        onChange={(v) => update("physicalExam", v)}
        disabled={disabled}
      />
    </div>
  );
}
