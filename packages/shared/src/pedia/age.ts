// src/lib/services/pediatric/age.ts

import type { AgeGroup } from "../growth-utils";
import { round1 } from "./internal";
import type { FormattedAge } from "./types";

/** Canonical age-group bucketing — the single input every caller agrees on. */
export function getAgeGroupFromMonths(ageMonths: number): AgeGroup {
  if (ageMonths < 1) return "Newborn";
  if (ageMonths < 12) return "Infant";
  if (ageMonths < 36) return "Toddler";
  if (ageMonths < 72) return "Preschool";
  if (ageMonths < 144) return "School-Age";
  return "Adolescent";
}

/** Sentinel returned when the DOB (or target) is missing, invalid, or in the future. */
const UNKNOWN_AGE: FormattedAge = {
  years: 0,
  months: 0,
  days: 0,
  totalMonths: 0,
  totalDays: 0,
  displayString: "Unknown Age",
  ageGroup: "Newborn",
};

/**
 * Calculate accurate pediatric age from Date of Birth.
 *
 * Returns {@link UNKNOWN_AGE} if `dobString` or `targetDateString` is invalid,
 * or if the DOB is after the target date. The canonical `ageGroup` is derived
 * from the *unrounded* month count, so classification never disagrees with
 * `getAgeGroupFromMonths` on boundary values.
 */

/** Build the human-readable age string. Private to this module. */
function formatAgeDisplay(age: {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
}): string {
  const { years, months, days, totalDays, totalMonths } = age;

  if (totalDays <= 28) {
    return `${totalDays} ${totalDays === 1 ? "day" : "days"} old (Neonate)`;
  }
  if (totalMonths < 24) {
    if (years === 0) return `${months} mo${days > 0 ? ` ${days}d` : ""}`;
    if (months === 0) return `${years} yr (${totalMonths} mo)`;
    return `${years} yr ${months} mo (${totalMonths} mo)`;
  }
  return `${years} yrs${months > 0 ? ` ${months} mo` : ""}`;
}
export function calculatePediatricAge(
  dobString: string,
  targetDateString?: string
): FormattedAge {
  const dob = new Date(dobString);
  const target = targetDateString ? new Date(targetDateString) : new Date();

  if (Number.isNaN(dob.getTime()) || Number.isNaN(target.getTime())) {
    return UNKNOWN_AGE;
  }
  if (dob.getTime() > target.getTime()) {
    return UNKNOWN_AGE;
  }

  let years = target.getFullYear() - dob.getFullYear();
  let months = target.getMonth() - dob.getMonth();
  let days = target.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor((target.getTime() - dob.getTime()) / 86_400_000);

  // Compute the unrounded month count for classification, then round for
  // display. Rounding first would push boundary values (e.g. 11.96 → 12.0)
  // into the wrong age group.
  const exactMonths = years * 12 + months + days / 30.4375;
  const totalMonths = round1(exactMonths);

  return {
    years,
    months,
    days,
    totalMonths,
    totalDays,
    displayString: formatAgeDisplay({
      years,
      months,
      days,
      totalDays,
      totalMonths,
    }),
    ageGroup: getAgeGroupFromMonths(exactMonths),
  };
}

/**
 * Short age string for compact UI (table cells, chips). Delegates to
 * {@link calculatePediatricAge} so the thresholds and divisors cannot drift
 * from the verbose formatter.
 *
 * Returns "—" for missing, invalid, or future DOBs.
 */
export function formatAgeShort(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return "—";
  const { totalDays, totalMonths, displayString } =
    calculatePediatricAge(dateOfBirth);
  if (displayString === UNKNOWN_AGE.displayString) return "—";

  if (totalDays < 14) return `${totalDays}d`;
  if (totalDays < 90) return `${Math.floor(totalDays / 7)}w`;
  if (totalMonths < 24) return `${Math.floor(totalMonths)}mo`;
  return `${Math.floor(totalMonths / 12)}y`;
}

export function formatPediatricAge(totalMonths: number, days?: number): string {
  if (!Number.isFinite(totalMonths) || totalMonths < 0) {
    return "—";
  }

  // Under 1 month: prefer days if provided, otherwise round to whole months.
  if (totalMonths < 1) {
    if (typeof days === "number" && Number.isFinite(days) && days >= 0) {
      return `${Math.round(days)}d`;
    }
    return `${Math.round(totalMonths)}m`;
  }

  // Under 24 months: months only.
  if (totalMonths < 24) {
    return `${Math.round(totalMonths)}m`;
  }

  // 24 months and over: years + optional months.
  const years = Math.floor(totalMonths / 12);
  const months = Math.round(totalMonths - years * 12);

  // Roll over to the next year when months rounds up to 12.
  if (months === 12) {
    return `${years + 1}y`;
  }

  return months === 0 ? `${years}y` : `${years}y ${months}m`;
}

/**
 * Format a compact count of pediatric records (e.g. "1.2k patients").
 *
 * Same shape as the original `formatGitHubStars` — kept as a separate
 * helper so a future change to one (e.g. adding a "+" suffix for
 * approximate counts) doesn't accidentally affect the other.
 */
export function formatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) {
    return "0";
  }

  if (count < 1000) {
    return count.toLocaleString("en-US");
  }

  const compactValue = count / 1000;
  const roundedValue =
    compactValue >= 10
      ? Math.round(compactValue)
      : Math.round(compactValue * 10) / 10;

  return `${roundedValue.toLocaleString("en-US", {
    maximumFractionDigits: compactValue >= 10 ? 0 : 1,
    minimumFractionDigits: 0,
  })}k`;
}
