import { cn } from "@pedia/ui/lib/utils";
import { format } from "date-fns/fp/format";

type AgeDisplayProps = {
  dateOfBirth: Date | string;
  className?: string;
  /** If true, shows the raw DOB alongside the age. */
  showDob?: boolean;
};

export function AgeDisplay({
  dateOfBirth,
  className,
  showDob = false,
}: AgeDisplayProps) {
  const dob =
    typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const age = format("MM/dd/yyyy")(dob);

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-medium">{age}</span>
      {showDob && !Number.isNaN(dob.getTime()) ? (
        <span className="text-muted-foreground text-xs">
          DOB: {dob.toLocaleDateString()}
        </span>
      ) : null}
    </span>
  );
}
