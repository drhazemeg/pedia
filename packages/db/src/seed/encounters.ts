// scripts/src/seed/encounters.ts
//
// Encounters + diagnoses. Complaint → differential → primary dx is already
// coherent via COMPLAINT_TEMPLATES.
//
// Changes:
//   - Bug 15: history string is trimmed; conditional fragments no longer
//     leave trailing spaces when skipped.
//   - Bug 14: `monthsBetween` imported from ./helper, no local duplicate.

import { faker } from "@faker-js/faker";
import {
  PAIN_SCALE_TYPES,
  TEMPERATURE_METHODS,
} from "@pedia/shared/constants/enums";

import { db } from "..";
import { diagnoses, encounters } from "../schema";
import type { Patient } from "../schema/types";
import type {
  AppointmentRow,
  DoctorRow,
  EncounterRow,
  NewDiagnosisRow,
  StaffRow,
} from "./helper";
import {
  daysFromNow,
  ids,
  monthsBetween,
  pick,
  randFloat,
  randInt,
} from "./helper";

// ─── Chief complaints paired with likely diagnoses ──────────
type DxTemplate = {
  code: string;
  description: string;
  weight: number;
};

type ComplaintTemplate = {
  complaint: string;
  diagnoses: DxTemplate[];
  vitals: {
    tempC: [number, number];
    systolic: [number, number];
    diastolic: [number, number];
    o2: [number, number];
    pain: [number, number];
  };
};

