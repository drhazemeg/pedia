"use client";

import { Button } from "@pedia/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pedia/ui/components/tooltip";
import AutoFrame from "@pedia/ui/components/ui-builder/internal/canvas/auto-frame";
import { ResizableWrapper } from "@pedia/ui/components/ui-builder/internal/canvas/resizable-wrapper";
import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import { LayerContextMenuPortal } from "@pedia/ui/components/ui-builder/internal/components/layer-context-menu-portal";
import LayerRenderer from "@pedia/ui/components/ui-builder/layer-renderer";
import type {
  ComponentLayer,
  FunctionRegistry,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import {
  DndContextProvider,
  useComponentDragContext,
} from "@pedia/ui/lib/ui-builder/context/dnd-context";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import {
  countLayers,
  useLayerStore,
} from "@pedia/ui/lib/ui-builder/store/layer-store";
import { cn } from "@pedia/ui/lib/utils";
import { Crosshair, MousePointer, Plus, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";

// Static style objects to prevent recreation on every render
const WRAPPER_STYLE = {
  width: "100%",
  height: "100%",
} as const;

const CONTENT_STYLE = {
  width: "100%",
  height: "100%",
} as const;

const TRANSFORM_DIV_STYLE = {
  minHeight: "100vh",
  padding: "50px",
} as const;

const WHEEL_CONFIG = { step: 0.1 } as const;
const DOUBLE_CLICK_CONFIG = { disabled: false } as const;

const ZoomControls: React.FC<{
  onPointerEventsToggle: (enabled: boolean) => void;
  pointerEventsEnabled: boolean;
}> = ({ onPointerEventsToggle, pointerEventsEnabled }) => {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  const handleZoomIn = useCallback(() => zoomIn(), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut(), [zoomOut]);
  const handleReset = useCallback(() => resetTransform(), [resetTransform]);
  const handleTogglePointerEvents = useCallback(() => {
    onPointerEventsToggle(!pointerEventsEnabled);
  }, [onPointerEventsToggle, pointerEventsEnabled]);

  return (
    <TooltipProvider>
      <div className="absolute end-4 bottom-24 z-[1000] flex rounded-full shadow-lg md:bottom-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="border-border size-14 rounded-s-full rounded-e-none border-e md:size-10 [&_svg]:size-7 [&_svg]:md:size-4"
                data-testid="button-ZoomIn"
                onClick={handleZoomIn}
                variant="secondary"
              />
            }
          >
            <span className="sr-only">Zoom in</span>
            <ZoomIn className="text-secondary-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom in</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="border-border size-14 rounded-none border-e md:size-10 [&_svg]:size-7 [&_svg]:md:size-4"
                data-testid="button-ZoomOut"
                onClick={handleZoomOut}
                variant="secondary"
              />
            }
          >
            <span className="sr-only">Zoom out</span>
            <ZoomOut className="text-secondary-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom out</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="border-border size-14 rounded-none border-e md:size-10 [&_svg]:size-7 [&_svg]:md:size-4"
                data-testid="button-Reset"
                onClick={handleReset}
                variant="secondary"
              />
            }
          >
            <span className="sr-only">Reset</span>
            <Crosshair className="text-secondary-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reset zoom and position</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="size-14 rounded-s-none rounded-e-full md:size-10 [&_svg]:size-7 [&_svg]:md:size-4"
                data-testid="button-PointerEvents"
                onClick={handleTogglePointerEvents}
                variant={pointerEventsEnabled ? "default" : "secondary"}
              />
            }
          >
            <span className="sr-only">
              {pointerEventsEnabled
                ? "Disable pointer events"
                : "Enable pointer events"}
            </span>
            <MousePointer
              className={
                pointerEventsEnabled
                  ? "text-primary-foreground"
                  : "text-secondary-foreground"
              }
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>
              {pointerEventsEnabled
                ? "Disable page interaction"
                : "Enable page interaction"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

interface EditorPanelProps {
  className?: string;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ className }) => {
  const {
    selectLayer,
    selectedLayerId,
    findLayerById,
    selectedPageId,
    variables,
  } = useLayerStore();
  const previewMode = useEditorStore((state) => state.previewMode);
  const componentRegistry = useEditorStore((state) => state.registry);
  const functionRegistry = useEditorStore((state) => state.functionRegistry);
  const selectedLayer = findLayerById(selectedLayerId);
  if (!selectedLayer) return null; // or throw, or render empty state
  const selectedPage = findLayerById(selectedPageId);
  if (!selectedPage) return null;

  const onSelectElement = useCallback(
    (layerId: string) => {
      selectLayer(layerId);
    },
    [selectLayer]
  );

  return (
    <DndContextProvider>
      <EditorPanelContent
        autoZoomToSelected={false}
        className={className}
        componentRegistry={componentRegistry}
        functionRegistry={functionRegistry}
        onSelectElement={onSelectElement}
        previewMode={previewMode}
        selectedLayer={selectedLayer}
        selectedLayerId={selectedLayerId}
        selectedPage={selectedPage}
        selectedPageId={selectedPageId}
        variables={variables}
      />
    </DndContextProvider>
  );
};

