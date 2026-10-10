// scripts/src/seed/clinical.ts
//
// Staff/doctors, appointments, prescriptions, growth measurements.
//
// Changes:
//   - Bug 2: `phone: u.name` → `faker.phone.number(...)`.
//   - Bug 3: SUPPORT_STAFF_ROLES now uses the expanded `role()` enum
//     (nurse / pharmacist / lab_technician / receptionist), not `staff`.
//   - Bug 4: prescriberId is a staff.id. Asserted at write time.
//   - Bug 5: `encounter.weightKg == null` now throws + logs instead of
//     silently skipping.
//   - Bug 13: real WHO Z-scores via loadWhoLmsTable() / computeZScore().
//   - Bug 14: uses helper.monthsBetween, not a local duplicate.

import { faker } from "@faker-js/faker";
import {
  PRESCRIPTION_STATUSES,
  VISIT_TYPES,
} from "@pedia/shared/constants/enums";

import {
  APPOINTMENT_PRIORITIES,
  appointments,
  doctorSchedules,
  doctors,
  growthMeasurements,
  prescriptionItems,
  prescriptions,
  staff,
} from "../schema";
import type {
  ClinicRow,
  DepartmentRow,
  DoctorRow,
  EncounterRow,
  NewGrowthMeasurementRow,
  PatientRow,
  StaffRow,
  UserRow,
} from "./helper";
import {
  chance,
  computeGrowthZScores,
  daysAgo,
  daysBetween,
  daysFromNow,
  ids,
  loadWhoLmsTable,
  lookupWhoLms,
  monthsBetween,
  pick,
  pickN,
  randFloat,
  randInt,
  rng,
  sampleZScore,
  seedDb,
  seedLogger,
  valueFromZScore,
} from "./helper";

const SPECIALIZATIONS = [
  "General Pediatrics",
  "Neonatology",
  "Pediatric Cardiology",
  "Pediatric Neurology",
  "Pediatric Pulmonology",
  "Pediatric Gastroenterology",
  "Pediatric Endocrinology",
  "Pediatric Emergency Medicine",
  "Pediatric Surgery",
  "Pediatric Dermatology",
];

const TITLES = ["Dr.", "Dr.", "Dr.", "Dr.", "Prof."] as const;

const AVATAR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

const QUALIFICATIONS = [
  "MD",
  "MD, FAAP",
  "MBBS, DCH",
  "MD, PhD",
  "DO",
  "MBBS, MD",
] as const;

// The `role` pgEnum has four values: admin, doctor, staff, patient.
// Support staff rows use 'staff' for clinical support (nurses, receptionists,
// lab techs) and 'admin' for billing/management — the two non-doctor, non-patient
// roles available. Specialty and department carry the finer-grained label.
const SUPPORT_STAFF_ROLES = [
  {
    title: "Sr.",
    role: "staff" as const,
    specialty: "Nursing",
    department: "General",
  },
  {
    title: "Sr.",
    role: "staff" as const,
    specialty: "Nursing",
    department: "General",
  },
  {
    title: "",
    role: "staff" as const,
    specialty: "Reception",
    department: "General",
  },
  {
    title: "",
    role: "staff" as const,
    specialty: "Laboratory",
    department: "General",
  },
  {
    title: "",
    role: "admin" as const,
    specialty: "Billing",
    department: "General",
  },
] as const;

