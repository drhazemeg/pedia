import type { GrowthCreateData } from "@pedia/db/schema/types";
import type { Encounter } from "@pedia/shared/schemas/clinic/encounters";
import type { Immunization } from "@pedia/shared/schemas/clinic/immunizations";
import type { LabOrder } from "@pedia/shared/schemas/clinic/lab";
import type { Prescription } from "@pedia/shared/schemas/clinic/prescriptions";
import { useState } from "react";

import {
  usePatientEncounters,
  usePatientGrowthData,
  usePatientImmunizations,
  usePatientLabOrders,
  usePatientPrescriptions,
} from "../api";

interface PatientDetailTabsProps {
  patientId: string;
}

function EncountersTab({
  encounters,
  isLoading,
}: {
  encounters: Encounter[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center">
        Loading encounters...
      </div>
    );
  }
  if (encounters && encounters.length > 0) {
    return (
      <table className="w-full" aria-label="Encounters table">
        <caption className="text-muted-foreground mb-2 text-sm">
          Patient encounters
        </caption>
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-semibold">Date</th>
            <th className="px-4 py-2 text-left font-semibold">Type</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {encounters.map((encounter) => (
            <tr key={encounter.id} className="border-b">
              <td className="px-4 py-3">
                {new Date(encounter.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{encounter.type}</td>
              <td className="px-4 py-3">{encounter.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="text-muted-foreground py-8 text-center">
      No encounters found.
    </div>
  );
}

function GrowthTab({
  growthData,
  isLoading,
}: {
  growthData: GrowthCreateData[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center">
        Loading growth data...
      </div>
    );
  }
  if (growthData && growthData.length > 0) {
    return (
      <table className="w-full" aria-label="Growth data table">
        <caption className="text-muted-foreground mb-2 text-sm">
          Growth measurements
        </caption>
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-semibold">Date</th>
            <th className="px-4 py-2 text-left font-semibold">Weight (kg)</th>
            <th className="px-4 py-2 text-left font-semibold">Height (cm)</th>
            <th className="px-4 py-2 text-left font-semibold">
              Head Circumference (cm)
            </th>
          </tr>
        </thead>
        <tbody>
          {growthData.map((growth) => (
            <tr key={growth.id} className="border-b">
              <td className="px-4 py-3">
                {new Date(growth.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{growth.weight ?? "—"}</td>
              <td className="px-4 py-3">{growth.height ?? "—"}</td>
              <td className="px-4 py-3">{growth.headCircumference ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="text-muted-foreground py-8 text-center">
      No growth data found.
    </div>
  );
}

function ImmunizationsTab({
  immunizations,
  isLoading,
}: {
  immunizations: Immunization[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center">
        Loading immunizations...
      </div>
    );
  }
  if (immunizations && immunizations.length > 0) {
    return (
      <table className="w-full" aria-label="Immunizations table">
        <caption className="text-muted-foreground mb-2 text-sm">
          Immunization records
        </caption>
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-semibold">Vaccine</th>
            <th className="px-4 py-2 text-left font-semibold">Date</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {immunizations.map((immunization) => (
            <tr key={immunization.id} className="border-b">
              <td className="px-4 py-3">{immunization.vaccine}</td>
              <td className="px-4 py-3">
                {new Date(immunization.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{immunization.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="text-muted-foreground py-8 text-center">
      No immunizations found.
    </div>
  );
}

function PrescriptionsTab({
  prescriptions,
  isLoading,
}: {
  prescriptions: Prescription[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center">
        Loading prescriptions...
      </div>
    );
  }
  if (prescriptions && prescriptions.length > 0) {
    return (
      <table className="w-full" aria-label="Prescriptions table">
        <caption className="text-muted-foreground mb-2 text-sm">
          Prescription records
        </caption>
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-semibold">Medication</th>
            <th className="px-4 py-2 text-left font-semibold">Date</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {prescriptions.map((prescription) => (
            <tr key={prescription.id} className="border-b">
              <td className="px-4 py-3">{prescription.medication}</td>
              <td className="px-4 py-3">
                {new Date(prescription.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{prescription.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="text-muted-foreground py-8 text-center">
      No prescriptions found.
    </div>
  );
}

function LabsTab({
  labOrders,
  isLoading,
}: {
  labOrders: LabOrder[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center">
        Loading lab orders...
      </div>
    );
  }
  if (labOrders && labOrders.length > 0) {
    return (
      <table className="w-full" aria-label="Lab orders table">
        <caption className="text-muted-foreground mb-2 text-sm">
          Laboratory orders
        </caption>
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-semibold">Test</th>
            <th className="px-4 py-2 text-left font-semibold">Date</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {labOrders.map((lab) => (
            <tr key={lab.id} className="border-b">
              <td className="px-4 py-3">{lab.test}</td>
              <td className="px-4 py-3">
                {new Date(lab.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{lab.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="text-muted-foreground py-8 text-center">
      No lab orders found.
    </div>
  );
}

export default function PatientDetailTabs({
  patientId,
}: PatientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "encounters" | "growth" | "immunizations" | "prescriptions" | "labs"
  >("encounters");

  const { data: encounters, isLoading: encountersLoading } =
    usePatientEncounters({ patientId, limit: 50, offset: 0 });
  const { data: growthData, isLoading: growthLoading } =
    usePatientGrowthData(patientId);
  const { data: immunizations, isLoading: immunizationsLoading } =
    usePatientImmunizations(patientId);
  const { data: prescriptions, isLoading: prescriptionsLoading } =
    usePatientPrescriptions({ patientId });
  const { data: labOrders, isLoading: labsLoading } = usePatientLabOrders({
    patientId,
  });

  const tabs = [
    {
      id: "encounters" as const,
      label: "Encounters",
      count: encounters?.length ?? 0,
    },
    { id: "growth" as const, label: "Growth", count: growthData?.length ?? 0 },
    {
      id: "immunizations" as const,
      label: "Immunizations",
      count: immunizations?.length ?? 0,
    },
    {
      id: "prescriptions" as const,
      label: "Prescriptions",
      count: prescriptions?.length ?? 0,
    },
    { id: "labs" as const, label: "Lab Orders", count: labOrders?.length ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground border-b-2"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-muted ml-2 rounded-full px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {activeTab === "encounters" && (
          <EncountersTab
            encounters={encounters ?? []}
            isLoading={encountersLoading}
          />
        )}
        {activeTab === "growth" && (
          <GrowthTab growthData={growthData ?? []} isLoading={growthLoading} />
        )}
        {activeTab === "immunizations" && (
          <ImmunizationsTab
            immunizations={immunizations ?? []}
            isLoading={immunizationsLoading}
          />
        )}
        {activeTab === "prescriptions" && (
          <PrescriptionsTab
            prescriptions={prescriptions ?? []}
            isLoading={prescriptionsLoading}
          />
        )}
        {activeTab === "labs" && (
          <LabsTab labOrders={labOrders ?? []} isLoading={labsLoading} />
        )}
      </div>
    </div>
  );
}