const COMPLAINT_TEMPLATES: ComplaintTemplate[] = [
  {
    complaint: "Fever for 3 days",
    diagnoses: [
      {
        code: "J06.9",
        description: "Acute upper respiratory infection",
        weight: 3,
      },
      {
        code: "A09",
        description: "Infectious gastroenteritis",
        weight: 2,
      },
      {
        code: "H66.90",
        description: "Otitis media, unspecified",
        weight: 2,
      },
      {
        code: "J02.9",
        description: "Acute pharyngitis, unspecified",
        weight: 2,
      },
      { code: "R50.9", description: "Fever, unspecified", weight: 1 },
    ],
    vitals: {
      tempC: [38.0, 39.8],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [95, 100],
      pain: [2, 6],
    },
  },
  {
    complaint: "Persistent cough and wheezing",
    diagnoses: [
      {
        code: "J45.909",
        description: "Unspecified asthma, uncomplicated",
        weight: 4,
      },
      {
        code: "J06.9",
        description: "Acute upper respiratory infection",
        weight: 2,
      },
      {
        code: "J20.9",
        description: "Acute bronchitis, unspecified",
        weight: 2,
      },
      {
        code: "J21.0",
        description: "Acute bronchiolitis due to RSV",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [36.5, 38.5],
      systolic: [95, 125],
      diastolic: [60, 82],
      o2: [92, 98],
      pain: [0, 3],
    },
  },
  {
    complaint: "Abdominal pain with vomiting",
    diagnoses: [
      {
        code: "K52.9",
        description: "Noninfective gastroenteritis",
        weight: 3,
      },
      {
        code: "A09",
        description: "Infectious gastroenteritis",
        weight: 3,
      },
      {
        code: "R10.9",
        description: "Unspecified abdominal pain",
        weight: 2,
      },
      {
        code: "K59.00",
        description: "Constipation, unspecified",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [36.5, 38.2],
      systolic: [90, 115],
      diastolic: [55, 75],
      o2: [96, 100],
      pain: [3, 8],
    },
  },
  {
    complaint: "Rash on trunk and extremities",
    diagnoses: [
      {
        code: "L20.9",
        description: "Atopic dermatitis, unspecified",
        weight: 3,
      },
      {
        code: "L23.9",
        description: "Allergic contact dermatitis",
        weight: 2,
      },
      {
        code: "B09",
        description: "Unspecified viral infection with rash",
        weight: 2,
      },
      { code: "L50.9", description: "Urticaria, unspecified", weight: 1 },
    ],
    vitals: {
      tempC: [36.3, 37.8],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [97, 100],
      pain: [0, 4],
    },
  },
  {
    complaint: "Ear pain, right side",
    diagnoses: [
      {
        code: "H66.90",
        description: "Otitis media, unspecified",
        weight: 5,
      },
      {
        code: "H61.90",
        description: "Disorder of external ear, unspecified",
        weight: 2,
      },
      {
        code: "J06.9",
        description: "Acute upper respiratory infection",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [36.5, 38.8],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [97, 100],
      pain: [4, 8],
    },
  },
  {
    complaint: "Sore throat and difficulty swallowing",
    diagnoses: [
      {
        code: "J02.9",
        description: "Acute pharyngitis, unspecified",
        weight: 4,
      },
      {
        code: "J03.90",
        description: "Acute tonsillitis, unspecified",
        weight: 3,
      },
      {
        code: "B27.90",
        description: "Infectious mononucleosis, unspecified",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [37.0, 39.2],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [96, 100],
      pain: [3, 7],
    },
  },
  {
    complaint: "Diarrhea and dehydration",
    diagnoses: [
      {
        code: "A09",
        description: "Infectious gastroenteritis",
        weight: 4,
      },
      {
        code: "K52.9",
        description: "Noninfective gastroenteritis",
        weight: 2,
      },
      { code: "E86.0", description: "Dehydration", weight: 2 },
    ],
    vitals: {
      tempC: [36.5, 38.5],
      systolic: [85, 110],
      diastolic: [50, 70],
      o2: [96, 100],
      pain: [1, 5],
    },
  },
  {
    complaint: "Headache with light sensitivity",
    diagnoses: [
      { code: "R51.9", description: "Headache, unspecified", weight: 3 },
      {
        code: "G43.909",
        description: "Migraine, unspecified, not intractable",
        weight: 2,
      },
      {
        code: "G44.209",
        description: "Tension-type headache, unspecified",
        weight: 2,
      },
    ],
    vitals: {
      tempC: [36.3, 37.5],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [97, 100],
      pain: [4, 9],
    },
  },
  {
    complaint: "Shortness of breath on exertion",
    diagnoses: [
      {
        code: "J45.909",
        description: "Unspecified asthma, uncomplicated",
        weight: 3,
      },
      {
        code: "J06.9",
        description: "Acute upper respiratory infection",
        weight: 2,
      },
      { code: "R06.02", description: "Shortness of breath", weight: 2 },
    ],
    vitals: {
      tempC: [36.5, 38.0],
      systolic: [95, 125],
      diastolic: [60, 82],
      o2: [91, 97],
      pain: [0, 4],
    },
  },
  {
    complaint: "Joint pain and swelling",
    diagnoses: [
      {
        code: "M25.50",
        description: "Pain in unspecified joint",
        weight: 3,
      },
      {
        code: "M08.90",
        description: "Juvenile arthritis, unspecified",
        weight: 2,
      },
      {
        code: "M79.10",
        description: "Myalgia, unspecified site",
        weight: 2,
      },
    ],
    vitals: {
      tempC: [36.3, 37.8],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [97, 100],
      pain: [3, 7],
    },
  },
  {
    complaint: "Routine well-child visit",
    diagnoses: [
      {
        code: "Z00.129",
        description: "Routine child health exam",
        weight: 5,
      },
      {
        code: "Z00.121",
        description: "Routine child health exam with abnormal findings",
        weight: 1,
      },
      {
        code: "Z23",
        description: "Encounter for immunization",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [36.2, 37.2],
      systolic: [90, 120],
      diastolic: [55, 80],
      o2: [97, 100],
      pain: [0, 1],
    },
  },
  {
    complaint: "Follow-up for asthma management",
    diagnoses: [
      {
        code: "J45.909",
        description: "Unspecified asthma, uncomplicated",
        weight: 5,
      },
      {
        code: "J45.40",
        description: "Moderate persistent asthma, uncomplicated",
        weight: 2,
      },
      {
        code: "Z79.51",
        description: "Long term use of inhaled steroids",
        weight: 1,
      },
    ],
    vitals: {
      tempC: [36.3, 37.2],
      systolic: [95, 120],
      diastolic: [60, 80],
      o2: [95, 100],
      pain: [0, 2],
    },
  },
];

// ─── Helpers ────────────────────────────────────────────────
function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

function randInRange(range: [number, number], decimals = 0): number {
  return randFloat(range[0], range[1], decimals);
}

function ageAppropriateVitals(ageMonths: number) {
  let weightKg: number;
  let heightCm: number;
  let headCircumferenceCm: number | null;

  if (ageMonths < 1) {
    weightKg = randFloat(2.5, 4.5, 2);
    heightCm = randFloat(45, 55, 1);
    headCircumferenceCm = randFloat(32, 37, 1);
  } else if (ageMonths < 12) {
    weightKg = randFloat(4.5, 10.5, 2);
    heightCm = randFloat(55, 78, 1);
    headCircumferenceCm = randFloat(37, 47, 1);
  } else if (ageMonths < 36) {
    weightKg = randFloat(9.5, 15.5, 2);
    heightCm = randFloat(78, 98, 1);
    headCircumferenceCm = randFloat(45, 50, 1);
  } else if (ageMonths < 72) {
    weightKg = randFloat(14, 22, 2);
    heightCm = randFloat(98, 120, 1);
    headCircumferenceCm = null;
  } else if (ageMonths < 144) {
    weightKg = randFloat(20, 42, 2);
    heightCm = randFloat(120, 155, 1);
    headCircumferenceCm = null;
  } else {
    weightKg = randFloat(40, 70, 2);
    heightCm = randFloat(150, 178, 1);
    headCircumferenceCm = null;
  }

  return { weightKg, heightCm, headCircumferenceCm };
}

// ─── Encounters + Diagnoses ─────────────────────────────────
export async function seedEncounters(args: {
  patients: Patient[];
  doctors: DoctorRow[];
  staffRows: StaffRow[];
  appointments: AppointmentRow[];
}) {
  const {
    patients,
    doctors: doctorRows,
    staffRows,
    appointments: appointmentRows,
  } = args;

  const completedAppointments = appointmentRows.filter(
    (a) => a.status === "Completed"
  );

  const encounterRows: EncounterRow[] = [];
  const diagnosisRows: NewDiagnosisRow[] = [];

  let counter = 1;
  for (const apt of completedAppointments) {
    const patient = patients.find((p) => p.id === apt.patientId);
    const doctor = doctorRows.find((d) => d.id === apt.doctorId);
    if (!patient || !doctor) continue;
    const provider = staffRows.find((s) => s.id === doctor.staffId);
    if (!provider) {
      throw new Error(
        `seedEncounters: no staff row found for doctor ${doctor.id} (staff ${doctor.staffId})`
      );
    }

    const startedAt = apt.startedAt ?? apt.startTime;
    const completedAt =
      apt.completedAt ?? new Date(startedAt.getTime() + 30 * 60_000);

    const ageMonths = monthsBetween(new Date(patient.dateOfBirth), startedAt);
    const { weightKg, heightCm, headCircumferenceCm } = ageAppropriateVitals(
      Math.max(0, ageMonths)
    );
    const bmi = Number((weightKg / (heightCm / 100) ** 2).toFixed(1));

    const template = pick(COMPLAINT_TEMPLATES);

    const diagnosisCount = randInt(1, 3);
    const selected: DxTemplate[] = [];
    const usedCodes = new Set<string>();
    for (let i = 0; i < diagnosisCount; i++) {
      const dx = pickWeighted(template.diagnoses);
      if (usedCodes.has(dx.code)) continue;
      usedCodes.add(dx.code);
      selected.push(dx);
    }
    if (selected.length === 0) {
      selected.push(template.diagnoses[0]!);
    }

    selected.sort((a, b) => b.weight - a.weight);

    const diagnosisSummary =
      selected.length === 1
        ? selected[0]!.description
        : `${selected[0]!.description}; ${selected
            .slice(1)
            .map((d) => d.description)
            .join("; ")}`;

    // FIXED (Bug 15): every fragment is trimmed before concatenation,
    // and the final result is trimmed again. Previously the optional
    // `?? ''` fallbacks could leave a stray space.
    const progressionFragment =
      faker.helpers.maybe(
        () => "Symptoms have been progressive over the past few days.",
        { probability: 0.6 }
      ) ?? "No significant change since onset.";

    const contactFragment =
      faker.helpers.maybe(() => "No known sick contacts at home.", {
        probability: 0.4,
      }) ?? "";

    const history = [
      `Patient presents with ${template.complaint.toLowerCase()}.`,
      progressionFragment,
      contactFragment,
    ]
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .join(" ");

    const generalAppearance = pick([
      "Well-appearing",
      "Mildly ill-appearing",
      "Alert and interactive",
    ]);
    const systemFragment = pick([
      "HEENT: TMs clear bilaterally, oropharynx erythematous.",
      "Chest: Clear to auscultation bilaterally, no wheezing.",
      "Abdomen: Soft, non-tender, non-distended.",
      "Skin: No rash, no petechiae.",
    ]);

    const examinationNotes =
      `General: ${generalAppearance}. ${systemFragment}`.trim();

    const treatmentPlan = pick([
      "Supportive care with fluids and rest. Return if symptoms worsen.",
      "Symptomatic treatment. Follow up in 3–5 days if no improvement.",
      "Continue current medications. Monitor for red-flag symptoms.",
      "Antibiotics as prescribed. Complete full course.",
      "Inhaler technique reviewed. Asthma action plan updated.",
    ]);

    const [encounter] = await db
      .insert(encounters)
      .values({
        encounterNumber: ids.encounterNumber(counter),
        patientId: patient.id,
        appointmentId: apt.id,
        providerId: provider.id,
        providerName: provider.name,
        doctorId: doctor.id,
        encounterDate: startedAt,
        visitType: apt.type,
        status: "Completed",
        chiefComplaint: template.complaint,
        subjectiveJson: {
          historyOfPresentIllness: history,
        },
        objectiveJson: {
          generalAppearance,
          physicalExamination: {
            systems: systemFragment,
          },
          physicalExam: {
            temperatureC: randInRange(template.vitals.tempC, 1),
            temperatureMethod: pick(TEMPERATURE_METHODS),
            systolicBp: randInRange(template.vitals.systolic),
            diastolicBp: randInRange(template.vitals.diastolic),
            oxygenSaturationPercent: randInRange(template.vitals.o2),
            painScore: randInRange(template.vitals.pain),
            painScaleType: pick(PAIN_SCALE_TYPES),
            weightKg,
            heightCm,
            headCircumferenceCm,
            bmi,
          },
          notes: examinationNotes,
        },
        assessmentJson: {
          clinicalImpression: diagnosisSummary,
          primaryDiagnosis: selected[0]!.description,
          primaryIcd10: selected[0]!.code,
          diagnoses: selected.map((diagnosis, index) => ({
            icdCode: diagnosis.code,
            name: diagnosis.description,
            primary: index === 0,
          })),
        },
        planJson: {
          treatmentAndInterventions: treatmentPlan,
          followUpDate:
            faker.helpers
              .maybe(() => daysFromNow(randInt(3, 30)), {
                probability: 0.5,
              })
              ?.toISOString()
              .slice(0, 10) ?? null,
        },
        notes:
          faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.4,
          }) ?? null,
        durationMinutes: Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 60_000
        ),
      })
      .returning();

    if (!encounter) continue;
    encounterRows.push(encounter);

    selected.forEach((dx, idx) => {
      diagnosisRows.push({
        encounterId: encounter.id,
        patientId: patient.id,
        code: dx.code,
        description: dx.description,
        isPrimary: idx === 0,
      });
    });

    counter++;
  }

  if (diagnosisRows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < diagnosisRows.length; i += chunkSize) {
      await db.insert(diagnoses).values(diagnosisRows.slice(i, i + chunkSize));
    }
  }

  return { encounters: encounterRows, diagnosisCount: diagnosisRows.length };
}
