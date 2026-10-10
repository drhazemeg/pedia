import type { BadgeVariant } from "@pedia/ui/components/badge";

export type PercentileBand =
  | "severeLow"
  | "low"
  | "normal"
  | "high"
  | "severeHigh";

export interface PercentileBandConfig {
  /** Badge className applied for this band. */
  className: string;
  /** Numeric [min, max) range, kept for callers that only need the bounds. */
  range: readonly [number, number];
  /** Badge variant applied for this band. */
  variant: BadgeVariant;
}

export const PERCENTILE_BAND_RANGES: Record<
  PercentileBand,
  PercentileBandConfig
> = {
  severeLow: {
    range: [0, 3],
    className: "bg-red-100 text-red-800",
    variant: "destructive",
  },
  low: {
    range: [3, 15],
    className: "bg-amber-100 text-amber-800",
    variant: "secondary",
  },
  normal: {
    range: [15, 85],
    className: "bg-green-100 text-green-800",
    variant: "default",
  },
  high: {
    range: [85, 97],
    className: "bg-amber-100 text-amber-800",
    variant: "secondary",
  },
  severeHigh: {
    range: [97, 100],
    className: "bg-red-100 text-red-800",
    variant: "destructive",
  },
};
