import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import { useGlobalLayerActions } from "@pedia/ui/lib/ui-builder/hooks/use-layer-actions";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { canComponentAcceptChildren } from "@pedia/ui/lib/ui-builder/store/schema-utils";
import { cn } from "@pedia/ui/lib/utils";
import { Copy, Plus, Trash } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

interface MenuProps {
  layerId: string;
}

export const LayerMenu: React.FC<MenuProps> = ({ layerId }) => {
  const selectedLayer = useLayerStore((state) => state.findLayerById(layerId));
  const isLayerAPage = useLayerStore((state) => state.isLayerAPage(layerId));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const componentRegistry = useEditorStore((state) => state.registry);

  const { canDuplicate, canDelete, handleDuplicate, handleDelete } =
    useGlobalLayerActions(layerId);

  const buttonClass =
    "p-2 h-6 w-6 cursor-pointer [&_svg]:size-3 bg-blue-500 rounded-lg text-white hover:bg-white hover:text-black";

  const canRenderAddChild = useMemo(() => {
    if (!selectedLayer) return false;
    const componentDef = componentRegistry[selectedLayer.type];
    if (!componentDef) return false;
    return canComponentAcceptChildren(componentDef.schema);
  }, [selectedLayer, componentRegistry]);

  return (
    <div className="flex flex-nowrap overflow-hidden rounded-lg bg-blue-500 text-white transition-all duration-200 ease-in-out">
      {canRenderAddChild && (
        <AddComponentsPopover
          className="inline-flex w-min flex-shrink"
          onOpenChange={setPopoverOpen}
          parentLayerId={layerId}
        >
          <button
            className={cn(buttonClass, popoverOpen && "bg-white text-black")}
            type="button"
          >
            <span className="sr-only">Add Component</span>
            <Plus className="size-3" />
          </button>
        </AddComponentsPopover>
      )}
      {canDuplicate && (
        <button
          className={buttonClass}
          data-testid="duplicate-button"
          onClick={handleDuplicate}
          type="button"
        >
          <span className="sr-only">
            Duplicate {isLayerAPage ? "Page" : "Component"}
          </span>
          <Copy className="size-3" data-testid="duplicate-icon" />
        </button>
      )}
      {canDelete && (
        <button
          className={buttonClass}
          data-testid="delete-button"
          onClick={handleDelete}
          type="button"
        >
          <span className="sr-only">
            Delete {isLayerAPage ? "Page" : "Component"}
          </span>
          <Trash className="size-3" data-testid="delete-icon" />
        </button>
      )}
    </div>
  );
};
