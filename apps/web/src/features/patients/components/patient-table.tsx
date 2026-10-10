import { formatAgeShort } from "@pedia/shared";
import type { Patient } from "@pedia/shared/schemas/clinic/patients";
import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

interface PatientTableProps {
  patients: Patient[];
  onPatientClick: (patientId: string) => void;
}

type SortField = "firstName" | "lastName" | "dateOfBirth" | "gender";
type SortDirection = "asc" | "desc";

export default function PatientTable({
  patients,
  onPatientClick,
}: PatientTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPatients = filteredPatients.toSorted((a, b) => {
    let comparison = 0;
    if (sortField === "firstName") {
      comparison = a.firstName.localeCompare(b.firstName);
    } else if (sortField === "lastName") {
      comparison = a.lastName.localeCompare(b.lastName);
    } else if (sortField === "dateOfBirth") {
      comparison =
        new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
    } else if (sortField === "gender") {
      comparison = a.gender.localeCompare(b.gender);
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = sortDirection === "asc" ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="search">Search patients</Label>
        <Input
          id="search"
          type="text"
          placeholder="Search by name or MRN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Patients table">
          <caption className="text-muted-foreground mb-2 text-sm">
            Showing {sortedPatients.length} of {patients.length} patients
          </caption>
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("firstName")}
                  className="flex items-center gap-1 font-semibold hover:underline"
                >
                  First Name
                  {sortField === "firstName" && <SortIcon className="size-4" />}
                </button>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("lastName")}
                  className="flex items-center gap-1 font-semibold hover:underline"
                >
                  Last Name
                  {sortField === "lastName" && <SortIcon className="size-4" />}
                </button>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("dateOfBirth")}
                  className="flex items-center gap-1 font-semibold hover:underline"
                >
                  Age
                  {sortField === "dateOfBirth" && (
                    <SortIcon className="size-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("gender")}
                  className="flex items-center gap-1 font-semibold hover:underline"
                >
                  Gender
                  {sortField === "gender" && <SortIcon className="size-4" />}
                </button>
              </th>
              <th className="px-4 py-2 text-left font-semibold">MRN</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-muted/50 border-b">
                <td className="px-4 py-3">{patient.firstName}</td>
                <td className="px-4 py-3">{patient.lastName}</td>
                <td className="px-4 py-3">
                  {formatAgeShort(patient.dateOfBirth)}
                </td>
                <td className="px-4 py-3 capitalize">{patient.gender}</td>
                <td className="px-4 py-3">{patient.mrn}</td>
                <td className="px-4 py-3">
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
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="link"
                    onClick={() => onPatientClick(patient.id)}
                    className="p-0"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedPatients.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No patients found matching your search.
        </div>
      )}
    </div>
  );
}
