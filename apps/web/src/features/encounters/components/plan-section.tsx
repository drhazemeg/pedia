// apps/web/src/features/encounters/components/plan-section.tsx

import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { Link } from "@tanstack/react-router";
import { FlaskConicalIcon, PillIcon } from "lucide-react";
import { useCallback } from "react";

import type { SoapPlan } from "../types";
import { TagListField } from "./tag-list-field";

export interface PlanSectionProps {
  value: SoapPlan;
  onChange: (value: SoapPlan) => void;
  /** Patient ID, used for the "new prescription" / "new lab order" links. */
  patientId: string;
  /** Encounter ID, used for the same links so the created record backlinks. */
  encounterId: string;
  disabled?: boolean;
}

/**
 * SOAP "P" — Plan. What we're going to do.
 *
 * Medications and investigations link out to their respective creation
 * flows rather than being edited inline. The IDs of records created from
 * those flows land back in `prescriptionIds` / `labOrderIds` (the parent
 * refreshes them from the encounter after those flows navigate back).
 */
export function PlanSection({
  value,
  onChange,
  patientId,
  encounterId,
  disabled,
}: PlanSectionProps) {
  const update = useCallback(
    <K extends keyof SoapPlan>(key: K, v: SoapPlan[K]) => {
      onChange({ ...value, [key]: v });
    },
    [onChange, value]
  );

  return (
    <div className="space-y-4">
      <TagListField
        label="Treatments"
        values={value.treatments}
        onChange={(v) => update("treatments", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Nebulized albuterol in clinic"
        disabled={disabled}
      />

      <div className="space-y-2">
        <Label>Medications</Label>
        {value.prescriptionIds.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {value.prescriptionIds.length} prescription
            {value.prescriptionIds.length === 1 ? "" : "s"} linked to this
            encounter.
          </p>
        )}
        <Link
          to="/patients/$patientId/prescriptions/new"
          params={{ patientId }}
          search={{ encounterId }}
          className="border-input bg-background hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
        >
          <PillIcon className="size-4" />
          Write prescription
        </Link>
      </div>

      <div className="space-y-2">
        <Label>Investigations</Label>
        {value.labOrderIds.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {value.labOrderIds.length} lab order
            {value.labOrderIds.length === 1 ? "" : "s"} linked to this
            encounter.
          </p>
        )}
        <Link
          to="/patients/$patientId/labs/new"
          params={{ patientId }}
          search={{ encounterId }}
          className="border-input bg-background hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
        >
          <FlaskConicalIcon className="size-4" />
          Order labs
        </Link>
      </div>

      <TagListField
        label="Patient education"
        values={value.patientEducation}
        onChange={(v) => update("patientEducation", v)}
        parse={(s) => s.trim() || null}
        renderTag={(tag) => tag}
        placeholder="e.g. Warned about asthma triggers"
        disabled={disabled}
      />

      <div className="space-y-2">
        <Label htmlFor="soap-followup">Follow-up date</Label>
        <Input
          id="soap-followup"
          type="date"
          value={value.followUpDate ?? ""}
          onChange={(e) => update("followUpDate", e.target.value || null)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