export default EditorPanel;

interface EditorPanelContentProps {
  className?: string;
  selectedLayerId: string | null;
  selectedPageId: string;
  selectedLayer: ComponentLayer;
  selectedPage: ComponentLayer;
  previewMode: string;
  componentRegistry: any;
  variables: Variable[];
  functionRegistry: FunctionRegistry | undefined;
  autoZoomToSelected?: boolean;
  onSelectElement: (layerId: string) => void;
}

// Inner component that can access ComponentDragContext
const EditorPanelContent: React.FC<EditorPanelContentProps> = ({
  className,
  selectedPageId,
  selectedLayerId,
  selectedLayer,
  selectedPage,
  previewMode,
  componentRegistry,
  variables,
  functionRegistry,
  autoZoomToSelected,
  onSelectElement,
}) => {
  const { isDragging: isComponentDragging } = useComponentDragContext();
  const [resizing, setResizing] = useState(false);
  const [frameSize, setFrameSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 1000,
    height: 1000,
  });
  const [pointerEventsEnabled, setPointerEventsEnabled] = useState(true);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const handleResizingChange = useCallback((isDragging: boolean) => {
    setResizing(isDragging);
  }, []);

  const handleSizeChange = useCallback((width: number, height: number) => {
    setFrameSize({ width, height });
  }, []);

  const handlePointerEventsToggle = useCallback((enabled: boolean) => {
    setPointerEventsEnabled(enabled);
  }, []);

  const layers = selectedPage.children;

  // Memoize totalLayers calculation separately to avoid recalculating on every render
  const totalLayers = useMemo(() => countLayers(layers), [layers]);

  const editorConfig = useMemo(() => {
    return {
      zIndex: 1,
      totalLayers,
      selectedLayer,
      onSelectElement,
    };
  }, [totalLayers, selectedLayer, onSelectElement]);

  const widthClass = useMemo(() => {
    if (previewMode === "responsive") {
      return "w-full";
    }
    if (previewMode === "mobile") {
      return "w-[390px]";
    }
    if (previewMode === "tablet") {
      return "w-[768px]";
    }
    if (previewMode === "desktop") {
      return "w-[1440px]";
    }
    return "w-full";
  }, [previewMode]);

  const heightClass = useMemo(() => {
    if (previewMode === "responsive") {
      return "";
    }
    if (previewMode === "mobile") {
      // iPhone 13 / 14 viewport: 390×844
      return "h-[844px]";
    }
    if (previewMode === "tablet") {
      // iPad portrait viewport: 768×1024
      return "h-[1024px]";
    }
    if (previewMode === "desktop") {
      // MacBook Air 13" viewport: 1440×900
      return "h-[900px]";
    }
    return "h-full";
  }, [previewMode]);

  // Memoize ResizableWrapper props
  const resizableProps = useMemo(() => {
    return {
      isResizable: previewMode === "responsive",
      onDraggingChange: handleResizingChange,
      onSizeChange: handleSizeChange,
    };
  }, [previewMode, handleResizingChange, handleSizeChange]);

  // Memoize AutoFrame props
  const autoFrameProps = useMemo(() => {
    return {
      height: frameSize.height,
      className: cn("shadow-lg", widthClass, heightClass),
      pointerEventsEnabled,
    };
  }, [frameSize.height, widthClass, heightClass, pointerEventsEnabled]);

  // Memoize LayerRenderer props
  const layerRendererProps = useMemo(() => {
    return {
      className: "contents",
      page: selectedPage,
      editorConfig,
      componentRegistry,
      variables,
      functionRegistry,
    };
  }, [
    selectedPage,
    editorConfig,
    componentRegistry,
    variables,
    functionRegistry,
  ]);

  const getPageTypeRenderer = useEditorStore(
    (state) => state.getPageTypeRenderer
  );
  const pageTypeRenderer = useMemo(
    () => getPageTypeRenderer(selectedPage?.pageType ?? ""),
    [getPageTypeRenderer, selectedPage?.pageType]
  );

  const pageTypeRendererProps = useMemo(() => {
    if (!pageTypeRenderer) return null;
    return {
      page: selectedPage,
      componentRegistry,
      editorConfig,
      variables,
      functionRegistry,
    };
  }, [
    pageTypeRenderer,
    selectedPage,
    componentRegistry,
    editorConfig,
    variables,
    functionRegistry,
  ]);

  const renderer = useMemo(() => {
    // When skipAutoFrame is true, the custom renderer owns the full canvas area
    if (pageTypeRenderer?.skipAutoFrame && pageTypeRendererProps) {
      return pageTypeRenderer.renderEditorCanvas(pageTypeRendererProps);
    }

    // Default path: keep AutoFrame + ResizableWrapper
    // Custom renderers that don't skipAutoFrame render inside the same AutoFrame chrome
    const canvasContent =
      pageTypeRenderer && pageTypeRendererProps ? (
        <>
          {pageTypeRenderer.renderEditorCanvas(pageTypeRendererProps)}
          <LayerContextMenuPortal />
        </>
      ) : (
        <>
          <LayerRenderer {...layerRendererProps} />
          <LayerContextMenuPortal />
        </>
      );

    return (
      <ResizableWrapper {...resizableProps}>
        <div
          className={cn("overflow-visible", widthClass)}
          id="editor-panel-content"
        >
          <AutoFrame {...autoFrameProps} ref={frameRef}>
            {canvasContent}
          </AutoFrame>
        </div>
      </ResizableWrapper>
    );
  }, [
    resizableProps,
    widthClass,
    autoFrameProps,
    layerRendererProps,
    pageTypeRenderer,
    pageTypeRendererProps,
  ]);

  // Use static objects for consistent styles (defined outside component would be better)
  const wrapperStyle = WRAPPER_STYLE;
  const contentStyle = CONTENT_STYLE;
  const transformDivStyle = TRANSFORM_DIV_STYLE;
  const wheelConfig = WHEEL_CONFIG;
  const doubleClickConfig = DOUBLE_CLICK_CONFIG;

  // Disable panning when either resizing the viewport OR dragging components
  const panningConfig = useMemo(() => {
    return {
      disabled: resizing || isComponentDragging,
    };
  }, [resizing, isComponentDragging]);

  return (
    <div
      className={cn(
        "relative flex size-full flex-col bg-[radial-gradient(hsl(var(--border))_1px,hsl(var(--primary)/0.05)_1px)] [background-size:16px_16px] bg-fixed will-change-auto",
        className
      )}
      id="editor-panel-container"
    >
      <TransformWrapper
        centerOnInit={false}
        doubleClick={doubleClickConfig}
        initialPositionX={-30}
        initialPositionY={-30}
        initialScale={0.8}
        limitToBounds={false}
        maxScale={5}
        minScale={0.1}
        panning={panningConfig}
        wheel={wheelConfig}
      >
        <ZoomControls
          onPointerEventsToggle={handlePointerEventsToggle}
          pointerEventsEnabled={pointerEventsEnabled}
        />
        {autoZoomToSelected && (
          <AutoZoomToSelected
            autoZoomToSelected={autoZoomToSelected}
            selectedLayerId={selectedLayerId}
          />
        )}
        <TransformComponent
          contentStyle={contentStyle}
          wrapperStyle={wrapperStyle}
        >
          <div
            className={cn("relative", widthClass)}
            data-testid="transform-component"
            style={transformDivStyle}
          >
            {renderer}
          </div>
        </TransformComponent>
      </TransformWrapper>
      <AddComponentsPopover enableDragToCanvas parentLayerId={selectedPageId}>
        <Button
          className="bg-secondary absolute start-4 bottom-4 z-[1000] flex size-14 items-center rounded-full shadow-lg md:size-10 [&_svg]:size-7 [&_svg]:md:size-4"
          size="icon"
          variant="secondary"
        >
          <Plus className="text-secondary-foreground" />
        </Button>
      </AddComponentsPopover>
    </div>
  );
};

