import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCreatePatient } from "@/features/patients/api";
import PatientForm from "@/features/patients/components/patient-form";
import type { PatientFormValues } from "@/features/patients/schemas";

export const Route = createFileRoute("/_auth/patients/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const createPatient = useCreatePatient();

  const handleSubmit = async (values: PatientFormValues) => {
    const { guardians, allergies, chronicConditions, ...patientData } = values;

    await createPatient.mutateAsync({
      patient: patientData as never,
      guardians: guardians.length > 0 ? (guardians as never) : undefined,
      allergies: allergies.length > 0 ? (allergies as never) : undefined,
      chronicConditions:
        chronicConditions.length > 0 ? (chronicConditions as never) : undefined,
    });
    navigate({ to: "/patients" });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Patient</h1>
        <p className="text-muted-foreground">Add a new patient to the system</p>
      </div>

      <div className="max-w-4xl">
        <PatientForm onSubmit={handleSubmit} submitLabel="Create Patient" />
      </div>
    </div>
  );
}
