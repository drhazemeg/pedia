import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@pedia/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pedia/ui/components/tabs";
import { DraggableNewComponent } from "@pedia/ui/components/ui-builder/internal/dnd/draggable-new-component";
import type {
  BlockDefinition,
  ComponentLayer,
  ComponentRegistry,
} from "@pedia/ui/components/ui-builder/types";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { createComponentLayer } from "@pedia/ui/lib/ui-builder/store/layer-utils";
import { cn } from "@pedia/ui/lib/utils";
import type { ReactNode } from "react";
import React, {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { PreviewRenderer } from "./preview-renderer";

const fallback = (
  <div className="bg-muted h-full w-full animate-pulse rounded border" />
);

// Cache for preview layers to avoid recreation
const previewLayerCache = new Map<string, ComponentLayer>();

/**
 * Check if a component can be added as a child of the given parent type.
 * A component is valid if:
 * - It has no `childOf` constraint (can be added anywhere)
 * - OR its `childOf` array includes the parent type
 */
function isValidChildOfParent(
  componentRegistry: ComponentRegistry,
  componentType: string,
  parentType: string | undefined
): boolean {
  const def = componentRegistry[componentType];
  if (!def?.childOf) {
    // No constraint - can be added anywhere
    return true;
  }
  if (!parentType) {
    // Component has childOf but no parent type provided - hide it
    return false;
  }
  return def.childOf.includes(parentType);
}

/**
 * Check if a component requires a parent context to render properly.
 * Components with childOf defined are child-only components.
 */
function isChildOnlyComponent(
  componentRegistry: ComponentRegistry,
  componentType: string
): boolean {
  const def = componentRegistry[componentType];
  return Boolean(def?.childOf);
}

type AddComponentsPopoverProps = {
  className?: string;
  children: ReactNode;
  addPosition?: number;
  parentLayerId: string;
  onOpenChange?: (open: boolean) => void;
  /**
   * Enable drag handles on component items.
   * When true, items can be dragged to the canvas.
   * Default: false (for tree panel usage)
   */
  enableDragToCanvas?: boolean;
  onChange?: ({
    layerType,
    parentLayerId,
    addPosition,
  }: {
    layerType: string;
    parentLayerId: string;
    addPosition?: number;
  }) => void;
};

export function AddComponentsPopover({
  className,
  children,
  addPosition,
  parentLayerId,
  onOpenChange,
  enableDragToCanvas = false,
  onChange,
}: AddComponentsPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<"components" | "blocks">(
    "components"
  );

  const blocks = useEditorStore((state) => state.blocks);
  const getFilteredRegistry = useEditorStore(
    (state) => state.getFilteredRegistry
  );
  // const _registry = useEditorStore((state) => state.registry);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const selectedPageId = useLayerStore((state) => state.selectedPageId);

  // Get the page type for the active page so filterRegistry can be applied
  const activePageType = useMemo(() => {
    const page = findLayerById(selectedPageId);
    return page?.pageType;
  }, [findLayerById, selectedPageId]);

  // Apply per-page-type registry filtering.
  // `registry` is included as a dependency so this recomputes if the store's
  // registry changes — `getFilteredRegistry` reads it internally via get() but
  // is itself a stable function reference that would not trigger recomputation.
  const componentRegistry = useMemo(
    () => getFilteredRegistry(activePageType),
    [getFilteredRegistry, activePageType]
  );

  // Get the parent layer type to filter valid child components
  const parentLayerType = useMemo(() => {
    const parentLayer = findLayerById(parentLayerId);
    return parentLayer?.type;
  }, [findLayerById, parentLayerId]);

  const groupedOptions = useMemo(() => {
    const componentOptions = Object.keys(componentRegistry)
      // Filter to only show components that are valid children of the parent
      .filter((name) =>
        isValidChildOfParent(componentRegistry, name, parentLayerType)
      )
      .map((name) => {
        return {
          value: name,
          label: name,
          type: "component",
          from: componentRegistry[name]?.from,
        };
      });
    return componentOptions.reduce(
      (acc, option) => {
        const fromRoot = option.from?.split("/").slice(0, -1).join("/"); // removes file name from path

        const group = fromRoot || "other";
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group]?.push(option);
        return acc;
      },
      {} as Record<string, typeof componentOptions>
    );
  }, [componentRegistry, parentLayerType]);

  // Get categories for tabs
  const categories = useMemo(
    () => Object.keys(groupedOptions),
    [groupedOptions]
  );

  // Group blocks by category
  const groupedBlocks = useMemo(() => {
    if (!blocks) return {};
    return Object.values(blocks).reduce<Record<string, BlockDefinition[]>>(
      (acc, block: BlockDefinition) => {
        if (!acc[block.category]) {
          acc[block.category] = [];
        }
        acc[block.category]?.push(block);
        return acc;
      },
      {}
    );
  }, [blocks]);

  const blockCategories = useMemo(
    () => Object.keys(groupedBlocks),
    [groupedBlocks]
  );

  const hasBlocks = blocks && Object.keys(blocks).length > 0;

  const addComponentLayer = useLayerStore((state) => state.addComponentLayer);
  const addLayerDirect = useLayerStore((state) => state.addLayerDirect);

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      if (onChange) {
        onChange({
          layerType: currentValue,
          parentLayerId,
          addPosition,
        });
      } else if (componentRegistry[currentValue]) {
        addComponentLayer(currentValue, parentLayerId, addPosition);
      }
      setOpen(false);
      onOpenChange?.(false);
    },
    [
      addComponentLayer,
      parentLayerId,
      addPosition,
      onOpenChange,
      onChange,
      componentRegistry,
    ]
  );

  const handleBlockSelect = React.useCallback(
    (block: BlockDefinition) => {
      // Clone the template with new unique IDs
      const clonedTemplate = cloneLayerWithNewIds(block.template);
      addLayerDirect(clonedTemplate, parentLayerId, addPosition);
      setOpen(false);
      onOpenChange?.(false);
    },
    [addLayerDirect, parentLayerId, addPosition, onOpenChange]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange]
  );

  // Close popover when drag starts
  const handleDragStart = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const defaultTab = categories[0] || "";
  const defaultBlockCategory = blockCategories[0] || "";

  return (
    <div className={cn("relative flex justify-center", className)}>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger>{children}</PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] p-0">
          {/* Top-level toggle between Components and Blocks */}
          {hasBlocks && (
            <div className="flex border-b">
              <button
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeView === "components"
                    ? "border-primary bg-background border-b-2"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveView("components")}
                type="button"
              >
                Components
              </button>
              <button
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeView === "blocks"
                    ? "border-primary bg-background border-b-2"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveView("blocks")}
                type="button"
              >
                Blocks
              </button>
            </div>
          )}

          {/* Components View */}
          {activeView === "components" && categories.length > 0 ? (
            <Tabs className="w-full" defaultValue={defaultTab}>
              <TabsList
                className={cn(
                  categories.length > 1
                    ? "flex h-14 w-full flex-row justify-start overflow-x-scroll rounded-none border-b"
                    : "hidden"
                )}
              >
                {categories.map((category) => (
                  <TabsTrigger
                    className="flex min-h-11 min-w-24 shrink-0 flex-col items-start justify-start overflow-hidden px-2 py-1"
                    key={category}
                    value={category}
                  >
                    <div className="text-sm">
                      {formatCategoryName(category)}
                    </div>
                    <div className="text-muted-foreground min-h-[12px] w-full text-start text-[8px] leading-[9px] text-wrap">
                      {category}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent className="m-0" key={category} value={category}>
                  <Command className="border-0">
                    <div className="flex w-full items-center px-3 [&>div:first-child]:w-full">
                      <CommandInput
                        className="w-full border-0 focus:ring-0"
                        placeholder="Find components"
                      />
                    </div>
                    <CommandList className="max-h-[250px]">
                      <CommandEmpty>No components found</CommandEmpty>
                      <CommandGroup>
                        {groupedOptions[category]?.map((component) => (
                          <GroupedComponentItem
                            component={component}
                            componentRegistry={componentRegistry}
                            enableDrag={enableDragToCanvas}
                            key={component.value}
                            onClick={handleSelect}
                            onDragStart={handleDragStart}
                          />
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>
              ))}
            </Tabs>
          ) : activeView === "components" ? (
            <Command>
              <CommandInput placeholder="Add component" />
              <CommandList>
                <CommandEmpty>No components found</CommandEmpty>
              </CommandList>
            </Command>
          ) : null}

          {/* Blocks View */}
          {activeView === "blocks" && hasBlocks && (
            <Tabs className="w-full" defaultValue={defaultBlockCategory}>
              <TabsList className="flex h-14 w-full flex-row justify-start overflow-x-scroll rounded-none border-b">
                {blockCategories.map((category) => (
                  <TabsTrigger
                    className="flex min-h-11 min-w-24 shrink-0 flex-col items-start justify-start overflow-hidden px-2 py-1"
                    key={category}
                    value={category}
                  >
                    <div className="text-sm">
                      {formatCategoryName(category)}
                    </div>
                    <div className="text-muted-foreground min-h-[12px] w-full text-start text-[8px] leading-[9px]">
                      {groupedBlocks[category]?.length} blocks
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {blockCategories.map((category) => (
                <TabsContent className="m-0" key={category} value={category}>
                  <Command className="border-0">
                    <div className="flex w-full items-center px-3 [&>div:first-child]:w-full">
                      <CommandInput
                        className="w-full border-0 focus:ring-0"
                        placeholder="Find blocks"
                      />
                    </div>
                    <CommandList className="max-h-[250px]">
                      <CommandEmpty>No blocks found</CommandEmpty>
                      <CommandGroup>
                        {groupedBlocks[category]?.map((block) => (
                          <BlockItem
                            block={block}
                            key={block.name}
                            onClick={handleBlockSelect}
                          />
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Clone a layer tree with new unique IDs
 */
function cloneLayerWithNewIds(layer: ComponentLayer): ComponentLayer {
  const newId = generateUniqueId();

  let newChildren: ComponentLayer["children"];

  if (Array.isArray(layer.children)) {
    newChildren = layer.children.map((child) => cloneLayerWithNewIds(child));
  } else if (typeof layer.children === "string") {
    newChildren = layer.children;
  } else if (
    layer.children &&
    typeof layer.children === "object" &&
    "__variableRef" in layer.children
  ) {
    // Handle VariableReference - keep as-is
    newChildren = layer.children;
  } else {
    newChildren = layer.children;
  }

  return {
    ...layer,
    id: newId,
    children: newChildren,
  };
}

/**
 * Generate a simple unique ID
 */
function generateUniqueId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Block item component for the blocks list
 */
const BlockItem = memo(
  ({
    block,
    onClick,
  }: {
    block: BlockDefinition;
    onClick: (block: BlockDefinition) => void;
  }) => {
    const handleSelect = useCallback(() => {
      onClick(block);
    }, [onClick, block]);

    return (
      <CommandItem
        className="flex cursor-pointer flex-col items-start gap-1 py-3"
        onSelect={handleSelect}
      >
        <div className="font-medium">{formatBlockName(block.name)}</div>
        {block.description && (
          <div className="text-muted-foreground line-clamp-2 text-xs">
            {block.description}
          </div>
        )}
      </CommandItem>
    );
  }
);

BlockItem.displayName = "BlockItem";

/**
 * Format block name for display (e.g., "login-01" -> "Login 01")
 */
function formatBlockName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const GroupedComponentItem = memo(
  ({
    component,
    componentRegistry,
    onClick,
    onDragStart,
    enableDrag = false,
  }: {
    component: { value: string; label: string };
    componentRegistry: ComponentRegistry;
    onClick: (value: string) => void;
    onDragStart?: () => void;
    enableDrag?: boolean;
  }) => {
    const handleSelect = useCallback(() => {
      onClick(component.value);
    }, [onClick, component.value]);

    const content = (
      <div className="flex items-center gap-3">
        {/* Component preview */}
        <div className="h-6 w-10 shrink-0 overflow-hidden">
          <LazyComponentPreview
            componentRegistry={componentRegistry}
            componentType={component.value}
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center">
          <span className="truncate">{component.label}</span>
        </div>
      </div>
    );

    return (
      <CommandItem
        className="flex cursor-pointer items-center gap-2 py-2"
        key={component.value}
        onSelect={handleSelect}
      >
        {enableDrag ? (
          <DraggableNewComponent
            className="flex-1"
            componentType={component.value}
            onDragStart={onDragStart}
          >
            {content}
          </DraggableNewComponent>
        ) : (
          <div className="flex-1">{content}</div>
        )}
      </CommandItem>
    );
  }
);

GroupedComponentItem.displayName = "GroupedComponentItem";

const LazyComponentPreview = memo(
  ({
    componentType,
    componentRegistry,
  }: {
    componentType: string;
    componentRegistry: ComponentRegistry;
  }) => {
    const [shouldLoad, setShouldLoad] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const element = ref.current;
      if (!element) return;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            // Delay loading slightly to improve tab switching performance
            timeoutId = setTimeout(() => setShouldLoad(true), 50);
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(element);
      return () => {
        observer.disconnect();
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };
    }, []);

    return (
      <div className="h-full w-full" ref={ref}>
        {shouldLoad ? (
          <Suspense fallback={fallback}>
            <ComponentPreview
              componentRegistry={componentRegistry}
              componentType={componentType}
            />
          </Suspense>
        ) : (
          <div className="bg-muted h-full w-full rounded border" />
        )}
      </div>
    );
  }
);

LazyComponentPreview.displayName = "LazyComponentPreview";

/* istanbul ignore next */

/**
 * Placeholder for child-only components that can't render without parent context
 */
const ChildOnlyPlaceholder = memo(
  ({ componentType }: { componentType: string }) => {
    // Get first letter or first two letters for better recognition
    const initials = componentType
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("");

    return (
      <div className="bg-muted/50 flex h-full w-full items-center justify-center rounded border border-dashed">
        <span className="text-muted-foreground text-[8px] font-medium">
          {initials}
        </span>
      </div>
    );
  }
);

ChildOnlyPlaceholder.displayName = "ChildOnlyPlaceholder";

const ComponentPreview = memo(
  ({
    componentType,
    componentRegistry,
  }: {
    componentType: string;
    componentRegistry: ComponentRegistry;
  }) => {
    const isChildOnly = isChildOnlyComponent(componentRegistry, componentType);

    // useMemo must be called unconditionally to follow React's Rules of Hooks
    const previewLayer = useMemo(() => {
      // Skip creating layer for child-only components
      if (isChildOnly) {
        return null;
      }

      // Check cache first
      const cacheKey = `${componentType}-${JSON.stringify(componentRegistry[componentType]?.schema)}`;
      if (previewLayerCache.has(cacheKey)) {
        return previewLayerCache.get(cacheKey);
      }

      try {
        // Use the utility function to create the preview layer
        const layer = createComponentLayer(componentType, componentRegistry, {
          id: `preview-${componentType}`, // Use stable ID for previews
        });

        // Cache the layer
        previewLayerCache.set(cacheKey, layer);
        return layer;
      } catch (error) {
        console.warn(
          `Failed to create preview for component ${componentType}:`,
          error
        );
        return null;
      }
    }, [componentType, componentRegistry, isChildOnly]);

    // Render child-only placeholder after hooks are called
    if (isChildOnly) {
      return <ChildOnlyPlaceholder componentType={componentType} />;
    }

    if (!previewLayer) {
      return <div className="bg-muted h-full w-full rounded border" />;
    }

    const style = { width: "200%", height: "200%" } as const;

    return (
      <div
        className="origin-top-start bg-background pointer-events-none h-full w-full scale-50 transform overflow-hidden rounded border"
        // inert prevents all interactions and stops internal components (like poppers)
        // from attaching scroll listeners that interfere with parent scroll
        inert={true}
        style={style}
      >
        <PreviewRenderer
          className="pointer-events-none"
          componentRegistry={componentRegistry}
          page={previewLayer}
        />
      </div>
    );
  }
);

ComponentPreview.displayName = "ComponentPreview";

// @components/ui/ui-builder becomes Components UI Builder
function formatCategoryName(name: string) {
  const words = name.split("/");
  const lastWord = words.at(-1);
  return (
    lastWord
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) ?? ""
  );
}
