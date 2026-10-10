import { buttonVariants } from "@pedia/ui/components/button";
import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import { DevProfiler } from "@pedia/ui/components/ui-builder/internal/components/dev-profiler";
import { DividerControl } from "@pedia/ui/components/ui-builder/internal/components/divider-control";
import {
  TreeRowNode,
  TreeRowPlaceholder,
} from "@pedia/ui/components/ui-builder/internal/components/tree-row-node";
import type { ComponentLayer } from "@pedia/ui/components/ui-builder/types";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import {
  findAllParentLayersRecursive,
  hasLayerChildren,
} from "@pedia/ui/lib/ui-builder/store/layer-utils";
import { isVariableReference } from "@pedia/ui/lib/ui-builder/utils/variable-resolver";
import { cn } from "@pedia/ui/lib/utils";
import isDeepEqual from "fast-deep-equal";
import type { Id } from "he-tree-react";
import { useHeTree } from "he-tree-react";
import { Plus } from "lucide-react";
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface LayersPanelProps {
  className?: string;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const {
    selectedPageId,
    selectedLayerId,
    findLayerById,
    updateLayer,
    selectLayer,
  } = useLayerStore();

  const pageLayer = findLayerById(selectedPageId);

  if (!pageLayer) {
    return null;
  }

  return (
    <LayersTree
      className={className}
      layers={[pageLayer]}
      selectedLayerId={selectedLayerId}
      selectedPageId={selectedPageId}
      selectLayer={selectLayer}
      updateLayer={updateLayer}
    />
  );
};

interface LayersTreeProps {
  className?: string;
  layers: ComponentLayer[];
  selectedPageId: string;
  selectedLayerId: string | null;
  updateLayer: (
    layerId: string,
    newProps: Record<string, any>,
    layerRest?: Partial<Omit<ComponentLayer, "props">>
  ) => void;
  selectLayer: (layerId: string) => void;
}

