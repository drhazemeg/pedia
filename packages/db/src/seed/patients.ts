// scripts/src/seed/patients.ts
//
// No changes required. Pure inserts; `patientDocuments.uploadedBy` is
// already `p.userId` (a user.id), which matches the corrected schema.
// Reproduced for completeness.

import { faker } from "@faker-js/faker";
import {
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
  BLOOD_GROUPS,
  CONDITION_SEVERITIES,
  CONDITION_STATUSES,
  DELIVERY_METHODS,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  MEDICAL_RECORD_TYPES,
  PREFERRED_LANGUAGES,
} from "@pedia/shared/constants/enums";

import {
  guardians,
  patientAllergies,
  patientChronicConditions,
  patientDocuments,
  patients,
  user,
} from "../schema";
import type { ClinicRow, PatientRow } from "./helper";
import {
  ids,
  pick,
  pickN,
  randFloat,
  randInt,
  seedDb,
  seedLogger,
} from "./helper";

// const LANGUAGES = ['English', 'Arabic', 'French', 'Spanish', 'Other'] as const

const COMMON_ALLERGENS = [
  "Peanuts",
  "Penicillin",
  "Eggs",
  "Milk",
  "Shellfish",
  "Soy",
  "Wheat",
  "Latex",
  "Pollen",
  "Dust mites",
  "Amoxicillin",
  "Sulfa drugs",
  "Ibuprofen",
];

const COMMON_CONDITIONS = [
  { name: "Asthma", icd: "J45" },
  { name: "Type 1 Diabetes", icd: "E10" },
  { name: "Epilepsy", icd: "G40" },
  { name: "Celiac Disease", icd: "K90" },
  { name: "ADHD", icd: "F90" },
  { name: "Autism Spectrum Disorder", icd: "F84" },
  { name: "Congenital Heart Defect", icd: "Q24" },
  { name: "Sickle Cell Anemia", icd: "D57" },
  { name: "Eczema", icd: "L20" },
  { name: "Chronic Kidney Disease", icd: "N18" },
];

// ─── Patients + Guardians ───────────────────────────────────
export async function seedPatients(args: {
  clinics: ClinicRow[];
  pediatricianIds: string[];
}) {
  const { clinics, pediatricianIds } = args;
  const logger = seedLogger("seed_patients");

  if (clinics.length === 0) {
    throw new Error("seedPatients requires at least one clinic");
  }

  const mainClinic = clinics[0]!;

  // Parent user accounts
  const parentUsers = await seedDb
    .insert(user)
    .values(
      Array.from({ length: 60 }, () => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const now = new Date();
        return {
          id: faker.string.uuid(),
          name: `${firstName} ${lastName}`,
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          emailVerified: true,
          role: "patient" as const,
          createdAt: now,
          updatedAt: now,
        };
      })
    )
    .returning();

  // Patient rows (one per parent user)
  const patientRows = await seedDb
    .insert(patients)
    .values(
      parentUsers.map((u, i) => {
        const gender = pick(GENDERS);
        const dob = faker.date.birthdate({
          min: 0,
          max: 17,
          mode: "age",
        });

        return {
          mrn: ids.mrn(i + 1),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          dateOfBirth: dob.toISOString().slice(0, 10),
          gender,
          bloodGroup: pick(BLOOD_GROUPS),
          contactNumber: faker.phone.number({ style: "national" }),
          email: faker.internet.email().toLowerCase(),
          birthWeightKg: randFloat(2.4, 4.2, 2),
          birthLengthCm: randFloat(45, 55, 1),
          birthHeadCircumferenceCm: randFloat(32, 38, 1),
          deliveryMethod: pick(DELIVERY_METHODS),
          preferredLanguage: pick(PREFERRED_LANGUAGES),
          activeStatus: "Active" as const,
          notes:
            faker.helpers.maybe(() => faker.lorem.paragraph(), {
              probability: 0.3,
            }) ?? null,
          userId: u.id,
          pediatricianId:
            pediatricianIds.length > 0 ? pick(pediatricianIds) : null,
          clinicId: mainClinic.id,
        };
      })
    )
    .returning();

  // Guardians (1–2 per patient)
  const guardianRows: Array<typeof guardians.$inferInsert> = [];
  for (const p of patientRows) {
    const count = randInt(1, 2);
    for (let i = 0; i < count; i++) {
      guardianRows.push({
        patientId: p.id,
        name: faker.person.fullName(),
        relationship: i === 0 ? "Father" : pick(GUARDIAN_RELATIONSHIPS),
        phone: faker.phone.number({ style: "national" }),
        email: faker.internet.email().toLowerCase(),
        address: faker.location.streetAddress(),
        userId: p.userId,
        isPrimary: i === 0,
        emergencyContact: true,
        contactOrder: i + 1,
        notes: null,
      });
    }
  }

  if (guardianRows.length > 0) {
    await seedDb.insert(guardians).values(guardianRows);
  }

  logger.set({
    event: "seed_patients_ok",
    counts: {
      patients: patientRows.length,
      parentUsers: parentUsers.length,
      guardians: guardianRows.length,
    },
  });
  logger.emit();

  return { patients: patientRows, patientUsers: parentUsers };
}

