// src/lib/services/pediatric/types.ts

import type { AgeGroup } from "../growth-utils";

/**
 * Shared types for pediatric clinical utilities.
 * No runtime code lives here — safe to import from anywhere.
 */

// ─── Drug vocabulary ────────────────────────────────────────────────────────

export type DrugCategory =
  | "Antipyretic / Analgesic"
  | "Antibiotic"
  | "Respiratory / Bronchodilator"
  | "Antihistamine"
  | "Antiemetic"
  | "Steroid"
  | "Supplements / Electrolytes";

export type DrugForm =
  | "Suspension / Syrup"
  | "Drops"
  | "Chewable Tablet"
  | "Tablet"
  | "Inhaler / Nebule"
  | "Topical Cream"
  | "Suppository";

export type DrugFrequency =
  | "Once daily"
  | "Every 12 hours (BID)"
  | "Every 8 hours (TID)"
  | "Every 6 hours (QID)"
  | "Every 4-6 hours PRN"
  | "As needed for fever/pain";

export type DrugRoute =
  | "Oral"
  | "Inhalation"
  | "Topical"
  | "Rectal"
  | "Ophthalmic"
  | "Otic";

// ─── Age ────────────────────────────────────────────────────────────────────

export interface FormattedAge {
  ageGroup: AgeGroup;
  days: number;
  displayString: string;
  months: number;
  totalDays: number;
  totalMonths: number;
  years: number;
}

export interface AgeCalculationOptions {
  includeAgeGroup?: boolean;
  targetDate?: Date | string;
}

// ─── Vitals & fever ─────────────────────────────────────────────────────────

export interface PediatricVitalsNormals {
  dbpMax: number;
  dbpMin: number;
  hrMax: number;
  hrMin: number;
  rrMax: number;
  rrMin: number;
  sbpMax: number;
  sbpMin: number;
}

export type PainSeverity = "normal" | "warning" | "danger";

export interface FeverClassification {
  color: string;
  label: string;
  severity: PainSeverity;
}

// ─── Pain scale ─────────────────────────────────────────────────────────────

export interface PainScaleItem {
  desc: string;
  emoji: string;
  label: string;
  score: number;
}

// ─── Formulary ──────────────────────────────────────────────────────────────

export interface Suspension {
  concentrationMg: number;
  label: string;
  perVolumeMl: number;
  unit?: string;
}

export interface FormularyDrug {
  category: DrugCategory;
  defaultDurationDays: number;
  defaultForm: DrugForm;
  dosesPerDay: number;
  frequencyLabel: DrugFrequency;
  genericName: string;
  id: string;
  instructionsTemplate: string;
  isDailyTotal: boolean;
  maxDoseMgPerDay?: number;
  maxDoseMgPerSingleDose?: number;
  minAgeMonths: number;
  name: string;
  route: DrugRoute;
  standardDoseMgPerKg: number;
  suspensions: Suspension[];
  warnings: string;
}

export interface DosageCalculationResult {
  calculatedVolumeMl: number;
  drug: FormularyDrug;
  formattedVolume: string;
  instructions: string;
  isAboveMaxWarning: boolean;
  isUnderAgeWarning: boolean;
  patientWeightKg: number;
  selectedSuspension: Suspension;
  targetDoseMg: number;
}
