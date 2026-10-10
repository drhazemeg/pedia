// src/lib/services/pediatric/assessment.ts

import { round1 } from "./internal";
import type { PainScaleItem } from "./types";

// ─── Pain scale ─────────────────────────────────────────────────────────────

/**
 * Wong-Baker Faces / FLACC Pain Descriptions.
 * Scores are even numbers 0–10.
 */
export const PAIN_SCALE_ITEMS = [
  {
    score: 0,
    label: "No Hurt",
    emoji: "😊",
    desc: "Relaxed, calm and happy",
  },
  {
    score: 2,
    label: "Hurts Little Bit",
    emoji: "🙂",
    desc: "Mild discomfort, easily distracted",
  },
  {
    score: 4,
    label: "Hurts Little More",
    emoji: "😐",
    desc: "Distressed, whimpering occasionally",
  },
  {
    score: 6,
    label: "Hurts Even More",
    emoji: "😟",
    desc: "Moderate pain, crying or frowning",
  },
  {
    score: 8,
    label: "Hurts Whole Lot",
    emoji: "😣",
    desc: "Severe distress, consolable with effort",
  },
  {
    score: 10,
    label: "Hurts Worst",
    emoji: "😭",
    desc: "Inconsolable, screams/cries vigorously",
  },
] as const satisfies readonly PainScaleItem[];

const NO_HURT_ITEM: PainScaleItem = PAIN_SCALE_ITEMS[0];

/** Get pain scale item by exact score. */
export function getPainScaleItem(score: number): PainScaleItem | undefined {
  return PAIN_SCALE_ITEMS.find((item) => item.score === score);
}

/** Get closest matching pain scale item (snaps to nearest even score, clamped 0–10). */
export function getClosestPainScaleItem(score: number): PainScaleItem {
  const clamped = Math.max(0, Math.min(10, score));
  const snapped = Math.round(clamped / 2) * 2;
  return (
    PAIN_SCALE_ITEMS.find((item) => item.score === snapped) ?? NO_HURT_ITEM
  );
}

/** Get pain level description. */
export function getPainLevelDescription(score: number): string {
  const item = getClosestPainScaleItem(score);
  return `${item.emoji} ${item.label}`;
}

// ─── BMI ────────────────────────────────────────────────────────────────────

/** Calculate BMI from weight and height. Returns 0 for invalid inputs. */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return round1(weightKg / (heightM * heightM));
}

/**
 * Get BMI percentile category for children.
 *
 * ⚠️ The cutoffs below are **adult** BMI thresholds, not pediatric
 * BMI-for-age percentiles. They are retained only as a coarse placeholder.
 * Do not use for clinical decisions — replace with a WHO/CDC LMS lookup
 * keyed on `ageMonths` and sex.
 */
export function getBMICategory(bmi: number, ageMonths: number): string {
  if (bmi <= 0) return "Unknown";
  if (ageMonths < 24) return "Not Applicable (Under 2 years)";

  if (bmi < 14.0) return "Underweight";
  if (bmi < 18.0) return "Normal";
  if (bmi < 20.0) return "Overweight";
  return "Obese";
}

// ─── Display formatters ─────────────────────────────────────────────────────

/** Format temperature for display. */
export function formatTemperature(tempC: number): string {
  return `${round1(tempC)}°C`;
}

/** Convert Celsius to Fahrenheit. */
export function celsiusToFahrenheit(tempC: number): number {
  return Math.round((tempC * 9) / 5 + 32);
}

/** Format weight for display. */
export function formatWeight(kg: number): string {
  return `${round1(kg)} kg`;
}

/** Format height for display. */
export function formatHeight(cm: number): string {
  return `${round1(cm)} cm`;
}
