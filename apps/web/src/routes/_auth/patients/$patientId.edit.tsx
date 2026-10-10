import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { usePatient, useUpdatePatient } from "@/features/patients/api";
import PatientForm from "@/features/patients/components/patient-form";
import type { PatientFormValues } from "@/features/patients/schemas";

export const Route = createFileRoute("/_auth/patients/$patientId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(patientId);
  const updatePatient = useUpdatePatient();

  const handleSubmit = async (values: PatientFormValues) => {
    const {
      guardians: _guardians,
      allergies: _allergies,
      chronicConditions: _chronicConditions,
      ...patientData
    } = values;
    await updatePatient.mutateAsync({
      ...patientData,
      id: patientId,
    } as PatientFormValues & { id: string });
    navigate({ to: "/patients/$patientId", params: { patientId } });
  };

  if (isLoading) {
    return <div className="p-6">Loading patient...</div>;
  }

  if (!patient) {
    return <div className="p-6">Patient not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() =>
            navigate({ to: "/patients/$patientId", params: { patientId } })
          }
          className="text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          ← Back to patient
        </button>
        <h1 className="text-3xl font-bold">Edit Patient</h1>
        <p className="text-muted-foreground">
          Edit {patient.firstName} {patient.lastName}
        </p>
      </div>

      <div className="max-w-4xl">
        <PatientForm
          initialValues={patient as Partial<PatientFormValues>}
          onSubmit={handleSubmit}
          submitLabel="Update Patient"
        />
      </div>
    </div>
  );
}
