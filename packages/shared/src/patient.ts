import type { PatientActivityStatus } from "./schemas/clinic";

export function statusToActivityStatus(
  status: string | null
): PatientActivityStatus {
  switch (status) {
    case "Checked In":
      return "checked-in";
    case "In Progress":
      return "in-progress";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "No Show":
      return "no-show";
    default:
      return "scheduled";
  }
}

const VISIT_TYPE_FEES: Record<string, number> = {};

export function feeForVisitType(type: string): number {
  return VISIT_TYPE_FEES[type] ?? 100;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
