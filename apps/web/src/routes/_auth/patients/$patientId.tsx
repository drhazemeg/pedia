import { formatAgeShort } from "@pedia/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { usePatient } from "@/features/patients/api";
import PatientDetailTabs from "@/features/patients/components/patient-detail-tabs";

export const Route = createFileRoute("/_auth/patients/$patientId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(patientId);

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
          onClick={() => navigate({ to: "/patients" })}
          className="text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          ← Back to patients
        </button>
        <h1 className="text-3xl font-bold">
          {patient.firstName} {patient.lastName}
        </h1>
        <p className="text-muted-foreground">MRN: {patient.mrn}</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="text-muted-foreground text-sm font-medium">Age</h3>
          <p className="text-2xl font-semibold">
            {formatAgeShort(patient.dateOfBirth)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-muted-foreground text-sm font-medium">Gender</h3>
          <p className="text-2xl font-semibold capitalize">{patient.gender}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-muted-foreground text-sm font-medium">
            Blood Group
          </h3>
          <p className="text-2xl font-semibold">{patient.bloodGroup}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() =>
            navigate({
              to: "/patients/$patientId/edit",
              params: { patientId },
            })
          }
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
        >
          Edit Patient
        </button>
      </div>

      <PatientDetailTabs patientId={patientId} />
    </div>
  );
}
