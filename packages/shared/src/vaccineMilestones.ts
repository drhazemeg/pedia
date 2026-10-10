/**
 * Standard Pediatric Immunization Schedule & Milestones (CDC / WHO Harmonized)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type VaccineRoute =
  | "Intramuscular"
  | "Subcutaneous"
  | "Oral"
  | "Intradermal";

export type VaccineSite =
  | "Right Anterolateral Thigh"
  | "Left Anterolateral Thigh"
  | "Right Deltoid"
  | "Left Deltoid"
  | "Oral"
  | "Subcutaneous Right Arm"
  | "Subcutaneous Left Arm";

export type ImmunizationStatus = "Due" | "Overdue" | "Upcoming";

export interface VaccineDefinition {
  code: string;
  doseNumber: number;
  manufacturerDefault: string;
  name: string;
  recommendedAgeLabel: string;
  recommendedAgeMonths: number;
  route: VaccineRoute;
  site: VaccineSite;
  targetDisease: string;
}

export interface VaccineScheduleEntry {
  id: string;
  patientId: string;
  vaccineCode: string;
  vaccineName: string;
  targetDisease: string;
  doseNumber: number;
  recommendedAgeLabel: string;
  recommendedAgeMonths: number;
  dueDate: string;
  status: ImmunizationStatus;
  manufacturer: string;
  administrationSite: VaccineSite;
  administrationRoute: VaccineRoute;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const DUE_SOON_WINDOW_DAYS = 7;

// ─── Schedule Data ──────────────────────────────────────────────────────────

export const STANDARD_PEDIATRIC_VACCINES: VaccineDefinition[] = [
  // Birth
  {
    code: "HepB-1",
    name: "Hepatitis B (Dose 1)",
    targetDisease: "Hepatitis B Virus",
    doseNumber: 1,
    recommendedAgeLabel: "Birth",
    recommendedAgeMonths: 0,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "GSK (Engerix-B)",
  },
  {
    code: "BCG-1",
    name: "BCG Vaccine",
    targetDisease: "Tuberculosis",
    doseNumber: 1,
    recommendedAgeLabel: "Birth",
    recommendedAgeMonths: 0,
    site: "Left Deltoid",
    route: "Intradermal",
    manufacturerDefault: "Serum Institute",
  },

  // 2 Months
  {
    code: "DTaP-1",
    name: "DTaP (Diphtheria, Tetanus, acellular Pertussis #1)",
    targetDisease: "Diphtheria, Tetanus, Pertussis",
    doseNumber: 1,
    recommendedAgeLabel: "2 Months",
    recommendedAgeMonths: 2,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (Infanrix)",
  },
  {
    code: "IPV-1",
    name: "Inactivated Poliovirus (IPV #1)",
    targetDisease: "Poliomyelitis",
    doseNumber: 1,
    recommendedAgeLabel: "2 Months",
    recommendedAgeMonths: 2,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (IPOL)",
  },
  {
    code: "Hib-1",
    name: "Haemophilus influenzae type b (Hib #1)",
    targetDisease: "Bacterial Meningitis & Epiglottitis",
    doseNumber: 1,
    recommendedAgeLabel: "2 Months",
    recommendedAgeMonths: 2,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Merck (PedvaxHIB)",
  },
  {
    code: "PCV15-1",
    name: "Pneumococcal Conjugate (PCV15/PCV20 #1)",
    targetDisease: "Streptococcus pneumoniae (Pneumonia, Meningitis)",
    doseNumber: 1,
    recommendedAgeLabel: "2 Months",
    recommendedAgeMonths: 2,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Pfizer (Prevnar 20)",
  },
  {
    code: "Rota-1",
    name: "Rotavirus (RV5 / RV1 #1)",
    targetDisease: "Rotavirus Gastroenteritis",
    doseNumber: 1,
    recommendedAgeLabel: "2 Months",
    recommendedAgeMonths: 2,
    site: "Oral",
    route: "Oral",
    manufacturerDefault: "Merck (Rotateq)",
  },

  // 4 Months
  {
    code: "DTaP-2",
    name: "DTaP (Dose 2)",
    targetDisease: "Diphtheria, Tetanus, Pertussis",
    doseNumber: 2,
    recommendedAgeLabel: "4 Months",
    recommendedAgeMonths: 4,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (Infanrix)",
  },
  {
    code: "IPV-2",
    name: "Inactivated Poliovirus (IPV #2)",
    targetDisease: "Poliomyelitis",
    doseNumber: 2,
    recommendedAgeLabel: "4 Months",
    recommendedAgeMonths: 4,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (IPOL)",
  },
  {
    code: "Hib-2",
    name: "Hib (Dose 2)",
    targetDisease: "Haemophilus influenzae type b",
    doseNumber: 2,
    recommendedAgeLabel: "4 Months",
    recommendedAgeMonths: 4,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Merck (PedvaxHIB)",
  },
  {
    code: "PCV15-2",
    name: "Pneumococcal Conjugate (Dose 2)",
    targetDisease: "Streptococcus pneumoniae",
    doseNumber: 2,
    recommendedAgeLabel: "4 Months",
    recommendedAgeMonths: 4,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Pfizer (Prevnar 20)",
  },
  {
    code: "Rota-2",
    name: "Rotavirus (Dose 2)",
    targetDisease: "Rotavirus Gastroenteritis",
    doseNumber: 2,
    recommendedAgeLabel: "4 Months",
    recommendedAgeMonths: 4,
    site: "Oral",
    route: "Oral",
    manufacturerDefault: "Merck (Rotateq)",
  },

  // 6 Months
  {
    code: "DTaP-3",
    name: "DTaP (Dose 3)",
    targetDisease: "Diphtheria, Tetanus, Pertussis",
    doseNumber: 3,
    recommendedAgeLabel: "6 Months",
    recommendedAgeMonths: 6,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (Infanrix)",
  },
  {
    code: "HepB-2",
    name: "Hepatitis B (Dose 2)",
    targetDisease: "Hepatitis B Virus",
    doseNumber: 2,
    recommendedAgeLabel: "6 Months",
    recommendedAgeMonths: 6,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "GSK (Engerix-B)",
  },
  {
    code: "PCV15-3",
    name: "Pneumococcal Conjugate (Dose 3)",
    targetDisease: "Streptococcus pneumoniae",
    doseNumber: 3,
    recommendedAgeLabel: "6 Months",
    recommendedAgeMonths: 6,
    site: "Right Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Pfizer (Prevnar 20)",
  },
  {
    code: "Flu-Annual",
    name: "Influenza (Inactivated / Quadrivalent)",
    targetDisease: "Seasonal Influenza",
    doseNumber: 1,
    recommendedAgeLabel: "6+ Months (Annual)",
    recommendedAgeMonths: 6,
    site: "Left Anterolateral Thigh",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi (Fluzone)",
  },

  // 12 Months
  {
    code: "MMR-1",
    name: "Measles, Mumps, Rubella (MMR #1)",
    targetDisease: "Measles, Mumps, Rubella",
    doseNumber: 1,
    recommendedAgeLabel: "12 Months",
    recommendedAgeMonths: 12,
    site: "Subcutaneous Right Arm",
    route: "Subcutaneous",
    manufacturerDefault: "Merck (M-M-R II)",
  },
  {
    code: "Varicella-1",
    name: "Varicella (Chickenpox #1)",
    targetDisease: "Varicella Zoster Virus",
    doseNumber: 1,
    recommendedAgeLabel: "12 Months",
    recommendedAgeMonths: 12,
    site: "Subcutaneous Left Arm",
    route: "Subcutaneous",
    manufacturerDefault: "Merck (Varivax)",
  },
  {
    code: "HepA-1",
    name: "Hepatitis A (Dose 1)",
    targetDisease: "Hepatitis A Virus",
    doseNumber: 1,
    recommendedAgeLabel: "12 Months",
    recommendedAgeMonths: 12,
    site: "Right Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "GSK (Havrix)",
  },

  // 15 - 18 Months
  {
    code: "DTaP-4",
    name: "DTaP Booster (Dose 4)",
    targetDisease: "Diphtheria, Tetanus, Pertussis",
    doseNumber: 4,
    recommendedAgeLabel: "15-18 Months",
    recommendedAgeMonths: 15,
    site: "Left Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (Infanrix)",
  },
  {
    code: "Hib-Booster",
    name: "Hib Booster (Dose 3/4)",
    targetDisease: "Haemophilus influenzae type b",
    doseNumber: 3,
    recommendedAgeLabel: "15 Months",
    recommendedAgeMonths: 15,
    site: "Right Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Merck (PedvaxHIB)",
  },
  {
    code: "HepA-2",
    name: "Hepatitis A (Dose 2)",
    targetDisease: "Hepatitis A Virus",
    doseNumber: 2,
    recommendedAgeLabel: "18 Months",
    recommendedAgeMonths: 18,
    site: "Right Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "GSK (Havrix)",
  },

  // 4 - 6 Years
  {
    code: "DTaP-5",
    name: "DTaP Booster (Dose 5)",
    targetDisease: "Diphtheria, Tetanus, Pertussis",
    doseNumber: 5,
    recommendedAgeLabel: "4-6 Years",
    recommendedAgeMonths: 48,
    site: "Left Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (Infanrix)",
  },
  {
    code: "IPV-3",
    name: "Inactivated Poliovirus (IPV #3)",
    targetDisease: "Poliomyelitis",
    doseNumber: 3,
    recommendedAgeLabel: "4-6 Years",
    recommendedAgeMonths: 48,
    site: "Left Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi Pasteur (IPOL)",
  },
  {
    code: "MMR-2",
    name: "MMR (Dose 2)",
    targetDisease: "Measles, Mumps, Rubella",
    doseNumber: 2,
    recommendedAgeLabel: "4-6 Years",
    recommendedAgeMonths: 48,
    site: "Subcutaneous Right Arm",
    route: "Subcutaneous",
    manufacturerDefault: "Merck (M-M-R II)",
  },
  {
    code: "Varicella-2",
    name: "Varicella (Dose 2)",
    targetDisease: "Varicella Zoster Virus",
    doseNumber: 2,
    recommendedAgeLabel: "4-6 Years",
    recommendedAgeMonths: 48,
    site: "Subcutaneous Left Arm",
    route: "Subcutaneous",
    manufacturerDefault: "Merck (Varivax)",
  },

  // 11 - 12 Years
  {
    code: "Tdap-1",
    name: "Tdap Adolescent Booster",
    targetDisease: "Tetanus, Diphtheria, Pertussis",
    doseNumber: 1,
    recommendedAgeLabel: "11-12 Years",
    recommendedAgeMonths: 132,
    site: "Left Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi (Adacel)",
  },
  {
    code: "HPV-1",
    name: "HPV 9-Valent (Dose 1)",
    targetDisease: "Human Papillomavirus",
    doseNumber: 1,
    recommendedAgeLabel: "11-12 Years",
    recommendedAgeMonths: 132,
    site: "Right Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Merck (Gardasil 9)",
  },
  {
    code: "MenACWY-1",
    name: "Meningococcal Conjugate (MenACWY #1)",
    targetDisease: "Neisseria meningitidis A, C, W, Y",
    doseNumber: 1,
    recommendedAgeLabel: "11-12 Years",
    recommendedAgeMonths: 132,
    site: "Left Deltoid",
    route: "Intramuscular",
    manufacturerDefault: "Sanofi (MenQuadfi)",
  },
];

// ─── Schedule Generation ────────────────────────────────────────────────────

/** Whole-day difference between two dates, ignoring time-of-day. */
function diffInDays(from: Date, to: Date): number {
  const fromStart = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  );
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toStart.getTime() - fromStart.getTime()) / MS_PER_DAY);
}