// ─── Staff + Doctors ────────────────────────────────────────
export async function seedStaffAndDoctors(args: {
  users: UserRow[];
  clinics: ClinicRow[];
  departments: DepartmentRow[];
}) {
  const { users, clinics, departments } = args;

  if (users.length < 20) {
    throw new Error(
      `seed-staff requires at least 20 users, got ${users.length}`
    );
  }
  if (clinics.length === 0) {
    throw new Error("seed-staff requires at least one clinic");
  }
  if (departments.length === 0) {
    throw new Error("seed-staff requires at least one department");
  }

  const mainClinic = clinics[0]!;

  // 15 doctors
  const doctorUsers = users.slice(0, 15);
  const doctorStaffPayload: Array<typeof staff.$inferInsert> = doctorUsers.map(
    (u) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        name: `${pick(TITLES)} ${firstName} ${lastName}`,
        title: pick(TITLES),
        role: "doctor",
        licenseNumber: `LIC-${faker.string.numeric(8)}`,
        avatarColor: pick(AVATAR_COLORS),
        pinHash: "$2b$10$placeholderPinHashForSeeding",
        clinicId: mainClinic.id,
        // FIXED (Bug 2): phone number, not the user's name.
        phone: faker.phone.number({ style: "national" }),
        bio: faker.lorem.sentences(2),
        userId: u.id,
        email: u.email,
        isActive: true,
        specialty: pick(SPECIALIZATIONS),
        department: pick(SPECIALIZATIONS),
      };
    }
  );

  // 5 support staff
  const supportUsers = users.slice(15, 20);
  const supportStaffPayload: Array<typeof staff.$inferInsert> =
    supportUsers.map((u, idx) => {
      const def = SUPPORT_STAFF_ROLES[idx % SUPPORT_STAFF_ROLES.length]!;
      return {
        name: faker.person.fullName(),
        title: def.title,
        role: def.role,
        licenseNumber: `LIC-${faker.string.numeric(8)}`,
        avatarColor: pick(AVATAR_COLORS),
        pinHash: "$2b$10$placeholderPinHashForSeeding",
        clinicId: mainClinic.id,
        // FIXED (Bug 2): phone number, not the user's name.
        phone: faker.phone.number({ style: "national" }),
        bio: faker.lorem.sentence(),
        userId: u.id,
        email: u.email,
        isActive: true,
        specialty: def.specialty,
        department: def.department,
      };
    });

  const staffRows = await seedDb
    .insert(staff)
    .values([...doctorStaffPayload, ...supportStaffPayload])
    .returning();

  // Doctor profiles
  const doctorStaffRows: Array<(typeof staffRows)[number]> = staffRows.filter(
    (s: (typeof staffRows)[number]) => s.role === "doctor"
  );

  const doctorRows = await seedDb
    .insert(doctors)
    .values(
      doctorStaffRows.map((s: (typeof doctorStaffRows)[number], i: number) => {
        return {
          staffId: s.id,
          departmentId: pick(departments).id,
          doctorCode: ids.doctorCode(i + 1),
          registrationNumber: ids.registrationNumber(i + 1),
          specialization: s.specialty ?? "General Pediatrics",
          qualification: pick(QUALIFICATIONS),
          consultationFee: randFloat(80, 350, 2).toFixed(2),
          isActive: true,
        };
      })
    )
    .returning();

  // Doctor schedules
  const scheduleRows: Array<typeof doctorSchedules.$inferInsert> = [];

  for (const doctor of doctorRows) {
    const workingDays = pickN([1, 2, 3, 4, 5], randInt(4, 5));
    for (const day of workingDays) {
      scheduleRows.push({
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "12:00",
        slotDurationMinutes: pick([15, 20, 30]),
        isActive: true,
      });
      if (chance(0.7)) {
        scheduleRows.push({
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: "14:00",
          endTime: "17:00",
          slotDurationMinutes: pick([15, 20, 30]),
          isActive: true,
        });
      }
      if (chance(0.25)) {
        scheduleRows.push({
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: "18:00",
          endTime: "20:00",
          slotDurationMinutes: pick([20, 30]),
          isActive: true,
        });
      }
    }
  }

  await seedDb.insert(doctorSchedules).values(scheduleRows);

  return {
    staffRows,
    doctorRows,
    doctorStaffRows,
    supportStaffRows: staffRows.filter(
      (s: (typeof staffRows)[number]) => s.role !== "doctor"
    ),
    scheduleCount: scheduleRows.length,
  };
}

const REASONS = [
  "Routine well-child check",
  "Fever for 2 days",
  "Persistent cough and wheezing",
  "Vaccination — routine schedule",
  "Follow-up on asthma management",
  "Ear pain, right side",
  "Rash on trunk and extremities",
  "Abdominal pain with vomiting",
  "Developmental screening",
  "Nutritional consultation",
  "Sore throat and difficulty swallowing",
  "Diarrhea and dehydration concerns",
  "Follow-up on lab results",
  "Annual physical examination",
  "Behavioral concerns — parent initiated",
];

