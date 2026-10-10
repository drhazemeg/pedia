import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import PatientTable from "@/features/patients/components/patient-table";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/patients/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const { data: patients, isLoading } = useQuery(
    orpc.patient.list.queryOptions({
      query: "",
      limit: 50,
      offset: 0,
    })
  );

  if (isLoading) {
    return <div className="p-6">Loading patients...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
      </div>

      {patients && patients.data.length > 0 ? (
        <PatientTable
          patients={patients.data}
          onPatientClick={(patientId) => {
            navigate({
              to: "/patients/$patientId",
              params: { patientId },
            });
          }}
        />
      ) : (
        <div className="text-muted-foreground py-8 text-center">
          No patients found.
        </div>
      )}
    </div>
  );
}
