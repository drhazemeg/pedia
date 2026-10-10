import { Button } from "@pedia/ui/components/button";
import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import { cn } from "@pedia/ui/lib/utils";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

type DividerControlProps = {
  className?: string;
  addPosition?: number;
  parentLayerId: string;
};

export function DividerControl({
  className,
  addPosition,
  parentLayerId,
}: DividerControlProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  return (
    <div className={cn("relative py-0", className)}>
      <div aria-hidden="true" className="absolute inset-0 flex items-center">
        <div className="border-primary w-full border-t border-dashed" />
      </div>
      <AddComponentsPopover
        addPosition={addPosition}
        onOpenChange={setPopoverOpen}
        parentLayerId={parentLayerId}
      >
        <Button
          className="group bg-secondary text-secondar-foreground ring-secondary flex h-min items-center gap-0 rounded-full p-2 text-sm font-semibold shadow-sm ring-1 transition-all duration-200 ease-in-out ring-inset"
          variant="outline"
        >
          <PlusCircle className="text-secondary-foreground h-5 w-5" />
          <span className="sr-only">Add component</span>
          <span
            className={cn(
              "max-w-0 overflow-hidden transition-all duration-200 ease-in-out group-hover:max-w-xs group-hover:ps-2",
              popoverOpen ? "max-w-xs ps-2" : "max-w-0"
            )}
          >
            Add component
          </span>
        </Button>
      </AddComponentsPopover>
    </div>
  );
}