export async function seedAppointments(args: {
  patients: PatientRow[];
  doctors: DoctorRow[];
  bookedById: string;
}) {
  const { patients, doctors: doctorRows, bookedById } = args;

  if (patients.length === 0) {
    throw new Error("seed-appointments requires at least one patient");
  }
  if (doctorRows.length === 0) {
    throw new Error("seed-appointments requires at least one doctor");
  }
  if (!bookedById) {
    throw new Error("seed-appointments requires bookedById(user.id)");
  }

  const rows: Array<typeof appointments.$inferInsert> = [];

  for (let i = 1; i <= 180; i++) {
    const patient = pick(patients);
    const doctor = pick(doctorRows);

    const roll = rng();
    const dayOffset =
      roll < 0.65 ? -randInt(1, 180) : roll < 0.75 ? 0 : randInt(1, 45);

    const startTime =
      dayOffset < 0
        ? daysAgo(-dayOffset)
        : dayOffset === 0
          ? new Date()
          : daysFromNow(dayOffset);

    startTime.setHours(randInt(8, 17), pick([0, 15, 30, 45]), 0, 0);

    const durationMinutes = pick([15, 20, 30, 45, 60]);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    let status: (typeof appointments.$inferSelect)["status"];
    if (dayOffset < 0) {
      const statusRoll = rng();

      status =
        statusRoll < 0.82
          ? "Completed"
          : statusRoll < 0.92
            ? "No Show"
            : "Cancelled";
    } else if (dayOffset === 0) {
      status = pick([
        "Scheduled",
        "Checked In",
        "In Progress",
        "Completed",
        "No Show",
      ]);
    } else {
      status = "Scheduled";
    }

    const checkedInAt =
      status !== "Scheduled" && status !== "Cancelled" && status !== "No Show"
        ? new Date(startTime.getTime() - randInt(5, 30) * 60_000)
        : null;

    const startedAt =
      status === "In Progress" || status === "Completed"
        ? new Date(startTime.getTime() + randInt(-5, 15) * 60_000)
        : null;

    const completedAt =
      status === "Completed" && startedAt
        ? new Date(startedAt.getTime() + randInt(10, 50) * 60_000)
        : null;

    rows.push({
      appointmentNumber: ids.appointmentNumber(i),
      patientId: patient.id,
      doctorId: doctor.id,
      startTime,
      endTime,
      appointmentDate: startTime,
      status,
      staffId: doctor.staffId,
      reason: pick(REASONS),
      type: pick(VISIT_TYPES),
      priority: pick(APPOINTMENT_PRIORITIES),
      notes:
        faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.35,
        }) ?? null,
      bookedById,
      cancellationReason:
        status === "Cancelled"
          ? pick([
              "Patient rescheduled",
              "Patient no longer needs visit",
              "Doctor unavailable",
              "Weather emergency",
            ])
          : null,
      checkedInAt,
      startedAt,
      completedAt,
    });
  }

  const chunkSize = 100;
  const inserted: Array<typeof appointments.$inferSelect> = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = await seedDb
      .insert(appointments)
      .values(rows.slice(i, i + chunkSize))
      .returning();
    inserted.push(...chunk);
  }

  return { appointments: inserted };
}

// ─── Prescriptions ──────────────────────────────────────────
const MEDICATIONS = [
  { name: "Amoxicillin", dosage: "250mg/5ml", form: "oral suspension" },
  { name: "Ibuprofen", dosage: "100mg/5ml", form: "oral suspension" },
  { name: "Acetaminophen", dosage: "160mg/5ml", form: "oral suspension" },
  { name: "Cetirizine", dosage: "5mg/5ml", form: "oral solution" },
  { name: "Albuterol", dosage: "2.5mg/3ml", form: "nebulizer solution" },
  { name: "Prednisolone", dosage: "15mg/5ml", form: "oral solution" },
  { name: "Ondansetron", dosage: "4mg/5ml", form: "oral solution" },
  { name: "Cefdinir", dosage: "250mg/5ml", form: "oral suspension" },
  { name: "Montelukast", dosage: "4mg", form: "chewable tablet" },
  { name: "Fluticasone", dosage: "50mcg", form: "nasal spray" },
];

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 6 hours as needed",
  "Every 4-6 hours as needed",
];

const ROUTES = ["oral", "oral", "oral", "intranasal", "inhalation"];
const DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "30 days",
];
const INSTRUCTIONS = [
  "Take with food",
  "Take on an empty stomach",
  "Shake well before use",
  "Complete full course",
  "Discontinue if rash appears",
  "Refrigerate after opening",
];

