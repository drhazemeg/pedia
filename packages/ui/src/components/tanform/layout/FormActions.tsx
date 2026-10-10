import { Button } from "@pedia/ui/components/button";
import { cn } from "@pedia/ui/lib/utils";
import { Loader2 } from "lucide-react";

interface FormActionsProps {
  cancelLabel?: string;
  className?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export function FormActions({
  isSubmitting,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-4 pt-4 sm:flex-row", className)}
    >
      <Button
        className="flex-1 sm:flex-none"
        disabled={isSubmitting}
        onClick={onCancel}
        type="button"
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button
        className="flex-1 sm:flex-none"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
