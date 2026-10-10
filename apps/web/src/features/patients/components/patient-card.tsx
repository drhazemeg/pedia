import { formatAgeShort } from "@pedia/shared";
import type { Patient } from "@pedia/shared/schemas/clinic/patients";
import { Button } from "@pedia/ui/components/button";
import { Card } from "@pedia/ui/components/card";

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

export default function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <Card className="hover:bg-muted/50 cursor-pointer p-4 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">
            {patient.firstName} {patient.lastName}
          </h3>
          <p className="text-muted-foreground text-sm">MRN: {patient.mrn}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">
              Age: {formatAgeShort(patient.dateOfBirth)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="capitalize">{patient.gender}</span>
            <span className="text-muted-foreground">•</span>
            <span>{patient.bloodGroup}</span>
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                patient.activeStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : patient.activeStatus === "inactive"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {patient.activeStatus}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClick}>
          View
        </Button>
      </div>
    </Card>
  );
}