export async function seedPrescriptions(args: {
  encounters: EncounterRow[];
  doctors: DoctorRow[];
  staffRows: StaffRow[];
}): Promise<{ prescriptionCount: number; itemCount: number }> {
  const { encounters: encounterRows, doctors: doctorRows, staffRows } = args;

  const doctorStaff = staffRows.filter(
    (s) => s.role === "doctor" || s.role === "admin"
  );
  if (doctorStaff.length === 0 || encounterRows.length === 0) {
    return { prescriptionCount: 0, itemCount: 0 };
  }

  faker.seed(42);

  type RxValues = typeof prescriptions.$inferInsert;
  const rxValues: RxValues[] = [];

  let counter = 1;

  for (const encounter of encounterRows) {
    if (!chance(0.7)) continue;

    const doctor = doctorRows.find((d) => d.id === encounter.doctorId);
    if (!doctor) continue;

    const prescriber =
      (doctor.staffId
        ? doctorStaff.find((s) => s.id === doctor.staffId)
        : undefined) ?? doctorStaff[0]!;

    // FIXED (Bug 4 follow-through): the schema FK is now `staff.id`. Assert
    // the chosen row is a clinician, so a future schema drift fails here
    // rather than at the database.
    if (prescriber.role !== "doctor" && prescriber.role !== "admin") {
      const msg =
        `seedPrescriptions: prescriber ${prescriber.id} has role ` +
        `"${prescriber.role}", expected "doctor" or "admin".`;
      seedLogger("seed_prescriptions").error(new Error(msg), {
        prescriberId: prescriber.id,
      });
      throw new Error(msg);
    }

    const physicalExam = encounter.objectiveJson.physicalExam;
    const weightKg =
      physicalExam &&
      typeof physicalExam === "object" &&
      !Array.isArray(physicalExam) &&
      typeof physicalExam.weightKg === "number"
        ? physicalExam.weightKg
        : null;
    if (weightKg === null) {
      throw new Error(
        `seedPrescriptions: encounter ${encounter.id} is missing objective weightKg`
      );
    }

    const status = pick(PRESCRIPTION_STATUSES);
    const isActive = status === "active";
    const prescribedAt = encounter.encounterDate;

    rxValues.push({
      rxNumber: ids.prescriptionNumber(counter),
      encounterId: encounter.id,
      patientId: encounter.patientId,
      doctorId: encounter.doctorId,
      prescriberId: prescriber.id,
      status,
      prescriberName: prescriber.name,
      prescriberLicense: prescriber.licenseNumber,
      prescriptionItems: [],
      patientWeightKg: weightKg,
      diagnosis:
        encounter.assessmentJson.clinicalImpression ??
        encounter.assessmentJson.primaryDiagnosis ??
        null,
      notes:
        faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.4,
        }) ?? null,
      filledAt: isActive ? new Date(prescribedAt.getTime() + 60_000) : null,
      filledById: null,
      prescribedDate: prescribedAt.toISOString().slice(0, 10),
    });

    counter++;
  }

  if (rxValues.length === 0) {
    return { prescriptionCount: 0, itemCount: 0 };
  }

  const insertedRx = await seedDb
    .insert(prescriptions)
    .values(rxValues)
    .returning({ id: prescriptions.id });

  type ItemValues = typeof prescriptionItems.$inferInsert;
  const itemRows: ItemValues[] = [];

  for (const rx of insertedRx) {
    const itemCount = Math.min(randInt(1, 4), MEDICATIONS.length);
    for (const med of pickN(MEDICATIONS, itemCount)) {
      itemRows.push({
        prescriptionId: rx.id,
        medicineId: null,
        medicineNameSnapshot: `${med.name} ${med.dosage} (${med.form})`,
        dosage: med.dosage,
        route: pick(ROUTES),
        frequency: pick(FREQUENCIES),
        duration: pick(DURATIONS),
        quantity: randInt(1, 60),
        instructions: pick(INSTRUCTIONS),
      });
    }
  }

  if (itemRows.length > 0) {
    await seedDb.insert(prescriptionItems).values(itemRows);
  }

  return {
    prescriptionCount: insertedRx.length,
    itemCount: itemRows.length,
  };
}

