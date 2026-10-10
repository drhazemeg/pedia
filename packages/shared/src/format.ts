import { formatDistanceToNowStrict } from "date-fns";

/** Format an ISO datetime (or Date) as a short local time, e.g. "9:30 AM". */
export function formatTime(when: string | Date): string {
  const date = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(date.getTime()))
    return typeof when === "string" ? when : "—";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format a date as "3h ago" / "2d ago". */
export function formatRelative(when: string | Date): string {
  const date = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(date.getTime()))
    return typeof when === "string" ? when : "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/**
 * How long ago a due date was, e.g. "3mo", "2w", "5d". Returns `null` if the
 * due date is in the future or invalid — the caller should not render the
 * "overdue" badge in that case.
 *
 * Deliberately distinct from `formatAge` (patient age): the two concepts
 * happen to share a display format today, but they must be free to diverge.
 */
export function formatOverdueDuration(
  dueDate: string | Date | null | undefined
): string | null {
  if (!dueDate) return null;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  if (due.getTime() > now.getTime()) return null;

  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days < 7) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  if (days < 730) return `${Math.floor(days / 30.4375)}mo`;
  return `${Math.floor(days / 365.25)}y`;
}
