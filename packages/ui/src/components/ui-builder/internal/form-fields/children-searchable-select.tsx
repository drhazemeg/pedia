import { Badge } from "@pedia/ui/components/badge";
import { Button } from "@pedia/ui/components/button";
import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import type { ComponentLayer } from "@pedia/ui/components/ui-builder/types";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { hasLayerChildren } from "@pedia/ui/lib/ui-builder/store/layer-utils";
import { ChevronsUpDown, X as XIcon } from "lucide-react";
import { useCallback } from "react";

interface ChildrenSearchableSelectProps {
  layer: ComponentLayer;
  onChange: ({
    layerType,
    parentLayerId,
    addPosition,
  }: {
    layerType: string;
    parentLayerId: string;
    addPosition?: number;
  }) => void;
}

export function ChildrenSearchableSelect({
  layer,
  onChange,
}: ChildrenSearchableSelectProps) {
  const { selectLayer, removeLayer, selectedLayerId, findLayerById } =
    useLayerStore();

  const selectedLayer = findLayerById(selectedLayerId);

  return (
    <div className="w-full space-y-4">
      <AddComponentsPopover onChange={onChange} parentLayerId={layer.id}>
        <Button
          aria-haspopup="dialog"
          className="w-full justify-between"
          variant="outline"
        >
          Add Component
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </AddComponentsPopover>

      {hasLayerChildren(layer) && (
        <div className="flex w-full flex-wrap gap-2">
          {selectedLayer &&
            hasLayerChildren(selectedLayer) &&
            selectedLayer.children.map((child) => (
              <ChildLayerBadge
                child={child}
                key={child.id}
                removeLayer={removeLayer}
                selectLayer={selectLayer}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ChildLayerBadge({
  child,
  selectLayer,
  removeLayer,
}: {
  child: ComponentLayer;
  selectLayer: (id: string) => void;
  removeLayer: (id: string) => void;
}) {
  const handleSelect = useCallback(() => {
    selectLayer(child.id);
  }, [selectLayer, child.id]);

  const handleRemove = useCallback(() => {
    removeLayer(child.id);
  }, [removeLayer, child.id]);

  return (
    <Badge
      className="flex items-center space-x-2 py-0 ps-2 pe-0 rtl:space-x-reverse"
      variant="secondary"
    >
      <Button
        className="h-5 p-0"
        onClick={handleSelect}
        size="sm"
        variant="link"
      >
        {nameForLayer(child)}
      </Button>
      <Button
        aria-label={`Remove ${nameForLayer(child)}`}
        className="size-6 rounded-full p-0"
        onClick={handleRemove}
        size="icon"
        variant="ghost"
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </Badge>
  );
}

const nameForLayer = (layer: ComponentLayer) =>
  layer.name || layer.type.replaceAll("_", "");
