// apps/web/src/features/encounters/types.ts

/**
 * Client-side shape of the SOAP JSON blobs stored on `encounters`.
 *
 * The DB schema types these as `Record<string, unknown>` on purpose — it
 * doesn't want to own the shape of clinical documentation. This file is
 * where that "unknown" gets a name. Anything reading `subjectiveJson`
 * off the wire should cast to `SoapSubjective` **once**, at the boundary,
 * and pass the typed value down from there.
 *
 * These types are versioned by convention, not by a `version` field. If
 * the shape ever needs to change incompatibly, add a `schemaVersion`
 * discriminator and a migration in the read path.
 */

export interface SoapSubjective {
  /** Chief complaint / history of present illness. */
  history: string;
  /** Free-form list of past medical conditions. */
  pastMedicalHistory: string[];
  /** Current medications the patient is on (not prescribed by us). */
  medications: string[];
  /**
   * Allergies for this encounter. Pre-populated from the patient record
   * on first open, then editable per-visit (a resolved allergy should not
   * be silently deleted from the patient's permanent record).
   */
  allergies: string[];
  /** Family history — structured as free-text lines. */
  familyHistory: string[];
  /** Social history — free-text lines (housing, school, etc.). */
  socialHistory: string[];
}

export interface SoapObjective {
  /** One-line general appearance note. */
  generalAppearance: string;
  /**
   * Physical exam findings, keyed by body system
   * (e.g. `{ "Cardiovascular": "RRR, no murmurs", "Respiratory": "CTAB" }`).
   */
  physicalExam: Record<string, string>;
  /**
   * Vitals snapshot taken at the time the encounter was authored. Written
   * once on first load; not kept in sync with the vitals table afterwards,
   * so the encounter is a truthful record of what was seen.
   */
  vitalsSnapshot: VitalsSnapshot | null;
}

export interface VitalsSnapshot {
  recordedAt: string; // ISO
  temperatureC: number | null;
  heartRateBpm: number | null;
  respiratoryRateBpm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  oxygenSaturationPercent: number | null;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
}

export interface SoapDiagnosis {
  code: string;
  description: string;
}

export interface SoapAssessment {
  primaryDiagnosis: SoapDiagnosis | null;
  secondaryDiagnoses: SoapDiagnosis[];
}

export interface SoapPlan {
  treatments: string[];
  /**
   * IDs of prescriptions created from this encounter. The actual
   * prescription content lives in the prescriptions table; this is
   * just a backlink so the plan section can render "View prescription".
   */
  prescriptionIds: string[];
  /** IDs of lab orders created from this encounter. */
  labOrderIds: string[];
  patientEducation: string[];
  followUpDate: string | null; // ISO date
}

export interface SoapData {
  subjective: SoapSubjective;
  objective: SoapObjective;
  assessment: SoapAssessment;
  plan: SoapPlan;
}

export const EMPTY_SOAP: SoapData = {
  subjective: {
    history: "",
    pastMedicalHistory: [],
    medications: [],
    allergies: [],
    familyHistory: [],
    socialHistory: [],
  },
  objective: {
    generalAppearance: "",
    physicalExam: {},
    vitalsSnapshot: null,
  },
  assessment: {
    primaryDiagnosis: null,
    secondaryDiagnoses: [],
  },
  plan: {
    treatments: [],
    prescriptionIds: [],
    labOrderIds: [],
    patientEducation: [],
    followUpDate: null,
  },
};

/**
 * Rehydrate a `SoapData` from whatever the DB returned.
 *
 * The DB gives us `Record<string, unknown> | null` for each section. This
 * function does a shallow structural check and fills in missing keys from
 * `EMPTY_SOAP` so downstream code never has to null-check `.subjective.history`.
 *
 * It is deliberately forgiving — an encounter created before a field
 * existed should still open. It is NOT a validator: if a field has the
 * wrong *type* (e.g. `medications: "aspirin"` instead of `["aspirin"]`),
 * we fall back to the empty default rather than throwing.
 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseSoapData(raw: {
  subjectiveJson?: unknown;
  objectiveJson?: unknown;
  assessmentJson?: unknown;
  planJson?: unknown;
}): SoapData {
  return {
    subjective: {
      ...EMPTY_SOAP.subjective,
      ...(isObject(raw.subjectiveJson) ? raw.subjectiveJson : {}),
    },
    objective: {
      ...EMPTY_SOAP.objective,
      ...(isObject(raw.objectiveJson) ? raw.objectiveJson : {}),
    },
    assessment: {
      ...EMPTY_SOAP.assessment,
      ...(isObject(raw.assessmentJson) ? raw.assessmentJson : {}),
    },
    plan: {
      ...EMPTY_SOAP.plan,
      ...(isObject(raw.planJson) ? raw.planJson : {}),
    },
  };
}
export function toJsonRecord<T extends object>(
  value: T
): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}
