import { patientFormValuesSchema } from "@pedia/shared/schemas/clinic/patients";
import type * as z from "zod";

export const patientFormSchema = patientFormValuesSchema;

export type PatientFormValues = z.infer<typeof patientFormSchema>;
