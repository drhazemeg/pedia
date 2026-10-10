import { Separator } from "@pedia/ui/components/separator";
import { IconPageBreak } from "@tabler/icons-react";
import { ExternalLink } from "lucide-react";
import * as React from "react";

import { ToolbarButton } from "../toolbar-button";

interface LinkPopoverBlockProps {
  url: string;
  onClear: () => void;
  onEdit: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const LinkPopoverBlock: React.FC<LinkPopoverBlockProps> = ({
  url,
  onClear,
  onEdit,
}) => {
  const handleOpenLink = React.useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  return (
    <div className="bg-background flex overflow-hidden rounded p-2 shadow-lg">
      <div className="inline-flex items-center gap-1">
        <ToolbarButton onClick={onEdit} tooltip="Edit link">
          Edit link
        </ToolbarButton>
        <Separator orientation="vertical" />
        <ToolbarButton
          onClick={handleOpenLink}
          tooltip="Open link in a new tab"
        >
          <ExternalLink />
        </ToolbarButton>
        <Separator orientation="vertical" />
        <ToolbarButton onClick={onClear} tooltip="Clear link">
          <IconPageBreak />
        </ToolbarButton>
        <Separator orientation="vertical" />
      </div>
    </div>
  );
};
