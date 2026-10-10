// src/routers/index.ts

import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { admissionRouter } from "./admission";
import { analyticsRouter } from "./analytics";
import { appointmentRouter } from "./appointment";
import { authRouter } from "./auth";
import { chargeRouter } from "./charge";
import { clinicRouter } from "./clinic";
import { dashboardRouter } from "./dashboard";
import { databaseRouter } from "./database";
import { departmentRouter } from "./department";
import { dispensationRouter } from "./dispensation";
import { doctorRouter } from "./doctor";
import { encounterRouter } from "./encounter";
import { growthRouter } from "./growth";
import { guardianRouter } from "./guardian";
import { immunizationRouter } from "./immunization";
import { invoiceRouter } from "./invoice";
import { labRouter } from "./lab";
import { labTestRouter } from "./lab-test";
import { medicalRecordRouter } from "./medical-record";
import { medicineRouter } from "./medicine";
import { patientRouter } from "./patient";
import { patientAllergyRouter } from "./patient-allergy";
import { patientChronicConditionRouter } from "./patient-chronic-condition";
import { patientDocumentRouter } from "./patient-document";
import { prescriptionRouter } from "./prescription";
import { staffRouter } from "./staff";
import { templatesRouter } from "./templates";
import { vitalsRouter } from "./vitals";
import { whoRouter } from "./who";

export const appRouter = {
  // ─── System ───
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),

  // ─── Domain Routers ───
  admission: admissionRouter,
  analytics: analyticsRouter,
  appointment: appointmentRouter,
  auth: authRouter,
  charge: chargeRouter,
  clinic: clinicRouter,
  dashboard: dashboardRouter,
  database: databaseRouter,
  department: departmentRouter,
  dispensation: dispensationRouter,
  doctor: doctorRouter,
  encounter: encounterRouter,
  growth: growthRouter,
  guardian: guardianRouter,
  immunization: immunizationRouter,
  invoice: invoiceRouter,
  lab: labRouter,
  labTest: labTestRouter,
  medicalRecord: medicalRecordRouter,
  medicine: medicineRouter,
  patient: patientRouter,
  patientAllergy: patientAllergyRouter,
  patientChronicCondition: patientChronicConditionRouter,
  patientDocument: patientDocumentRouter,
  prescription: prescriptionRouter,
  staff: staffRouter,
  templates: templatesRouter,
  vitals: vitalsRouter,
  who: whoRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
