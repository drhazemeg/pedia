import { Toggle } from "@pedia/ui/components/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pedia/ui/components/tooltip";
import { cn } from "@pedia/ui/lib/utils";
import type * as React from "react";

interface ToolbarButtonProps extends React.ComponentProps<typeof Toggle> {
  isActive?: boolean;
  tooltip?: string;
}

export function ToolbarButton({
  isActive,
  children,
  tooltip,
  className,
  ...props
}: ToolbarButtonProps) {
  const toggleButton = (
    <Toggle className={cn({ "bg-accent": isActive }, className)} {...props}>
      {children}
    </Toggle>
  );

  if (!tooltip) {
    return toggleButton;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={toggleButton} />
      <TooltipContent>
        <div className="flex flex-col items-center text-center">{tooltip}</div>
      </TooltipContent>
    </Tooltip>
  );
}

ToolbarButton.displayName = "ToolbarButton";

export default ToolbarButton;