const findLayerByIdInTree = (
  treeLayers: ComponentLayer[],
  layerId: string
): ComponentLayer | null => {
  for (const layer of treeLayers) {
    if (layer.id === layerId) {
      return layer;
    }
    if (hasLayerChildren(layer)) {
      const found = findLayerByIdInTree(layer.children, layerId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const rebuildLayerFromOriginalTree = (
  layer: ComponentLayer,
  originalLayers: ComponentLayer[]
): ComponentLayer => {
  const originalLayer = findLayerByIdInTree(originalLayers, layer.id) || layer;

  if (!hasLayerChildren(originalLayer)) {
    return originalLayer;
  }

  const rebuiltChildren = hasLayerChildren(layer)
    ? layer.children.map((child) =>
        rebuildLayerFromOriginalTree(child, originalLayers)
      )
    : [];

  return {
    ...originalLayer,
    children: rebuiltChildren,
  };
};

export const LayersTree: React.FC<LayersTreeProps> = React.memo(
  ({
    className,
    layers,
    selectedPageId,
    selectedLayerId,
    updateLayer,
    selectLayer,
  }) => {
    const [openIdsArray, setOpenIdsArray] = useState<Id[]>([]);

    const prevSelectedLayerId = useRef(selectedLayerId);

    const selectedLayerParentIds = useMemo(() => {
      if (!selectedLayerId) {
        return [];
      }

      const parentLayers = findAllParentLayersRecursive(
        layers,
        selectedLayerId
      );
      return parentLayers.map((layer) => layer.id);
    }, [selectedLayerId, layers]);

    const openIds = useMemo(() => {
      const nextOpenIds = new Set(openIdsArray);
      for (const id of selectedLayerParentIds) {
        nextOpenIds.add(id);
      }
      return Array.from(nextOpenIds);
    }, [openIdsArray, selectedLayerParentIds]);

    const handleNodeToggle = useCallback((id: Id, open: boolean) => {
      setOpenIdsArray((prev) => {
        if (open) {
          return prev.includes(id) ? prev : [...prev, id];
        }
        return prev.filter((existingId) => existingId !== id);
      });
    }, []);

    const handleChange = useCallback(
      (newLayers: unknown) => {
        if (Array.isArray(newLayers) && newLayers.length > 0) {
          const updatedPageLayer = newLayers[0] as ComponentLayer;

          // Validate the layer structure before updating
          if (!updatedPageLayer?.id || updatedPageLayer.id !== selectedPageId) {
            console.error(
              "LayersTree onChange: Invalid layer structure - ID mismatch",
              { updatedPageLayer, selectedPageId }
            );
            return;
          }

          const rebuiltPageLayer = rebuildLayerFromOriginalTree(
            updatedPageLayer,
            layers
          );

          const updatedChildren = hasLayerChildren(rebuiltPageLayer)
            ? rebuiltPageLayer.children || []
            : [];

          // Only update if children actually changed
          const currentLayer = layers[0];
          const currentChildren =
            currentLayer && hasLayerChildren(currentLayer)
              ? currentLayer.children || []
              : [];

          if (!isDeepEqual(currentChildren, updatedChildren)) {
            updateLayer(selectedPageId, {}, { children: updatedChildren });
          }
        } else {
          console.error(
            "LayersTree onChange: Invalid newLayers structure received",
            newLayers
          );
        }
      },
      [updateLayer, selectedPageId, layers]
    );

    const handleDragOpen = useCallback(
      (stat: { node: ComponentLayer; id: Id }) => {
        if (hasLayerChildren(stat.node)) {
          handleNodeToggle(stat.id, true);
        }
      },
      [handleNodeToggle]
    );

    const canNodeDrop = useCallback(
      (layer: { node: ComponentLayer }) => {
        const originalNode = findLayerByIdInTree(layers, String(layer.node.id));
        const nodeToCheck = originalNode || layer.node;
        const isDroppable = hasLayerChildren(nodeToCheck);
        return isDroppable;
      },
      [layers]
    );

    const renderNode = useCallback(
      ({ stat, attrs, isPlaceholder }: any) => {
        // Use node.id as key to ensure stable identity across tree operations
        const stableKey = isPlaceholder
          ? `placeholder-${attrs.key}`
          : stat.node.id;

        if (isPlaceholder) {
          return <TreeRowPlaceholder key={stableKey} nodeAttributes={attrs} />;
        }

        const originalNode =
          findLayerByIdInTree(layers, String(stat.node.id)) || stat.node;

        return (
          <TreeRowNode
            draggable={stat.draggable}
            id={stat.id}
            key={stableKey}
            level={stat.level}
            node={originalNode}
            nodeAttributes={attrs}
            onToggle={handleNodeToggle}
            open={stat.open}
            selectedLayerId={selectedLayerId}
            selectLayer={selectLayer}
          />
        );
      },
      [handleNodeToggle, selectedLayerId, selectLayer, layers]
    );

    // Preprocess layers to ensure all nodes appear in tree, even those with string children
    const processedLayers = useMemo(() => {
      const processLayer = (layer: ComponentLayer): ComponentLayer => {
        const processed = { ...layer };

        if (hasLayerChildren(layer)) {
          // Recursively process array children
          processed.children = layer.children.map(processLayer);
        } else if (typeof layer.children === "string") {
          // Convert string children to empty array for tree traversal
          // The actual text content is preserved in the original layer
          processed.children = [];
        } else if (isVariableReference(layer.children)) {
          // Convert variable reference children to empty array for tree traversal
          // The variable binding is preserved in the original layer
          processed.children = [];
        } else if (!layer.children) {
          // Ensure undefined/null children become empty arrays
          processed.children = [];
        }

        return processed;
      };

      return layers.map(processLayer);
    }, [layers]);

    const data = useMemo(() => {
      return {
        data: processedLayers,
        dataType: "tree" as const,
        childrenKey: "children",
        openIds,
        dragOpen: true,
        onChange: handleChange,
        renderNodeBox: renderNode,
        onDragOpen: handleDragOpen,
        canDrop: canNodeDrop,
      };
    }, [
      processedLayers,
      openIds,
      handleChange,
      renderNode,
      handleDragOpen,
      canNodeDrop,
    ]);

    const { renderTree, scrollToNode } = useHeTree<ComponentLayer>(data);

    useLayoutEffect(() => {
      if (prevSelectedLayerId.current !== selectedLayerId) {
        prevSelectedLayerId.current = selectedLayerId;
        if (selectedLayerId) {
          scrollToNode(selectedLayerId);
        }
      }
    }, [scrollToNode, selectedLayerId]);

    const buttonClass = useMemo(
      () =>
        cn(
          buttonVariants({ variant: "default", size: "sm" }),
          "w-full cursor-pointer"
        ),
      []
    );

    return (
      <DevProfiler id="LayersPanel" threshold={40}>
        <div
          className={cn(
            className,
            "flex size-full flex-col overflow-x-auto ps-4"
          )}
          data-testid="layers-tree"
        >
          {layers.length > 0 ? (
            <>
              <DividerControl
                addPosition={0}
                className="border-primary border-s border-dashed"
                parentLayerId={selectedPageId}
              />
              {renderTree()}
              <div className="relative">
                <div className="border-primary bg-background absolute start-0 bottom-0 h-4 w-[1px] border-s border-dashed" />
              </div>
              <DividerControl
                className="border-primary border-s border-dashed"
                parentLayerId={selectedPageId}
              />
            </>
          ) : (
            <AddComponentsPopover
              className="mt-4 w-full"
              parentLayerId={selectedPageId}
            >
              <div className={buttonClass}>
                <span className="sr-only">Add Component</span>
                <Plus className="h-5 w-5" />
                <span>Add Component</span>
              </div>
            </AddComponentsPopover>
          )}
        </div>
      </DevProfiler>
    );
  },
  (prevProps, nextProps) =>
    isDeepEqual(prevProps.layers, nextProps.layers) &&
    prevProps.selectedPageId === nextProps.selectedPageId &&
    prevProps.selectedLayerId === nextProps.selectedLayerId &&
    prevProps.className === nextProps.className
);

LayersTree.displayName = "LayersTree";

export default LayersPanel;
