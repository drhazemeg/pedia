// src/lib/services/pediatric/vitals.ts

import { calculatePediatricAge } from "./age";
import type {
  FeverClassification,
  PainSeverity,
  PediatricVitalsNormals,
} from "./types";

// ─── Vitals bands ───────────────────────────────────────────────────────────

interface VitalsBand {
  /** Inclusive upper bound in months. `Infinity` for the final band. */
  maxMonths: number;
  vitals: PediatricVitalsNormals;
}

const VITALS_BANDS = [
  {
    maxMonths: 1,
    vitals: {
      hrMin: 100,
      hrMax: 165,
      rrMin: 30,
      rrMax: 60,
      sbpMin: 60,
      sbpMax: 90,
      dbpMin: 30,
      dbpMax: 60,
    },
  },
  {
    maxMonths: 12,
    vitals: {
      hrMin: 90,
      hrMax: 150,
      rrMin: 24,
      rrMax: 40,
      sbpMin: 70,
      sbpMax: 105,
      dbpMin: 35,
      dbpMax: 65,
    },
  },
  {
    maxMonths: 36,
    vitals: {
      hrMin: 80,
      hrMax: 130,
      rrMin: 20,
      rrMax: 30,
      sbpMin: 80,
      sbpMax: 110,
      dbpMin: 40,
      dbpMax: 70,
    },
  },
  {
    maxMonths: 72,
    vitals: {
      hrMin: 70,
      hrMax: 120,
      rrMin: 18,
      rrMax: 26,
      sbpMin: 85,
      sbpMax: 115,
      dbpMin: 45,
      dbpMax: 75,
    },
  },
  {
    maxMonths: 144,
    vitals: {
      hrMin: 65,
      hrMax: 110,
      rrMin: 16,
      rrMax: 22,
      sbpMin: 90,
      sbpMax: 120,
      dbpMin: 55,
      dbpMax: 80,
    },
  },
  {
    maxMonths: Number.POSITIVE_INFINITY,
    vitals: {
      hrMin: 60,
      hrMax: 100,
      rrMin: 12,
      rrMax: 20,
      sbpMin: 95,
      sbpMax: 130,
      dbpMin: 60,
      dbpMax: 85,
    },
  },
] as const satisfies readonly VitalsBand[];

/**
 * Normal Pediatric Vital Sign Ranges by Age Category.
 *
 * The bands table is the single source of truth — previously six branches
 * each spelled out eight fields, making thresholds hard to scan and easy to
 * mistype.
 */
export function getNormalVitalsForAge(
  ageMonths: number
): PediatricVitalsNormals {
  const band = VITALS_BANDS.find((b) => ageMonths <= b.maxMonths);
  if (!band) {
    throw new Error(
      "VITALS_BANDS is missing its `maxMonths: Infinity` terminal band"
    );
  }
  return band.vitals;
}

/** Get normal vitals for a patient by DOB. */
export function getPediatricNormalVitals(
  dobString: string
): PediatricVitalsNormals {
  return getNormalVitalsForAge(calculatePediatricAge(dobString).totalMonths);
}

// ─── Fever classification ───────────────────────────────────────────────────

interface FeverBand {
  /** Inclusive upper bound in °C. `Infinity` for the final band. */
  maxC: number;
  label: string;
  severity: PainSeverity;
  color: string;
}

const FEVER_BANDS = [
  {
    maxC: 35.5,
    label: "Hypothermia",
    severity: "danger",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    maxC: 37.4,
    label: "Normal Temp",
    severity: "normal",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    maxC: 38.0,
    label: "Low-Grade Temp",
    severity: "warning",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    maxC: 39.0,
    label: "Moderate Fever",
    severity: "warning",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  {
    maxC: Number.POSITIVE_INFINITY,
    label: "High Fever",
    severity: "danger",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
] as const satisfies readonly FeverBand[];

/**
 * Pediatric Fever Level Assessment.
 *
 * Hypothermia is strictly `< 35.5`, so the first band's `maxC` is only
 * reached by the fallthrough finder for values ≥ 35.5. We pre-check it.
 */
export function getFeverClassification(tempC: number): FeverClassification {
  if (tempC < FEVER_BANDS[0].maxC) {
    const { label, severity, color } = FEVER_BANDS[0];
    return { label, severity, color };
  }

  // The `Infinity` terminal band guarantees `find` always matches for tempC >= 35.5.
  const band: FeverBand | undefined = FEVER_BANDS.find((b) => tempC <= b.maxC);
  if (!band) {
    throw new Error(
      "FEVER_BANDS is missing its `maxC: Infinity` terminal band"
    );
  }
  return { label: band.label, severity: band.severity, color: band.color };
}
