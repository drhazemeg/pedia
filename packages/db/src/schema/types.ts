// packages/db/src/schema/types.ts
//
// Row-shape exports only. Enum-derived types (Role, Gender, AppointmentStatus,
// …) live in `./enums` — do NOT re-declare them here, or the barrel in
// `index.ts` will produce ambiguous re-exports.

import type { account, session, user, verification } from "./auth";
import type {
  clinicalNotes,
  admissions,
  appointments,
  auditLogs,
  beds,
  clinics,
  doctors,
  encounters,
  expenses,
  growthMeasurements,
  guardians,
  immunizations,
  invoiceItems,
  invoices,
  labOrderItems,
  labOrders,
  labTests,
  medicalRecords,
  medicineBatches,
  medicines,
  patientAllergies,
  patientChronicConditions,
  patients,
  payments,
  prescriptions,
  rooms,
  staff,
  vitals,
  wards,
  whoGrowthData,
} from "./clinic";

// ─── Row shapes ──────────────────────────────────────────────────────────────
// Prefer the `.inferSelect` / `.inferInsert` spelling — it is what Drizzle
// documents and it reads more directly than `InferSelectModel<typeof X>`.

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Guardian = typeof guardians.$inferSelect;
export type NewGuardian = typeof guardians.$inferInsert;
export type PatientAllergy = typeof patientAllergies.$inferSelect;
export type NewPatientAllergy = typeof patientAllergies.$inferInsert;
export type ChronicCondition = typeof patientChronicConditions.$inferSelect;
export type NewChronicCondition = typeof patientChronicConditions.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type VitalSigns = typeof vitals.$inferSelect;
export type NewVitalSigns = typeof vitals.$inferInsert;
export type GrowthMeasurement = typeof growthMeasurements.$inferSelect;
export type NewGrowthMeasurement = typeof growthMeasurements.$inferInsert;
export type Immunization = typeof immunizations.$inferSelect;
export type NewImmunization = typeof immunizations.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;
export type MedicineBatch = typeof medicineBatches.$inferSelect;
export type NewMedicineBatch = typeof medicineBatches.$inferInsert;

export type LabOrder = typeof labOrders.$inferSelect;
export type NewLabOrder = typeof labOrders.$inferInsert;
export type LabTestRow = typeof labTests.$inferSelect;
export type NewLabTestRow = typeof labTests.$inferInsert;
export type LabOrderItem = typeof labOrderItems.$inferSelect;
export type NewLabOrderItem = typeof labOrderItems.$inferInsert;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;

export type Admission = typeof admissions.$inferSelect;
export type NewAdmission = typeof admissions.$inferInsert;
export type Ward = typeof wards.$inferSelect;
export type NewWard = typeof wards.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Bed = typeof beds.$inferSelect;
export type NewBed = typeof beds.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type ClinicNote = typeof clinicalNotes.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type NewClinicNote = typeof clinicalNotes.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type WhoGrowthData = typeof whoGrowthData.$inferSelect;
export type NewWhoGrowthData = typeof whoGrowthData.$inferInsert;

// ─── Create / Update shapes (derived from row shapes) ────────────────────────

type Strip = "id" | "createdAt" | "updatedAt";

export type PatientCreateData = Omit<NewPatient, Strip>;
export type PatientUpdateData = Partial<PatientCreateData>;

export type StaffCreateData = Omit<NewStaff, Strip>;
export type StaffUpdateData = Partial<StaffCreateData>;

export type GuardianCreateData = Omit<NewGuardian, Strip>;
export type GuardianUpdateData = Partial<GuardianCreateData>;

export type EncounterCreateData = Omit<NewEncounter, Strip>;
export type EncounterUpdateData = Partial<EncounterCreateData>;

export type VitalCreateData = Omit<NewVitalSigns, Strip>;
export type VitalUpdateData = Partial<VitalCreateData>;

export type GrowthCreateData = Omit<NewGrowthMeasurement, Strip>;
export type GrowthUpdateData = Partial<GrowthCreateData>;

export type ImmunizationCreateData = Omit<NewImmunization, Strip>;
export type ImmunizationUpdateData = Partial<ImmunizationCreateData>;

export type PrescriptionCreateData = Omit<NewPrescription, Strip>;
export type PrescriptionUpdateData = Partial<PrescriptionCreateData>;

export type LabOrderCreateData = Omit<NewLabOrder, Strip>;
export type LabOrderUpdateData = Partial<LabOrderCreateData>;

export type AppointmentCreateData = Omit<NewAppointment, Strip>;
export type AppointmentUpdateData = Partial<AppointmentCreateData>;

export type AuditLogCreateData = Omit<NewAuditLog, "id">;

export type AllergyCreateData = Omit<NewPatientAllergy, Strip>;
export type AllergyUpdateData = Partial<AllergyCreateData>;

export type ChronicConditionCreateData = Omit<NewChronicCondition, Strip>;
export type ChronicConditionUpdateData = Partial<ChronicConditionCreateData>;

export type MedicalRecordCreateData = Omit<NewMedicalRecord, Strip>;
export type MedicalRecordUpdateData = Partial<MedicalRecordCreateData>;

// ─── Composite view types ────────────────────────────────────────────────────

export type AppointmentWithPatient = Appointment & {
  // FK to `patients.id` is notNull, so the joined patient is always present.
  patient: Pick<
    Patient,
    "id" | "firstName" | "lastName" | "dateOfBirth" | "mrn"
  >;
};