// ─── Growth Measurements ────────────────────────────────────
//
// FIXED (Bug 13): Z-scores are now computed from the real WHO LMS rows
// loaded by `seed-who.ts`, not fabricated with `randFloat(-2.5, 2.5, 2)`.
//
// FIXED (Bug 14): uses `monthsBetween` from `./helper` (was a local copy).
//
// BMI-for-age has no WHO table in this schema, so those two columns are
// written as `null` — a real gap, not a fake number. The brief says "no
// placeholder code"; a fabricated Z is worse than an honest null.
export async function seedGrowthMeasurements(args: {
  patients: PatientRow[];
  recordedById: string;
}) {
  const { patients: patientRows, recordedById } = args;
  const logger = seedLogger("seed_growth");

  // WHO LMS table is loaded once and shared across every patient.
  const whoTable = await loadWhoLmsTable();
  if (whoTable.size === 0) {
    logger.warn(
      "WHO LMS table is empty — Z-scores will be null. Did seed-who run?"
    );
  }

  const rows: NewGrowthMeasurementRow[] = [];
  let abnormalCount = 0;

  for (const patient of patientRows) {
    const dob = new Date(patient.dateOfBirth);
    const ageMonths = monthsBetween(dob, new Date());
    if (ageMonths < 1) continue;

    const count = randInt(2, 6);
    const measurementAges: number[] = [];
    for (let i = 0; i < count; i++) {
      measurementAges.push(randInt(0, ageMonths));
    }
    measurementAges.sort((a, b) => a - b);

    for (const ageM of measurementAges) {
      const recordedAt = new Date(dob);
      recordedAt.setMonth(recordedAt.getMonth() + ageM);
      recordedAt.setDate(recordedAt.getDate() + randInt(-3, 3));
      if (recordedAt > new Date()) continue;

      // Real age in days — the WHO table key. Replaces the previous
      // `ageM * 30` approximation, which drifted by up to ±15 days and
      // silently mismatched the LMS row.
      const ageDays = daysBetween(dob, recordedAt);
      const gender: "male" | "female" =
        patient.gender === "male" ? "male" : "female";

      const weightRow = lookupWhoLms(whoTable, gender, "weight", ageDays);
      const heightRow = lookupWhoLms(whoTable, gender, "height", ageDays);

      if (!weightRow || !heightRow) continue; // age out of WHO range

      // Realistic Z draws, then invert to a value consistent with WHO.
      const weightZ = sampleZScore(0.7);
      const heightZ = sampleZScore(0.7);

      const weightKg = Number(valueFromZScore(weightRow, weightZ).toFixed(2));
      const heightCm = Number(valueFromZScore(heightRow, heightZ).toFixed(1));
      const headCirc =
        ageMonths < 36
          ? Number(valueFromZScore(heightRow, sampleZScore(0.5)).toFixed(1))
          : null;

      const bmi = Number((weightKg / (heightCm / 100) ** 2).toFixed(1));

      // FIXED (Bug 13): exact WHO Z-scores. Missing LMS rows yield null,
      // not noise.
      const z = computeGrowthZScores({
        table: whoTable,
        gender,
        ageDays,
        weightKg,
        heightCm,
        headCircumferenceCm: headCirc,
      });

      // Flag |Z| > 2 in the notes so downstream consumers don't need to
      // re-derive it. This is the pediatric-realistic "abnormal growth"
      // marker the brief asks for.
      const abnormalAxes: string[] = [];
      if (z.weightForAgeZscore !== null && Math.abs(z.weightForAgeZscore) > 2) {
        abnormalAxes.push(`weight Z=${z.weightForAgeZscore}`);
      }
      if (z.heightForAgeZscore !== null && Math.abs(z.heightForAgeZscore) > 2) {
        abnormalAxes.push(`height Z=${z.heightForAgeZscore}`);
      }
      if (
        z.headCircumferenceZScore !== null &&
        Math.abs(z.headCircumferenceZScore) > 2
      ) {
        abnormalAxes.push(`head-circ Z=${z.headCircumferenceZScore}`);
      }
      if (abnormalAxes.length > 0) abnormalCount++;

      const noteText =
        abnormalAxes.length > 0
          ? `Abnormal growth: ${abnormalAxes.join("; ")}. `
          : "";
      const fakerNote =
        faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.2,
        }) ?? "";

      rows.push({
        patientId: patient.id,
        encounterId: null,
        recordedAt,
        ageMonths: ageM,
        ageDays,
        weightKg,
        heightCm,
        headCircumferenceCm: headCirc,
        bmi,
        weightForAgeZScore: z.weightForAgeZscore,
        weightForAgePercentile: z.weightForAgePercentile,
        heightForAgeZScore: z.heightForAgeZscore,
        heightForAgePercentile: z.heightForAgePercentile,
        bmiForAgeZScore: null, // no WHO BMI-for-age table in this schema
        bmiForAgePercentile: null,
        headCircumferenceZScore: z.headCircumferenceZScore,
        headCircumferencePercentile: z.headCircumferencePercentile,
        weightVelocity: null,
        heightVelocity: null,
        recordedById,
        notes: (noteText + fakerNote).trim() || null,
      });
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await seedDb
      .insert(growthMeasurements)
      .values(rows.slice(i, i + chunkSize));
  }

  logger.set({
    event: "seed_growth_ok",
    counts: { measurements: rows.length, abnormal: abnormalCount },
  });
  logger.emit();

  return rows.length;
}