/* istanbul ignore next */

// Auto-zoom to selected element component
const AutoZoomToSelected: React.FC<{
  selectedLayerId: string | null;
  autoZoomToSelected: boolean;
}> = ({ selectedLayerId, autoZoomToSelected }) => {
  const { zoomToElement } = useControls();
  const previousSelectedLayerIdRef = useRef<string | null>(null);

  // Zoom to selected element when selection changes
  useEffect(() => {
    if (!selectedLayerId || !zoomToElement || !autoZoomToSelected) return;

    // Only zoom if the selected element is different from the previous one
    if (previousSelectedLayerIdRef.current === selectedLayerId) return;

    // Update the previous selected layer ID
    previousSelectedLayerIdRef.current = selectedLayerId;

    // Small delay to ensure DOM is updated after selection change
    const timeoutId = setTimeout(() => {
      // Try to find the selected element by data attribute or ID
      const selectedElement =
        document.querySelector(`[data-layer-id="${selectedLayerId}"]`) ||
        document.getElementById(`layer-${selectedLayerId}`);

      if (selectedElement) {
        void zoomToElement(selectedElement as HTMLElement, undefined, 300); // 1.5x scale, 300ms animation
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedLayerId, zoomToElement, autoZoomToSelected]);

  return null; // This component doesn't render anything
};
