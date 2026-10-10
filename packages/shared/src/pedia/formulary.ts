// src/lib/services/pediatric/formulary.ts

import { mgToMl, round1 } from "./internal";
import type {
  DosageCalculationResult,
  DrugCategory,
  FormularyDrug,
  Suspension,
} from "./types";

// ─── Catalog ────────────────────────────────────────────────────────────────

export const PEDIATRIC_FORMULARY: FormularyDrug[] = [
  {
    id: "paracetamol",
    name: "Paracetamol / Acetaminophen",
    genericName: "Paracetamol",
    category: "Antipyretic / Analgesic",
    standardDoseMgPerKg: 15,
    isDailyTotal: false,
    dosesPerDay: 4,
    minAgeMonths: 1,
    maxDoseMgPerSingleDose: 1000,
    maxDoseMgPerDay: 4000,
    suspensions: [
      {
        label: "Syrup 120 mg / 5 mL",
        concentrationMg: 120,
        perVolumeMl: 5,
      },
      {
        label: "Forte Syrup 250 mg / 5 mL",
        concentrationMg: 250,
        perVolumeMl: 5,
      },
      {
        label: "Infant Drops 100 mg / 1 mL",
        concentrationMg: 100,
        perVolumeMl: 1,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 4-6 hours PRN",
    route: "Oral",
    defaultDurationDays: 3,
    instructionsTemplate:
      "Give {ml} mL by mouth every 4 to 6 hours as needed for fever > 38.5°C or pain (max 4 doses in 24 hours).",
    warnings:
      "Do not exceed 4 doses in 24 hours. Ensure patient is well-hydrated.",
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    category: "Antipyretic / Analgesic",
    standardDoseMgPerKg: 10,
    isDailyTotal: false,
    dosesPerDay: 3,
    minAgeMonths: 6,
    maxDoseMgPerSingleDose: 400,
    maxDoseMgPerDay: 1200,
    suspensions: [
      {
        label: "Infant Suspension 100 mg / 5 mL",
        concentrationMg: 100,
        perVolumeMl: 5,
      },
      {
        label: "Junior Strength 200 mg / 5 mL",
        concentrationMg: 200,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 8 hours (TID)",
    route: "Oral",
    defaultDurationDays: 3,
    instructionsTemplate:
      "Give {ml} mL with or after food every 8 hours as needed for inflammatory pain or persistent fever.",
    warnings:
      "Avoid in infants under 6 months or in cases of severe dehydration / varicella infection.",
  },
  {
    id: "amoxicillin-standard",
    name: "Amoxicillin (Standard Dose)",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotic",
    standardDoseMgPerKg: 50,
    isDailyTotal: true,
    dosesPerDay: 3,
    minAgeMonths: 1,
    maxDoseMgPerSingleDose: 500,
    maxDoseMgPerDay: 1500,
    suspensions: [
      {
        label: "Suspension 125 mg / 5 mL",
        concentrationMg: 125,
        perVolumeMl: 5,
      },
      {
        label: "Suspension 250 mg / 5 mL",
        concentrationMg: 250,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 8 hours (TID)",
    route: "Oral",
    defaultDurationDays: 7,
    instructionsTemplate:
      "Give {ml} mL by mouth every 8 hours. Complete full 7-day course even if child improves.",
    warnings: "Check for penicillin allergy before administration.",
  },
  {
    id: "amoxicillin-high-dose",
    name: "Amoxicillin High-Dose (AOM Protocol)",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotic",
    standardDoseMgPerKg: 90,
    isDailyTotal: true,
    dosesPerDay: 2,
    minAgeMonths: 2,
    maxDoseMgPerSingleDose: 1000,
    maxDoseMgPerDay: 2000,
    suspensions: [
      {
        label: "Extra-Strength 400 mg / 5 mL",
        concentrationMg: 400,
        perVolumeMl: 5,
      },
      {
        label: "Suspension 250 mg / 5 mL",
        concentrationMg: 250,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 12 hours (BID)",
    route: "Oral",
    defaultDurationDays: 10,
    instructionsTemplate:
      "Give {ml} mL by mouth every 12 hours for 10 days for acute middle ear infection.",
    warnings:
      "High dose protocol for resistant Streptococcus pneumoniae. Monitor for loose stools.",
  },
  {
    id: "amox-clav",
    name: "Amoxicillin-Clavulanate (Augmentin)",
    genericName: "Amoxicillin / Clavulanate Potassium (7:1 ratio)",
    category: "Antibiotic",
    standardDoseMgPerKg: 45,
    isDailyTotal: true,
    dosesPerDay: 2,
    minAgeMonths: 2,
    maxDoseMgPerSingleDose: 875,
    maxDoseMgPerDay: 1750,
    suspensions: [
      {
        label: "Augmentin Duo 228 mg / 5 mL",
        concentrationMg: 200,
        perVolumeMl: 5,
      },
      {
        label: "Augmentin ES 600 mg / 5 mL",
        concentrationMg: 600,
        perVolumeMl: 5,
      },
      {
        label: "Augmentin 156 mg / 5 mL",
        concentrationMg: 125,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 12 hours (BID)",
    route: "Oral",
    defaultDurationDays: 7,
    instructionsTemplate:
      "Give {ml} mL by mouth at the start of a meal every 12 hours for 7 days.",
    warnings: "Take with food to minimize GI intolerance and diarrhea.",
  },
  {
    id: "azithromycin",
    name: "Azithromycin (Zithromax)",
    genericName: "Azithromycin Dihydrate",
    category: "Antibiotic",
    standardDoseMgPerKg: 10,
    isDailyTotal: true,
    dosesPerDay: 1,
    minAgeMonths: 6,
    maxDoseMgPerSingleDose: 500,
    maxDoseMgPerDay: 500,
    suspensions: [
      {
        label: "Suspension 200 mg / 5 mL",
        concentrationMg: 200,
        perVolumeMl: 5,
      },
      {
        label: "Suspension 100 mg / 5 mL",
        concentrationMg: 100,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Once daily",
    route: "Oral",
    defaultDurationDays: 3,
    instructionsTemplate:
      "Give {ml} mL by mouth once daily 1 hour before or 2 hours after meals for 3 consecutive days.",
    warnings:
      "Atypical coverage. Observe for QT prolongation risks if concurrent macrolide sensitivity.",
  },
  {
    id: "salbutamol",
    name: "Salbutamol / Albuterol Inhaler",
    genericName: "Salbutamol Sulphate",
    category: "Respiratory / Bronchodilator",
    standardDoseMgPerKg: 0,
    isDailyTotal: false,
    dosesPerDay: 4,
    minAgeMonths: 6,
    suspensions: [
      {
        label: "MDI 100 mcg / puff (AeroChamber)",
        concentrationMg: 0.1,
        perVolumeMl: 1,
      },
      {
        label: "Nebules 2.5 mg / 2.5 mL",
        concentrationMg: 2.5,
        perVolumeMl: 2.5,
      },
    ],
    defaultForm: "Inhaler / Nebule",
    frequencyLabel: "Every 4-6 hours PRN",
    route: "Inhalation",
    defaultDurationDays: 5,
    instructionsTemplate:
      "Administer 2 puffs via pediatric spacer with mask every 4 to 6 hours as needed for wheeze or cough.",
    warnings:
      "Always use with spacer device. If child requires > 6 puffs in 4 hours, seek emergency care immediately.",
  },
  {
    id: "cetirizine",
    name: "Cetirizine (Zyrtec)",
    genericName: "Cetirizine Hydrochloride",
    category: "Antihistamine",
    standardDoseMgPerKg: 0.25,
    isDailyTotal: true,
    dosesPerDay: 1,
    minAgeMonths: 6,
    maxDoseMgPerSingleDose: 10,
    maxDoseMgPerDay: 10,
    suspensions: [
      {
        label: "Syrup 5 mg / 5 mL (1 mg/mL)",
        concentrationMg: 5,
        perVolumeMl: 5,
      },
      {
        label: "Infant Drops 10 mg / 1 mL",
        concentrationMg: 10,
        perVolumeMl: 1,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Once daily",
    route: "Oral",
    defaultDurationDays: 5,
    instructionsTemplate:
      "Give {ml} mL by mouth once daily in the evening for allergic rhinitis / urticaria.",
    warnings: "Non-sedating in most children, but mild drowsiness may occur.",
  },
  {
    id: "ondansetron",
    name: "Ondansetron (Zofran)",
    genericName: "Ondansetron Hydrochloride",
    category: "Antiemetic",
    standardDoseMgPerKg: 0.15,
    isDailyTotal: false,
    dosesPerDay: 3,
    minAgeMonths: 6,
    maxDoseMgPerSingleDose: 4,
    maxDoseMgPerDay: 12,
    suspensions: [
      { label: "Syrup 4 mg / 5 mL", concentrationMg: 4, perVolumeMl: 5 },
      {
        label: "Oral Dissolving Tablet 4 mg",
        concentrationMg: 4,
        perVolumeMl: 1,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Every 8 hours (TID)",
    route: "Oral",
    defaultDurationDays: 2,
    instructionsTemplate:
      "Give {ml} mL single dose 15 minutes prior to starting oral rehydration solution.",
    warnings:
      "Indicated for persistent vomiting preventing oral rehydration in gastroenteritis.",
  },
  {
    id: "prednisolone",
    name: "Prednisolone Oral Solution",
    genericName: "Prednisolone Sodium Phosphate",
    category: "Steroid",
    standardDoseMgPerKg: 1.0,
    isDailyTotal: true,
    dosesPerDay: 1,
    minAgeMonths: 12,
    maxDoseMgPerSingleDose: 40,
    maxDoseMgPerDay: 40,
    suspensions: [
      {
        label: "Solution 15 mg / 5 mL (3 mg/mL)",
        concentrationMg: 15,
        perVolumeMl: 5,
      },
    ],
    defaultForm: "Suspension / Syrup",
    frequencyLabel: "Once daily",
    route: "Oral",
    defaultDurationDays: 3,
    instructionsTemplate:
      "Give {ml} mL with breakfast in the morning for 3 days for acute asthma flare-up. No taper required for ≤ 3 days.",
    warnings:
      "Give with food or milk to prevent stomach upset. Monitor for behavioral changes.",
  },
];

const DEFAULT_SUSPENSION: Suspension = {
  label: "",
  concentrationMg: 0,
  perVolumeMl: 1,
  unit: "mg/mL",
};

// ─── Dosage math ────────────────────────────────────────────────────────────

/**
 * Calculate pediatric dosage for a given drug.
 *
 * Enforces both the per-dose cap and the derived per-dose slice of the daily
 * cap. The original implementation silently ignored `maxDoseMgPerDay` whenever
 * `maxDoseMgPerSingleDose * dosesPerDay` exceeded it.
 */
export function calculatePediatricDose(
  drugId: string,
  weightKg: number,
  ageMonths: number,
  customSuspensionIndex = 0,
  customDosePerKg?: number
): DosageCalculationResult | null {
  if (weightKg <= 0 || ageMonths < 0) return null;

  const drug = PEDIATRIC_FORMULARY.find((d) => d.id === drugId);
  if (!drug) return null;

  const dosePerKg = customDosePerKg ?? drug.standardDoseMgPerKg;
  let totalMg = dosePerKg * weightKg;

  if (drug.isDailyTotal && drug.dosesPerDay > 1) {
    totalMg /= drug.dosesPerDay;
  }

  let isAboveMax = false;

  if (
    drug.maxDoseMgPerSingleDose !== undefined &&
    totalMg > drug.maxDoseMgPerSingleDose
  ) {
    totalMg = drug.maxDoseMgPerSingleDose;
    isAboveMax = true;
  }

  if (drug.maxDoseMgPerDay !== undefined && drug.dosesPerDay > 0) {
    const perDoseDailyCap = drug.maxDoseMgPerDay / drug.dosesPerDay;
    if (totalMg > perDoseDailyCap) {
      totalMg = perDoseDailyCap;
      isAboveMax = true;
    }
  }

  const roundedMg = round1(totalMg);

  const suspension =
    drug.suspensions[customSuspensionIndex] ??
    drug.suspensions[0] ??
    DEFAULT_SUSPENSION;

  const roundedVolume = round1(mgToMl(roundedMg, suspension));

  return {
    drug,
    patientWeightKg: weightKg,
    targetDoseMg: roundedMg,
    selectedSuspension: suspension,
    calculatedVolumeMl: roundedVolume,
    formattedVolume: `${roundedVolume} mL`,
    instructions: drug.instructionsTemplate.replace(
      "{ml}",
      roundedVolume.toString()
    ),
    isAboveMaxWarning: isAboveMax,
    isUnderAgeWarning: ageMonths < drug.minAgeMonths,
  };
}

/** Calculate total daily dose for a drug. */
export function calculateTotalDailyDose(
  drugId: string,
  weightKg: number
): number | null {
  const drug = PEDIATRIC_FORMULARY.find((d) => d.id === drugId);
  if (!drug || weightKg <= 0) return null;

  const raw = drug.standardDoseMgPerKg * weightKg;
  const capped =
    drug.maxDoseMgPerDay === undefined
      ? raw
      : Math.min(raw, drug.maxDoseMgPerDay);

  return round1(capped);
}

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Find a drug by ID, name, or generic name. */
export function findDrug(search: string): FormularyDrug | undefined {
  const normalized = search.toLowerCase().trim();
  return PEDIATRIC_FORMULARY.find(
    (drug) =>
      drug.id.toLowerCase() === normalized ||
      drug.name.toLowerCase().includes(normalized) ||
      drug.genericName.toLowerCase().includes(normalized)
  );
}

/** Get drugs by category. */
export function getDrugsByCategory(category: DrugCategory): FormularyDrug[] {
  return PEDIATRIC_FORMULARY.filter((drug) => drug.category === category);
}

/** Get available suspensions for a drug. */
export function getDrugSuspensions(drugId: string): Suspension[] | null {
  return PEDIATRIC_FORMULARY.find((d) => d.id === drugId)?.suspensions ?? null;
}
