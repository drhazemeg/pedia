"use client";

import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { cn } from "@pedia/ui/lib/utils";
import { useState } from "react";

type Unit = "metric" | "imperial";

type VitalsInputProps = {
  /** Current weight in kilograms (canonical storage). */
  weightKg?: number;
  /** Current height in centimeters (canonical storage). */
  heightCm?: number;
  onChange: (next: { weightKg?: number; heightCm?: number }) => void;
  defaultUnit?: Unit;
  disabled?: boolean;
  className?: string;
  /** Show the height field. Some visits only record weight. */
  showHeight?: boolean;
};
function kgToLb(kg: number) {
  return kg * 2.20462;
}
function lbToKg(lb: number) {
  return lb / 2.20462;
}
function cmToIn(cm: number) {
  return cm / 2.54;
}
function inToCm(inches: number) {
  return inches * 2.54;
}

export function VitalsInput({
  weightKg,
  heightCm,
  onChange,
  defaultUnit = "metric",
  disabled,
  className,
  showHeight = true,
}: VitalsInputProps) {
  const [unit, setUnit] = useState<Unit>(defaultUnit);
  const isMetric = unit === "metric";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Vitals</Label>
        <div className="flex rounded-full border p-0.5 text-xs">
          <button
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              isMetric
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
            onClick={() => setUnit("metric")}
            type="button"
          >
            kg / cm
          </button>
          <button
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              isMetric
                ? "text-muted-foreground"
                : "bg-primary text-primary-foreground"
            )}
            onClick={() => setUnit("imperial")}
            type="button"
          >
            lb / in
          </button>
        </div>
      </div>

      <div className={cn("grid gap-4", showHeight && "sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="vitals-weight">
            Weight ({isMetric ? "kg" : "lb"})
          </Label>
          <Input
            disabled={disabled}
            id="vitals-weight"
            min="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "")
                return onChange({
                  weightKg: undefined,
                  heightCm,
                });
              const num = Number(raw);
              if (Number.isNaN(num)) return;
              onChange({
                weightKg: isMetric ? num : lbToKg(num),
                heightCm,
              });
            }}
            step="0.1"
            type="number"
            value={
              weightKg === undefined
                ? ""
                : isMetric
                  ? weightKg.toFixed(1)
                  : kgToLb(weightKg).toFixed(1)
            }
          />
        </div>

        {showHeight ? (
          <div className="space-y-2">
            <Label htmlFor="vitals-height">
              Height ({isMetric ? "cm" : "in"})
            </Label>
            <Input
              disabled={disabled}
              id="vitals-height"
              min="0"
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  return onChange({
                    weightKg,
                    heightCm: undefined,
                  });
                }
                const num = Number(raw);
                if (Number.isNaN(num)) return;
                onChange({
                  weightKg,
                  heightCm: isMetric ? num : inToCm(num),
                });
              }}
              step="0.1"
              type="number"
              value={
                heightCm === undefined
                  ? ""
                  : isMetric
                    ? heightCm.toFixed(1)
                    : cmToIn(heightCm).toFixed(1)
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
