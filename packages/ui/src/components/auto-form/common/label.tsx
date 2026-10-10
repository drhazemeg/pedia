import { FormLabel } from "@pedia/ui/components/form";
import { cn } from "@pedia/ui/lib/utils";

function AutoFormLabel({
  label,
  isRequired,
  className,
}: {
  label: string;
  isRequired: boolean;
  className?: string;
}) {
  return (
    <FormLabel className={cn(className)} required={isRequired}>
      {label}
    </FormLabel>
  );
}

export default AutoFormLabel;
export const EMPTY_PATH: readonly string[] = Object.freeze([]);