// ─── Patient clinical sub-records ───────────────────────────
export async function seedPatientClinical(args: { patients: PatientRow[] }) {
  const { patients: patientRows } = args;

  // Allergies
  const allergyRows: Array<typeof patientAllergies.$inferInsert> = [];
  for (const p of patientRows) {
    const count = randInt(0, 3);
    const allergens = pickN(COMMON_ALLERGENS, count);
    for (const allergen of allergens) {
      allergyRows.push({
        patientId: p.id,
        allergen,
        category: pick(ALLERGY_CATEGORIES),
        severity: pick(ALLERGY_SEVERITIES),
        status: pick(ALLERGY_STATUSES),
        reaction: faker.lorem.sentence(),
        identifiedDate: faker.date
          .past({ years: 5 })
          .toISOString()
          .slice(0, 10),
        onsetDate: faker.date.past({ years: 5 }).toISOString().slice(0, 10),
        resolutionDate: null,
        notes: null,
      });
    }
  }
  if (allergyRows.length > 0) {
    await seedDb.insert(patientAllergies).values(allergyRows);
  }

  // Chronic conditions
  const conditionRows: Array<typeof patientChronicConditions.$inferInsert> = [];
  for (const p of patientRows) {
    const count = randInt(0, 2);
    const conditions = pickN(COMMON_CONDITIONS, count);
    for (const c of conditions) {
      conditionRows.push({
        patientId: p.id,
        condition: c.name,
        icdCode: c.icd,
        diagnosedDate: faker.date.past({ years: 5 }).toISOString().slice(0, 10),
        status: pick(CONDITION_STATUSES),
        severity: pick(CONDITION_SEVERITIES),
        notes:
          faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.4,
          }) ?? null,
      });
    }
  }
  if (conditionRows.length > 0) {
    await seedDb.insert(patientChronicConditions).values(conditionRows);
  }

  // Documents
  const docRows: Array<typeof patientDocuments.$inferInsert> = [];
  for (const p of patientRows) {
    const count = randInt(0, 2);
    for (let i = 0; i < count; i++) {
      if (!p.userId) {
        throw new Error(
          `seedPatientClinical: patient ${p.id} has no linked user to upload documents`
        );
      }
      docRows.push({
        patientId: p.id,
        documentType: pick(MEDICAL_RECORD_TYPES),
        title: faker.lorem.words(3),
        storageKey: `patient-docs/${p.id}/${faker.string.uuid()}.pdf`,
        mimeType: "application/pdf",
        fileName: `patient-${p.id}.pdf`,
        fileUrl: faker.internet.url(),
        sizeBytes: randInt(50_000, 5_000_000),
        uploadedById: p.userId,
      });
    }
  }
  if (docRows.length > 0) {
    await seedDb.insert(patientDocuments).values(docRows);
  }

  return {
    allergies: allergyRows.length,
    conditions: conditionRows.length,
    documents: docRows.length,
  };
}
