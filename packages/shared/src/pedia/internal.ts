// src/lib/services/pediatric/internal.ts

import type { Suspension } from "./types";

/** Round to a single decimal place — used throughout for mg / mL / kg / cm / BMI displays. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Scale an mg dose to mL given a suspension concentration. Returns 0 if concentration is invalid. */
export function mgToMl(doseMg: number, suspension: Suspension): number {
  if (suspension.concentrationMg <= 0) return 0;
  return (doseMg / suspension.concentrationMg) * suspension.perVolumeMl;
}
