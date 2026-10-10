// packages/db/src/repositories/index.ts
import { activityRepository } from "./activity-repository";
import { admissionRepository } from "./admission.repository";
import { appointmentRepository } from "./appointment.repository";
import { auditRepository } from "./auditLog.repository";
import { authRepository } from "./auth.repository";
import { chargeRepository } from "./charge.repository";
import { clinicRepository } from "./clinic.repository";
import { dashboardRepository } from "./dashboard.repo";
import { departmentRepository } from "./department.repository";
import { dispensationRepository } from "./dispensation.repository";
import { doctorRepository } from "./doctor.repository";
import { encounterRepository } from "./encounter.repository";
import { growthRepository } from "./growth.repository";
import { guardianRepository } from "./guardian.repository";
import { immunizationRepository } from "./immunization.repository";
import { invoiceRepository } from "./invoice.repository";
import { labTestRepository } from "./lab-test.repository";
import { labRepository } from "./lab.repository";
import { medicalRecordRepository } from "./medical-record.repository";
import { medicineRepository } from "./medicine.repository";
import { patientAllergyRepository } from "./patient-allergy.repository";
import { patientChronicConditionRepository } from "./patient-chronic-condition.repository";
import { patientDocumentRepository } from "./patient-document.repository";
import { patientRepository } from "./patient.repository";
import { prescriptionRepository } from "./prescription.repository";
import { staffRepository } from "./staff.repository";
import { templateRepository } from "./template.repository";
import { vitalsRepository } from "./vitals.repository";
import { whoGrowthRepository } from "./who.repository";

export const repositories = {
  activity: activityRepository,
  admission: admissionRepository,
  appointment: appointmentRepository,
  audit: auditRepository,
  auth: authRepository,
  charge: chargeRepository,
  clinic: clinicRepository,
  dashboard: dashboardRepository,
  department: departmentRepository,
  dispensation: dispensationRepository,
  doctor: doctorRepository,
  encounter: encounterRepository,
  growth: growthRepository,
  guardian: guardianRepository,
  immunization: immunizationRepository,
  invoice: invoiceRepository,
  lab: labRepository,
  labTest: labTestRepository,
  medicalRecord: medicalRecordRepository,
  medicine: medicineRepository,
  patient: patientRepository,
  patientAllergy: patientAllergyRepository,
  patientChronicCondition: patientChronicConditionRepository,
  patientDocument: patientDocumentRepository,
  prescription: prescriptionRepository,
  staff: staffRepository,
  template: templateRepository,
  vitals: vitalsRepository,
  whoGrowth: whoGrowthRepository,
} as const;

export type Repositories = typeof repositories;

// Re-export classes + instances
export { ActivityRepository, activityRepository } from "./activity-repository";
export {
  AdmissionRepository,
  admissionRepository,
} from "./admission.repository";
export { appointmentRepository } from "./appointment.repository";
export { auditRepository } from "./auditLog.repository";
export { authRepository } from "./auth.repository";
export {
  BaseRepository,
  CrudRepository,
  combineConditions,
  readCount,
} from "./base.repository";
export { ChargeRepository, chargeRepository } from "./charge.repository";
export { ClinicRepository, clinicRepository } from "./clinic.repository";
export { dashboardRepository } from "./dashboard.repo";
export {
  DepartmentRepository,
  departmentRepository,
} from "./department.repository";
export {
  DispensationRepository,
  dispensationRepository,
} from "./dispensation.repository";
export { DoctorRepository, doctorRepository } from "./doctor.repository";
export { encounterRepository } from "./encounter.repository";
export { growthRepository } from "./growth.repository";
export { guardianRepository } from "./guardian.repository";
export { immunizationRepository } from "./immunization.repository";
export { InvoiceRepository, invoiceRepository } from "./invoice.repository";
export { labRepository } from "./lab.repository";
export { LabTestRepository, labTestRepository } from "./lab-test.repository";
export {
  MedicalRecordRepository,
  medicalRecordRepository,
} from "./medical-record.repository";
export { MedicineRepository, medicineRepository } from "./medicine.repository";
export {
  PatientDocumentRepository,
  patientDocumentRepository,
} from "./patient-document.repository";
export { patientRepository } from "./patient.repository";
export { patientAllergyRepository } from "./patient-allergy.repository";
export { patientChronicConditionRepository } from "./patient-chronic-condition.repository";
export { prescriptionRepository } from "./prescription.repository";
export { staffRepository } from "./staff.repository";
export { templateRepository } from "./template.repository";
export { VitalsRepository, vitalsRepository } from "./vitals.repository";
export { whoGrowthRepository } from "./who.repository";
