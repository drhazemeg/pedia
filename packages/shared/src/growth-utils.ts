// src/components/growth/growth-utils.ts

export type AgeGroup =
  | "Newborn"
  | "Infant"
  | "Toddler"
  | "Preschool"
  | "School-Age"
  | "Adolescent";

/**
 * Age ranges are half-open: `[min, max)` in months.
 * WHO uses 0–60 months for the "under-5" charts; older charts go to 228.
 */
export const AGE_GROUP_RANGES = {
  Newborn: [0, 1],
  Infant: [1, 12],
  Toddler: [12, 36],
  Preschool: [36, 72],
  "School-Age": [72, 144],
  Adolescent: [144, 240],
} as const satisfies Record<AgeGroup, readonly [number, number]>;

export type PercentileBand =
  | "severe-low"
  | "low"
  | "normal"
  | "high"
  | "severe-high";

export const PERCENTILE_BAND_RANGES = {
  "severe-low": {
    range: [0, 3],
    lowerInclusive: true,
    upperInclusive: false,
    variant: "destructive",
    className: "",
    label: "< 3rd",
  },
  low: {
    range: [3, 15],
    lowerInclusive: true,
    upperInclusive: false,
    variant: "outline",
    className: "border-amber-300 text-amber-700 dark:text-amber-400",
    label: "3rd – 15th",
  },
  normal: {
    range: [15, 85],
    lowerInclusive: true,
    upperInclusive: true,
    variant: "secondary",
    className: "",
    label: "15th – 85th",
  },
  high: {
    range: [85, 97],
    lowerInclusive: false,
    upperInclusive: true,
    variant: "outline",
    className: "border-amber-300 text-amber-700 dark:text-amber-400",
    label: "85th – 97th",
  },
  "severe-high": {
    range: [97, 100],
    lowerInclusive: false,
    upperInclusive: true,
    variant: "destructive",
    className: "",
    label: "> 97th",
  },
} as const satisfies Record<
  PercentileBand,
  {
    range: readonly [number, number];
    lowerInclusive: boolean;
    upperInclusive: boolean;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
    label: string;
  }
>;

/**
 * WHO percentile bands for flagging clinical outliers. These match the
 * WHO/CDC convention: 3rd/15th/85th/97th are the practical cut-points.
 */
export function classifyPercentile(percentile: number): PercentileBand {
  if (percentile < 3) return "severe-low";
  if (percentile < 15) return "low";
  if (percentile <= 85) return "normal";
  if (percentile <= 97) return "high";
  return "severe-high";
}

/**
 * Z-score based bands (used by the chart's tooltip). WHO flags |z| > 2 as
 * "moderate" and |z| > 3 as "severe."
 */
export function classifyZScore(z: number | null | undefined): PercentileBand {
  if (z == null || !Number.isFinite(z)) return "normal";
  if (z < -3) return "severe-low";
  if (z < -2) return "low";
  if (z <= 2) return "normal";
  if (z <= 3) return "high";
  return "severe-high";
}
export function formatAge(dateOfBirth: string, now = new Date()): string {
  const [year = 0, month = 0, day = 0] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (birthDate > today) return "Not born yet";

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const previousMonthDays = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    ).getDate();
    days += previousMonthDays;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years}y ${months}m`;
  }
  if (months > 0) {
    return `${months}m ${days}d`;
  }
  return `${days}d`;
}

/** "5m", "18m", "2y 3m", "5y" */
export function formatMonth(months: number): string {
  if (!Number.isFinite(months) || months < 0) return "—";
  if (months < 1) return "0m";

  const wholeMonths = Math.floor(months);

  if (wholeMonths < 24) return `${wholeMonths}m`;

  const years = Math.floor(wholeMonths / 12);
  const remainder = wholeMonths % 12;
  return remainder === 0 ? `${years}y` : `${years}y ${remainder}m`;
}

/** "3rd", "15th", "50th", "97th", "99th" — ordinal suffix without locale surprises. */
export function formatPercentileOrdinal(percentile: number): string {
  const rounded = Math.round(percentile);
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;

  if (mod10 === 1 && mod100 !== 11) return `${rounded}st`;
  if (mod10 === 2 && mod100 !== 12) return `${rounded}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${rounded}rd`;
  return `${rounded}th`;
}
