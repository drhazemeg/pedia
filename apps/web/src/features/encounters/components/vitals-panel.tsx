// apps/web/src/features/encounters/components/vitals-panel.tsx

import { cn } from "@pedia/ui/lib/utils";
import { ActivityIcon } from "lucide-react";

import type { VitalsSnapshot } from "../types";

export interface VitalsPanelProps {
  vitals: VitalsSnapshot | null;
  /** If true, the panel shows a "no vitals recorded" placeholder. */
  className?: string;
}

interface Row {
  label: string;
  value: string;
}

function formatNumber(v: number | null | undefined, unit = ""): string {
  if (v === null || v === undefined) return "—";
  return `${v}${unit}`;
}

function buildRows(v: VitalsSnapshot): Row[] {
  const bp =
    v.bloodPressureSystolic !== null && v.bloodPressureDiastolic !== null
      ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg`
      : "—";

  return [
    { label: "Temperature", value: formatNumber(v.temperatureC, " °C") },
    { label: "Heart rate", value: formatNumber(v.heartRateBpm, " bpm") },
    {
      label: "Respiratory rate",
      value: formatNumber(v.respiratoryRateBpm, " /min"),
    },
    { label: "Blood pressure", value: bp },
    {
      label: "O₂ saturation",
      value: formatNumber(v.oxygenSaturationPercent, " %"),
    },
    { label: "Weight", value: formatNumber(v.weightKg, " kg") },
    { label: "Height", value: formatNumber(v.heightCm, " cm") },
    {
      label: "Head circumference",
      value: formatNumber(v.headCircumferenceCm, " cm"),
    },
  ];
}

/**
 * A snapshot of the patient's vitals at the time the encounter was
 * authored. Rendered read-only in the Objective section — vitals are
 * recorded elsewhere (the vitals router) and pulled in here for context.
 *
 * The snapshot is written once on encounter creation. It is NOT live —
 * if new vitals are recorded during the visit, they don't silently
 * replace the snapshot. That's intentional: the encounter is a record of
 * what was observed at that moment.
 */
export function VitalsPanel({ vitals, className }: VitalsPanelProps) {
  if (!vitals) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-sm",
          className
        )}
      >
        <ActivityIcon className="size-4" />
        No vitals recorded for this encounter
      </div>
    );
  }

  const rows = buildRows(vitals);
  const recordedAt = new Date(vitals.recordedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className={cn("bg-muted/30 rounded-md border p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ActivityIcon className="size-4" />
          Vitals at time of encounter
        </div>
        <span className="text-muted-foreground text-xs">{recordedAt}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-muted-foreground text-xs">{row.label}</dt>
            <dd className="tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