function classifyStatus(daysUntilDue: number): ImmunizationStatus {
  if (daysUntilDue < 0) return "Overdue";
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return "Due";
  return "Upcoming";
}

/**
 * Generate standard scheduled immunization milestones for a new pediatric patient.
 *
 * `status` is computed against the wall-clock date (ignores time-of-day):
 *   - `Overdue`  → due date is in the past
 *   - `Due`      → due within the next `DUE_SOON_WINDOW_DAYS` days
 *   - `Upcoming` → due further out
 */
export function generatePatientImmunizationSchedule(
  patientId: string,
  dobString: string
): VaccineScheduleEntry[] {
  const dob = new Date(dobString);
  const now = new Date();
  const nowIso = now.toISOString();

  return STANDARD_PEDIATRIC_VACCINES.map((vaccine, index) => {
    const dueDate = new Date(dob);
    dueDate.setMonth(dueDate.getMonth() + vaccine.recommendedAgeMonths);

    return {
      id: `imm-${patientId}-${vaccine.code}-${index}`,
      patientId,
      vaccineCode: vaccine.code,
      vaccineName: vaccine.name,
      targetDisease: vaccine.targetDisease,
      doseNumber: vaccine.doseNumber,
      recommendedAgeLabel: vaccine.recommendedAgeLabel,
      recommendedAgeMonths: vaccine.recommendedAgeMonths,
      dueDate: dueDate.toISOString(),
      status: classifyStatus(diffInDays(now, dueDate)),
      manufacturer: vaccine.manufacturerDefault,
      administrationSite: vaccine.site,
      administrationRoute: vaccine.route,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}
