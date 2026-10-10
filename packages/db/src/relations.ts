// packages/db/src/relations.ts
import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  // ── AUTH ──
  user: {
    sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
    accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
    twoFactors: r.many.twoFactor({ from: r.user.id, to: r.twoFactor.userId }),
    members: r.many.member({ from: r.user.id, to: r.member.userId }),
    invitations: r.many.invitation({
      from: r.user.id,
      to: r.invitation.inviterId,
    }),
    staff: r.many.staff({ from: r.user.id, to: r.staff.userId }),
    patients: r.many.patients({ from: r.user.id, to: r.patients.userId }),
    guardians: r.many.guardians({ from: r.user.id, to: r.guardians.userId }),
    patientDocuments: r.many.patientDocuments({
      from: r.user.id,
      to: r.patientDocuments.uploadedById,
    }),
    appointmentsBooked: r.many.appointments({
      from: r.user.id,
      to: r.appointments.bookedById,
    }),
    encountersSigned: r.many.encounters({
      from: r.user.id,
      to: r.encounters.signedById,
    }),
    prescriptionsFilled: r.many.prescriptions({
      from: r.user.id,
      to: r.prescriptions.filledById,
    }),
    inventoryTransactions: r.many.inventoryTransactions({
      from: r.user.id,
      to: r.inventoryTransactions.performedById,
    }),
    dispensations: r.many.dispensations({
      from: r.user.id,
      to: r.dispensations.dispensedById,
    }),
    admissionsCreated: r.many.admissions({
      from: r.user.id,
      to: r.admissions.createdById,
      alias: "admissionsCreatedBy",
    }),
    bedAllocationsStarted: r.many.bedAllocations({
      from: r.user.id,
      to: r.bedAllocations.allocatedById,
      alias: "bedAllocationsAllocatedBy",
    }),
    bedAllocationsEnded: r.many.bedAllocations({
      from: r.user.id,
      to: r.bedAllocations.endedById,
      alias: "bedAllocationsEndedBy",
    }),
    clinicalNotes: r.many.clinicalNotes({
      from: r.user.id,
      to: r.clinicalNotes.authorUserId,
    }),
    invoicesCreated: r.many.invoices({
      from: r.user.id,
      to: r.invoices.createdById,
    }),
    paymentsReceived: r.many.payments({
      from: r.user.id,
      to: r.payments.receivedById,
    }),
    expenses: r.many.expenses({ from: r.user.id, to: r.expenses.recordedById }),
    templatesCreated: r.many.templates({
      from: r.user.id,
      to: r.templates.createdById,
    }),
    labOrderItemsResulted: r.many.labOrderItems({
      from: r.user.id,
      to: r.labOrderItems.resultedByUserId,
    }),
  },
  session: { user: r.one.user({ from: r.session.userId, to: r.user.id }) },
  account: { user: r.one.user({ from: r.account.userId, to: r.user.id }) },
  twoFactor: { user: r.one.user({ from: r.twoFactor.userId, to: r.user.id }) },
  organization: {
    organizationRoles: r.many.organizationRole({
      from: r.organization.id,
      to: r.organizationRole.organizationId,
    }),
    members: r.many.member({
      from: r.organization.id,
      to: r.member.organizationId,
    }),
    invitations: r.many.invitation({
      from: r.organization.id,
      to: r.invitation.organizationId,
    }),
  },
  organizationRole: {
    organization: r.one.organization({
      from: r.organizationRole.organizationId,
      to: r.organization.id,
    }),
  },
  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({ from: r.member.userId, to: r.user.id }),
  },
  invitation: {
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({ from: r.invitation.inviterId, to: r.user.id }),
  },

  // ── CLINIC ──
  clinicSettings: {
    clinic: r.one.clinics({
      from: r.clinicSettings.clinicId,
      to: r.clinics.id,
    }),
  },
  clinics: {
    clinicSettings: r.one.clinicSettings({
      from: r.clinics.id,
      to: r.clinicSettings.clinicId,
    }),
    departments: r.many.departments({
      from: r.clinics.id,
      to: r.departments.clinicId,
    }),
    staff: r.many.staff({ from: r.clinics.id, to: r.staff.clinicId }),
    patients: r.many.patients({ from: r.clinics.id, to: r.patients.clinicId }),
    appointments: r.many.appointments({
      from: r.clinics.id,
      to: r.appointments.clinicId,
    }),
    wards: r.many.wards({ from: r.clinics.id, to: r.wards.clinicId }),
    templates: r.many.templates({
      from: r.clinics.id,
      to: r.templates.clinicId,
    }),
    medicines: r.many.medicines({
      from: r.clinics.id,
      to: r.medicines.clinicId,
    }),
    invoices: r.many.invoices({ from: r.clinics.id, to: r.invoices.clinicId }),
  },
  departments: {
    clinic: r.one.clinics({ from: r.departments.clinicId, to: r.clinics.id }),
    doctors: r.many.doctors({
      from: r.departments.id,
      to: r.doctors.departmentId,
    }),
  },
  staff: {
    clinic: r.one.clinics({ from: r.staff.clinicId, to: r.clinics.id }),
    user: r.one.user({ from: r.staff.userId, to: r.user.id }),
    doctor: r.one.doctors({ from: r.staff.id, to: r.doctors.staffId }),
    patients: r.many.patients({
      from: r.staff.id,
      to: r.patients.pediatricianId,
    }),
    appointments: r.many.appointments({
      from: r.staff.id,
      to: r.appointments.staffId,
    }),
    encounters: r.many.encounters({
      from: r.staff.id,
      to: r.encounters.providerId,
    }),
    prescriptions: r.many.prescriptions({
      from: r.staff.id,
      to: r.prescriptions.prescriberId,
    }),
    labOrders: r.many.labOrders({
      from: r.staff.id,
      to: r.labOrders.orderedById,
    }),
    auditLogs: r.many.auditLogs({ from: r.staff.id, to: r.auditLogs.staffId }),
    medicalRecords: r.many.medicalRecords({
      from: r.staff.id,
      to: r.medicalRecords.uploadedById,
    }),
    vitals: r.many.vitals({ from: r.staff.id, to: r.vitals.recordedById }),
    growthMeasurements: r.many.growthMeasurements({
      from: r.staff.id,
      to: r.growthMeasurements.recordedById,
    }),
    immunizationsAdministered: r.many.immunizations({
      from: r.staff.id,
      to: r.immunizations.administeredById,
    }),
    admissionsAttending: r.many.admissions({
      from: r.staff.id,
      to: r.admissions.attendingStaffId,
    }),
  },
  doctors: {
    staff: r.one.staff({ from: r.doctors.staffId, to: r.staff.id }),
    department: r.one.departments({
      from: r.doctors.departmentId,
      to: r.departments.id,
    }),
    schedules: r.many.doctorSchedules({
      from: r.doctors.id,
      to: r.doctorSchedules.doctorId,
    }),
    appointments: r.many.appointments({
      from: r.doctors.id,
      to: r.appointments.doctorId,
    }),
    encounters: r.many.encounters({
      from: r.doctors.id,
      to: r.encounters.doctorId,
    }),
    prescriptions: r.many.prescriptions({
      from: r.doctors.id,
      to: r.prescriptions.doctorId,
    }),
    labOrdersOrdered: r.many.labOrders({
      from: r.doctors.id,
      to: r.labOrders.orderedByDoctorId,
    }),
    admissionsAttending: r.many.admissions({
      from: r.doctors.id,
      to: r.admissions.attendingDoctorId,
    }),
  },
  doctorSchedules: {
    doctor: r.one.doctors({
      from: r.doctorSchedules.doctorId,
      to: r.doctors.id,
    }),
  },
  patients: {
    user: r.one.user({ from: r.patients.userId, to: r.user.id }),
    clinic: r.one.clinics({ from: r.patients.clinicId, to: r.clinics.id }),
    pediatrician: r.one.staff({
      from: r.patients.pediatricianId,
      to: r.staff.id,
    }),
    guardians: r.many.guardians({
      from: r.patients.id,
      to: r.guardians.patientId,
    }),
    patientAllergies: r.many.patientAllergies({
      from: r.patients.id,
      to: r.patientAllergies.patientId,
    }),
    chronicConditions: r.many.patientChronicConditions({
      from: r.patients.id,
      to: r.patientChronicConditions.patientId,
    }),
    documents: r.many.patientDocuments({
      from: r.patients.id,
      to: r.patientDocuments.patientId,
    }),
    appointments: r.many.appointments({
      from: r.patients.id,
      to: r.appointments.patientId,
    }),
    encounters: r.many.encounters({
      from: r.patients.id,
      to: r.encounters.patientId,
    }),
    vitals: r.many.vitals({ from: r.patients.id, to: r.vitals.patientId }),
    growthMeasurements: r.many.growthMeasurements({
      from: r.patients.id,
      to: r.growthMeasurements.patientId,
    }),
    immunizations: r.many.immunizations({
      from: r.patients.id,
      to: r.immunizations.patientId,
    }),
    prescriptions: r.many.prescriptions({
      from: r.patients.id,
      to: r.prescriptions.patientId,
    }),
    labOrders: r.many.labOrders({
      from: r.patients.id,
      to: r.labOrders.patientId,
    }),
    medicalRecords: r.many.medicalRecords({
      from: r.patients.id,
      to: r.medicalRecords.patientId,
    }),
    admissions: r.many.admissions({
      from: r.patients.id,
      to: r.admissions.patientId,
    }),
    invoices: r.many.invoices({
      from: r.patients.id,
      to: r.invoices.patientId,
    }),
    payments: r.many.payments({
      from: r.patients.id,
      to: r.payments.patientId,
    }),
    dispensations: r.many.dispensations({
      from: r.patients.id,
      to: r.dispensations.patientId,
    }),
  },
  guardians: {
    patient: r.one.patients({ from: r.guardians.patientId, to: r.patients.id }),
    user: r.one.user({ from: r.guardians.userId, to: r.user.id }),
  },
  patientAllergies: {
    patient: r.one.patients({
      from: r.patientAllergies.patientId,
      to: r.patients.id,
    }),
  },
  patientChronicConditions: {
    patient: r.one.patients({
      from: r.patientChronicConditions.patientId,
      to: r.patients.id,
    }),
  },
  patientDocuments: {
    patient: r.one.patients({
      from: r.patientDocuments.patientId,
      to: r.patients.id,
    }),
    uploadedBy: r.one.user({
      from: r.patientDocuments.uploadedById,
      to: r.user.id,
    }),
  },
  appointments: {
    patient: r.one.patients({
      from: r.appointments.patientId,
      to: r.patients.id,
    }),
    staff: r.one.staff({ from: r.appointments.staffId, to: r.staff.id }),
    doctor: r.one.doctors({ from: r.appointments.doctorId, to: r.doctors.id }),
    clinic: r.one.clinics({ from: r.appointments.clinicId, to: r.clinics.id }),
    bookedByUser: r.one.user({
      from: r.appointments.bookedById,
      to: r.user.id,
    }),
  },
  encounters: {
    patient: r.one.patients({
      from: r.encounters.patientId,
      to: r.patients.id,
    }),
    appointment: r.one.appointments({
      from: r.encounters.appointmentId,
      to: r.appointments.id,
    }),
    provider: r.one.staff({ from: r.encounters.providerId, to: r.staff.id }),
    doctor: r.one.doctors({ from: r.encounters.doctorId, to: r.doctors.id }),
    signedBy: r.one.user({ from: r.encounters.signedById, to: r.user.id }),
    diagnoses: r.many.diagnoses({
      from: r.encounters.id,
      to: r.diagnoses.encounterId,
    }),
    vitals: r.many.vitals({ from: r.encounters.id, to: r.vitals.encounterId }),
    growthMeasurements: r.many.growthMeasurements({
      from: r.encounters.id,
      to: r.growthMeasurements.encounterId,
    }),
    immunizations: r.many.immunizations({
      from: r.encounters.id,
      to: r.immunizations.encounterId,
    }),
    prescriptions: r.many.prescriptions({
      from: r.encounters.id,
      to: r.prescriptions.encounterId,
    }),
    labOrders: r.many.labOrders({
      from: r.encounters.id,
      to: r.labOrders.encounterId,
    }),
    medicalRecords: r.many.medicalRecords({
      from: r.encounters.id,
      to: r.medicalRecords.encounterId,
    }),
    invoices: r.many.invoices({
      from: r.encounters.id,
      to: r.invoices.encounterId,
    }),
  },
  diagnoses: {
    encounter: r.one.encounters({
      from: r.diagnoses.encounterId,
      to: r.encounters.id,
    }),
    patient: r.one.patients({ from: r.diagnoses.patientId, to: r.patients.id }),
  },
  vitals: {
    patient: r.one.patients({ from: r.vitals.patientId, to: r.patients.id }),
    encounter: r.one.encounters({
      from: r.vitals.encounterId,
      to: r.encounters.id,
    }),
    recordedBy: r.one.staff({ from: r.vitals.recordedById, to: r.staff.id }),
  },
  growthMeasurements: {
    patient: r.one.patients({
      from: r.growthMeasurements.patientId,
      to: r.patients.id,
    }),
    encounter: r.one.encounters({
      from: r.growthMeasurements.encounterId,
      to: r.encounters.id,
    }),
    recordedBy: r.one.staff({
      from: r.growthMeasurements.recordedById,
      to: r.staff.id,
    }),
  },
  immunizations: {
    patient: r.one.patients({
      from: r.immunizations.patientId,
      to: r.patients.id,
    }),
    encounter: r.one.encounters({
      from: r.immunizations.encounterId,
      to: r.encounters.id,
    }),
    administeredBy: r.one.staff({
      from: r.immunizations.administeredById,
      to: r.staff.id,
    }),
  },
  medicines: {
    clinic: r.one.clinics({ from: r.medicines.clinicId, to: r.clinics.id }),
    batches: r.many.medicineBatches({
      from: r.medicines.id,
      to: r.medicineBatches.medicineId,
    }),
    inventoryTransactions: r.many.inventoryTransactions({
      from: r.medicines.id,
      to: r.inventoryTransactions.medicineId,
    }),
    prescriptionItems: r.many.prescriptionItems({
      from: r.medicines.id,
      to: r.prescriptionItems.medicineId,
    }),
    dispensationItems: r.many.dispensationItems({
      from: r.medicines.id,
      to: r.dispensationItems.medicineId,
    }),
  },
  medicineBatches: {
    medicine: r.one.medicines({
      from: r.medicineBatches.medicineId,
      to: r.medicines.id,
    }),
    inventoryTransactions: r.many.inventoryTransactions({
      from: r.medicineBatches.id,
      to: r.inventoryTransactions.batchId,
    }),
    dispensationItems: r.many.dispensationItems({
      from: r.medicineBatches.id,
      to: r.dispensationItems.batchId,
    }),
  },
  inventoryTransactions: {
    medicine: r.one.medicines({
      from: r.inventoryTransactions.medicineId,
      to: r.medicines.id,
    }),
    batch: r.one.medicineBatches({
      from: r.inventoryTransactions.batchId,
      to: r.medicineBatches.id,
    }),
    performedBy: r.one.user({
      from: r.inventoryTransactions.performedById,
      to: r.user.id,
    }),
  },
  prescriptions: {
    patient: r.one.patients({
      from: r.prescriptions.patientId,
      to: r.patients.id,
    }),
    encounter: r.one.encounters({
      from: r.prescriptions.encounterId,
      to: r.encounters.id,
    }),
    doctor: r.one.doctors({ from: r.prescriptions.doctorId, to: r.doctors.id }),
    prescriber: r.one.staff({
      from: r.prescriptions.prescriberId,
      to: r.staff.id,
    }),
    filledBy: r.one.user({ from: r.prescriptions.filledById, to: r.user.id }),
    items: r.many.prescriptionItems({
      from: r.prescriptions.id,
      to: r.prescriptionItems.prescriptionId,
    }),
    dispensations: r.many.dispensations({
      from: r.prescriptions.id,
      to: r.dispensations.prescriptionId,
    }),
  },
  prescriptionItems: {
    prescription: r.one.prescriptions({
      from: r.prescriptionItems.prescriptionId,
      to: r.prescriptions.id,
    }),
    medicine: r.one.medicines({
      from: r.prescriptionItems.medicineId,
      to: r.medicines.id,
    }),
    dispensationItems: r.many.dispensationItems({
      from: r.prescriptionItems.id,
      to: r.dispensationItems.prescriptionItemId,
    }),
  },
  dispensations: {
    prescription: r.one.prescriptions({
      from: r.dispensations.prescriptionId,
      to: r.prescriptions.id,
    }),
    patient: r.one.patients({
      from: r.dispensations.patientId,
      to: r.patients.id,
    }),
    dispensedBy: r.one.user({
      from: r.dispensations.dispensedById,
      to: r.user.id,
    }),
    items: r.many.dispensationItems({
      from: r.dispensations.id,
      to: r.dispensationItems.dispensationId,
    }),
  },
  dispensationItems: {
    dispensation: r.one.dispensations({
      from: r.dispensationItems.dispensationId,
      to: r.dispensations.id,
    }),
    prescriptionItem: r.one.prescriptionItems({
      from: r.dispensationItems.prescriptionItemId,
      to: r.prescriptionItems.id,
    }),
    medicine: r.one.medicines({
      from: r.dispensationItems.medicineId,
      to: r.medicines.id,
    }),
    batch: r.one.medicineBatches({
      from: r.dispensationItems.batchId,
      to: r.medicineBatches.id,
    }),
  },
  labOrders: {
    provider: r.one.staff({ from: r.labOrders.orderedById, to: r.staff.id }),
    patient: r.one.patients({ from: r.labOrders.patientId, to: r.patients.id }),
    encounter: r.one.encounters({
      from: r.labOrders.encounterId,
      to: r.encounters.id,
    }),
    orderedByDoctor: r.one.doctors({
      from: r.labOrders.orderedByDoctorId,
      to: r.doctors.id,
    }),
    items: r.many.labOrderItems({
      from: r.labOrders.id,
      to: r.labOrderItems.labOrderId,
    }),
  },
  labOrderItems: {
    labOrder: r.one.labOrders({
      from: r.labOrderItems.labOrderId,
      to: r.labOrders.id,
    }),
    labTest: r.one.labTests({
      from: r.labOrderItems.labTestId,
      to: r.labTests.id,
    }),
    resultedByUser: r.one.user({
      from: r.labOrderItems.resultedByUserId,
      to: r.user.id,
    }),
  },
  labTests: {
    orderItems: r.many.labOrderItems({
      from: r.labTests.id,
      to: r.labOrderItems.labTestId,
    }),
  },
  medicalRecords: {
    patient: r.one.patients({
      from: r.medicalRecords.patientId,
      to: r.patients.id,
    }),
    encounter: r.one.encounters({
      from: r.medicalRecords.encounterId,
      to: r.encounters.id,
    }),
    uploadedBy: r.one.staff({
      from: r.medicalRecords.uploadedById,
      to: r.staff.id,
    }),
  },
  wards: {
    clinic: r.one.clinics({ from: r.wards.clinicId, to: r.clinics.id }),
    rooms: r.many.rooms({ from: r.wards.id, to: r.rooms.wardId }),
  },
  rooms: {
    ward: r.one.wards({ from: r.rooms.wardId, to: r.wards.id }),
    beds: r.many.beds({ from: r.rooms.id, to: r.beds.roomId }),
  },
  beds: {
    room: r.one.rooms({ from: r.beds.roomId, to: r.rooms.id }),
    allocations: r.many.bedAllocations({
      from: r.beds.id,
      to: r.bedAllocations.bedId,
    }),
  },
  admissions: {
    patient: r.one.patients({
      from: r.admissions.patientId,
      to: r.patients.id,
    }),
    attendingStaff: r.one.staff({
      from: r.admissions.attendingStaffId,
      to: r.staff.id,
    }),
    attendingDoctor: r.one.doctors({
      from: r.admissions.attendingDoctorId,
      to: r.doctors.id,
    }),
    createdBy: r.one.user({ from: r.admissions.createdById, to: r.user.id }),
    bedAllocations: r.many.bedAllocations({
      from: r.admissions.id,
      to: r.bedAllocations.admissionId,
    }),
    clinicalNotes: r.many.clinicalNotes({
      from: r.admissions.id,
      to: r.clinicalNotes.admissionId,
    }),
    invoices: r.many.invoices({
      from: r.admissions.id,
      to: r.invoices.admissionId,
    }),
  },
  bedAllocations: {
    admission: r.one.admissions({
      from: r.bedAllocations.admissionId,
      to: r.admissions.id,
    }),
    bed: r.one.beds({ from: r.bedAllocations.bedId, to: r.beds.id }),
    allocatedBy: r.one.user({
      from: r.bedAllocations.allocatedById,
      to: r.user.id,
    }),
    endedBy: r.one.user({ from: r.bedAllocations.endedById, to: r.user.id }),
  },
  clinicalNotes: {
    admission: r.one.admissions({
      from: r.clinicalNotes.admissionId,
      to: r.admissions.id,
    }),
    authorUser: r.one.user({
      from: r.clinicalNotes.authorUserId,
      to: r.user.id,
    }),
  },
  invoices: {
    patient: r.one.patients({ from: r.invoices.patientId, to: r.patients.id }),
    encounter: r.one.encounters({
      from: r.invoices.encounterId,
      to: r.encounters.id,
    }),
    admission: r.one.admissions({
      from: r.invoices.admissionId,
      to: r.admissions.id,
    }),
    clinic: r.one.clinics({ from: r.invoices.clinicId, to: r.clinics.id }),
    createdBy: r.one.user({ from: r.invoices.createdById, to: r.user.id }),
    items: r.many.invoiceItems({
      from: r.invoices.id,
      to: r.invoiceItems.invoiceId,
    }),
    payments: r.many.payments({
      from: r.invoices.id,
      to: r.payments.invoiceId,
    }),
  },
  invoiceItems: {
    invoice: r.one.invoices({
      from: r.invoiceItems.invoiceId,
      to: r.invoices.id,
    }),
  },
  payments: {
    invoice: r.one.invoices({ from: r.payments.invoiceId, to: r.invoices.id }),
    patient: r.one.patients({ from: r.payments.patientId, to: r.patients.id }),
    receivedBy: r.one.user({ from: r.payments.receivedById, to: r.user.id }),
  },
  expenses: {
    recordedBy: r.one.user({ from: r.expenses.recordedById, to: r.user.id }),
  },
  auditLogs: {
    staff: r.one.staff({ from: r.auditLogs.staffId, to: r.staff.id }),
  },
  templates: {
    clinic: r.one.clinics({ from: r.templates.clinicId, to: r.clinics.id }),
    createdBy: r.one.user({ from: r.templates.createdById, to: r.user.id }),
  },
}));
