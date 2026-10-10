// scripts/src/seed/inpatient.ts
//
// No changes required. Pure inserts; clinicalNotes.admissionId already
// points at a real admission.id, which now has an FK (File 2).

import { faker } from "@faker-js/faker";

import {
  admissions,
  bedAllocations,
  beds,
  clinicalNotes,
  rooms,
  wards,
} from "../schema";
import type { BedRow, ClinicRow, DoctorRow, PatientRow } from "./helper";
import {
  daysAgo,
  daysFromNow,
  ids,
  pick,
  randFloat,
  randInt,
  rng,
  seedDb,
} from "./helper";

const WARD_DEFS = [
  { name: "Pediatric General Ward A", type: "general" as const },
  { name: "Pediatric General Ward B", type: "pediatric" as const },
  { name: "Neonatal Intensive Care (NICU)", type: "neonatal" as const },
  { name: "Pediatric Intensive Care (PICU)", type: "surgical" as const },
  { name: "Pediatric Isolation Unit", type: "isolation" as const },
];

const ROOM_TYPES = ["private", "semi_private", "ward", "icu"] as const;

export async function seedWards(args: { clinics: ClinicRow[] }) {
  const { clinics } = args;
  const wardRows = await seedDb
    .insert(wards)
    .values(
      WARD_DEFS.map((w, i) => {
        return {
          code: ids.wardCode(i + 1),
          name: w.name,
          clinicId: clinics[i % clinics.length]!.id,
          type: w.type,
          isActive: true,
        };
      })
    )
    .returning();

  const roomRows: Array<typeof rooms.$inferInsert> = [];
  for (const ward of wardRows) {
    const roomCount =
      ward.type === "neonatal" ? 8 : ward.type === "icu" ? 6 : 10;
    for (let r = 1; r <= roomCount; r++) {
      let roomType: (typeof ROOM_TYPES)[number];
      if (ward.type === "isolation") {
        roomType = "private";
      } else if (ward.type === "neonatal" || ward.type === "icu") {
        roomType = "icu";
      } else {
        roomType = pick(ROOM_TYPES);
      }

      roomRows.push({
        wardId: ward.id,
        roomNumber: `${ward.code}-R${String(r).padStart(2, "0")}`,
        roomType,
        dailyRate: randFloat(150, 1200, 2).toFixed(2),
        isActive: true,
      });
    }
  }

  const insertedRooms = await seedDb.insert(rooms).values(roomRows).returning();

  const bedRows: Array<typeof beds.$inferInsert> = [];
  for (const room of insertedRooms) {
    const bedCount =
      room.roomType === "ward" ? 4 : room.roomType === "semi_private" ? 2 : 1;
    for (let b = 1; b <= bedCount; b++) {
      bedRows.push({
        roomId: room.id,
        bedNumber: `${room.roomNumber}-B${b}`,
        status: "available",
        isActive: true,
      });
    }
  }

  const insertedBeds = await seedDb.insert(beds).values(bedRows).returning();

  return { wards: wardRows, rooms: insertedRooms, beds: insertedBeds };
}

const ADMISSION_REASONS = [
  "Acute bronchiolitis requiring oxygen",
  "Dehydration secondary to gastroenteritis",
  "Severe asthma exacerbation",
  "Febrile neutropenia",
  "Neonatal jaundice requiring phototherapy",
  "Sepsis rule-out",
  "Post-operative observation",
  "Status epilepticus",
  "Diabetic ketoacidosis",
  "Pneumonia with respiratory distress",
];

const CLINICAL_NOTE_TYPES = [
  "progress",
  "physician",
  "discharge",
  "consultation",
  "nursing",
] as const;

export async function seedAdmissions(args: {
  patients: PatientRow[];
  doctors: DoctorRow[];
  beds: BedRow[];
  createdById: string;
}) {
  const {
    patients,
    doctors: doctorRows,
    beds: bedRowsInput,
    createdById,
  } = args;

  if (patients.length === 0) {
    throw new Error("seedAdmissions requires at least one patient");
  }
  if (doctorRows.length === 0) {
    throw new Error("seedAdmissions requires at least one doctor");
  }

  const availableBeds = [...bedRowsInput];

  const admissionRows: Array<typeof admissions.$inferInsert> = [];
  const allocationRows: Array<typeof bedAllocations.$inferInsert> = [];
  const noteRows: Array<typeof clinicalNotes.$inferInsert> = [];

  const admissionCount = 25;
  const usedPatients = new Set<string>();

  for (let i = 1; i <= admissionCount; i++) {
    let patient: PatientRow;
    do {
      patient = pick(patients);
    } while (
      usedPatients.has(patient.id) &&
      usedPatients.size < patients.length
    );
    usedPatients.add(patient.id);

    const doctor = pick(doctorRows);
    const bed = availableBeds.pop();
    if (!bed) break;

    const currentlyAdmitted = rng() < 0.6;
    const admittedAt = currentlyAdmitted
      ? daysAgo(randInt(1, 20))
      : daysAgo(randInt(20, 120));

    const dischargedAt = currentlyAdmitted
      ? null
      : new Date(admittedAt.getTime() + randInt(2, 14) * 86_400_000);

    const [admission] = await seedDb
      .insert(admissions)
      .values({
        admissionNumber: ids.admissionNumber(i),
        patientId: patient.id,
        attendingStaffId: doctor.staffId,
        attendingDoctorId: doctor.id,
        status: currentlyAdmitted ? "Admitted" : "Discharged",
        admissionReason: pick(ADMISSION_REASONS),
        admittedAt,
        expectedDischargeAt: currentlyAdmitted
          ? daysFromNow(randInt(1, 10))
          : null,
        dischargedAt,
        dischargeSummary: dischargedAt
          ? `Patient discharged in stable condition after ${randInt(2, 14)} day stay. Parental education provided on home care and follow-up schedule.`
          : null,
        createdById,
      })
      .returning();

    if (!admission) continue;
    admissionRows.push(admission);

    allocationRows.push({
      admissionId: admission.id,
      bedId: bed.id,
      startedAt: admittedAt,
      endedAt: dischargedAt,
      allocatedById: createdById,
      endedById: dischargedAt ? createdById : null,
      transferReason: null,
    });

    const noteCount = randInt(2, 6);
    for (let n = 0; n < noteCount; n++) {
      const noteTime = new Date(
        admittedAt.getTime() + n * randInt(6, 24) * 3_600_000
      );
      if (dischargedAt && noteTime > dischargedAt) break;

      noteRows.push({
        admissionId: admission.id,
        authorUserId: createdById,
        noteType: pick(CLINICAL_NOTE_TYPES),
        noteText: faker.lorem.sentences(randInt(2, 5)),
      });
    }
  }

  if (allocationRows.length > 0) {
    await seedDb.insert(bedAllocations).values(allocationRows);
  }
  if (noteRows.length > 0) {
    await seedDb.insert(clinicalNotes).values(noteRows);
  }

  return {
    admissionCount: admissionRows.length,
    allocationCount: allocationRows.length,
    noteCount: noteRows.length,
  };
}
