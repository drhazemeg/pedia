import { DevProfiler } from "@pedia/ui/components/ui-builder/internal/components/dev-profiler";
import { ElementSelector } from "@pedia/ui/components/ui-builder/internal/components/element-selector";
import { ErrorFallback } from "@pedia/ui/components/ui-builder/internal/components/error-fallback";
import { DropPlaceholder } from "@pedia/ui/components/ui-builder/internal/dnd/drop-zone";
import type {
  ComponentLayer,
  ComponentRegistry,
  EditorConfig,
  FunctionRegistry,
  PropValue,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import { isVariableReference } from "@pedia/ui/components/ui-builder/types";
import { useDndContext } from "@pedia/ui/lib/ui-builder/context/dnd-context";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { isPrimitiveComponent } from "@pedia/ui/lib/ui-builder/store/editor-utils";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import {
  canLayerAcceptChildren,
  findLayerRecursive,
  hasLayerChildren,
} from "@pedia/ui/lib/ui-builder/store/layer-utils";
import {
  resolveChildrenVariableReference,
  resolveVariableReferences,
} from "@pedia/ui/lib/ui-builder/utils/variable-resolver";
import isDeepEqual from "fast-deep-equal";
import React, { Fragment, memo, Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
export { type EditorConfig } from "@pedia/ui/components/ui-builder/types";

/**
 * Check if a className string contains a specific class as a whole word.
 * Uses word boundary matching to avoid substring false positives.
 * e.g., hasClass("my-relative-element", "relative") returns false
 *       hasClass("relative flex", "relative") returns true
 */
export function hasClass(className: string, targetClass: string): boolean {
  return className.split(/\s+/).includes(targetClass);
}

/**
 * Tailwind CSS positioning classes that conflict with each other.
 * Only one can be applied at a time - appending another would override the existing one.
 */
const POSITION_CLASSES = [
  "static",
  "fixed",
  "absolute",
  "relative",
  "sticky",
] as const;

/**
 * Check if a className string contains any CSS position class.
 * Used to prevent overriding existing positioning when adding 'relative' for drop zones.
 */
export function hasPositionClass(className: string): boolean {
  const classes = className.split(/\s+/);
  return POSITION_CLASSES.some((posClass) => classes.includes(posClass));
}

// Note: useDndContext has default values defined in dnd-contexts.tsx,
// so it will return { isDragging: false, activeLayerId: null, newComponentType: null, canDropOnLayer: () => false }
// when used outside DndContextProvider. No try-catch needed.

/**
 * Check if a layer is the active dragged layer or a descendant of it.
 * Used to apply visual feedback and disable drop zones inside dragged layers.
 */
/* istanbul ignore next - complex drag state detection, covered by integration tests */
function isLayerBeingDraggedOrDescendant(
  layerId: string,
  activeLayerId: string | null,
  pages: ComponentLayer[] | undefined
): boolean {
  if (!activeLayerId) return false;
  if (layerId === activeLayerId) return true;

  // Safety check for pages
  if (!pages || !Array.isArray(pages) || pages.length === 0) return false;

  // Check if this layer is a descendant of the dragged layer
  const draggedLayer = findLayerRecursive(pages, activeLayerId);
  if (!draggedLayer) return false;

  // Check if this layerId exists within the dragged layer's descendants
  if (hasLayerChildren(draggedLayer)) {
    const foundInDragged = findLayerRecursive([draggedLayer], layerId);
    return !!foundInDragged;
  }

  return false;
}

// EditorConfig is defined in types.ts and re-exported here for convenience

export const RenderLayer: React.FC<{
  layer: ComponentLayer;
  componentRegistry: ComponentRegistry;
  editorConfig?: EditorConfig;
  variables?: Variable[];
  variableValues?: Record<string, PropValue>;
  functionRegistry?: FunctionRegistry;
}> = memo(
  ({
    layer,
    componentRegistry,
    editorConfig,
    variables,
    variableValues,
    functionRegistry,
  }) => {
    const storeVariables = useLayerStore((state) => state.variables);
    const pages = useLayerStore((state) => state.pages);
    const isLayerAPage = useLayerStore((state) => state.isLayerAPage(layer.id));
    const registry = useEditorStore((state) => state.registry);
    const storeFunctionRegistry = useEditorStore(
      (state) => state.functionRegistry
    );
    const dndContext = useDndContext();

    // Use provided functionRegistry or fall back to store functionRegistry
    const effectiveFunctionRegistry = functionRegistry ?? storeFunctionRegistry;

    // Use provided variables or fall back to store variables
    const effectiveVariables = variables || storeVariables;
    const componentDefinition = componentRegistry[layer.type];

    const infoData = useMemo(() => {
      return {
        layerType: layer.type,
        layerId: layer.id,
        layerName: layer.name,
        availableComponents: Object.keys(componentRegistry),
        layer,
      };
    }, [layer, componentRegistry]);

    // Resolve variable references in props with proper memoization
    const resolvedProps = useMemo(
      () =>
        resolveVariableReferences(
          layer.props,
          effectiveVariables,
          variableValues,
          effectiveFunctionRegistry
        ),
      [
        layer.props,
        effectiveVariables,
        variableValues,
        effectiveFunctionRegistry,
      ]
    );

    // Memoize child editor config to avoid creating objects in JSX
    const childEditorConfig = editorConfig
      ? { ...editorConfig, zIndex: editorConfig.zIndex + 1 }
      : undefined;

    // Check if this layer is being dragged or is a descendant of a dragged layer
    const isBeingDragged = useMemo(
      () =>
        isLayerBeingDraggedOrDescendant(
          layer.id,
          dndContext.activeLayerId,
          pages
        ),
      [layer.id, dndContext.activeLayerId, pages]
    );

    // Check if this is the root layer being dragged (not a descendant)
    const isRootDraggedLayer = layer.id === dndContext.activeLayerId;

    // Check if this layer can accept children and if drag is active (must be before early returns)
    const canAcceptChildren = useMemo(
      () => canLayerAcceptChildren(layer, registry),
      [layer, registry]
    );

    // Don't show drop zones inside the layer being dragged or its descendants
    const showDropZones = useMemo(
      () =>
        editorConfig &&
        dndContext.isDragging &&
        canAcceptChildren &&
        !isBeingDragged,
      [editorConfig, dndContext.isDragging, canAcceptChildren, isBeingDragged]
    );

    // Compute childProps with 'relative' class included when showDropZones is active
    // This must be recomputed when showDropZones changes to avoid stale className mutations
    const baseChildProps: Record<string, PropValue> = useMemo(() => {
      // Filter out internal metadata props (e.g., __function_onClick, __function_onSubmit)
      // These are used internally for tracking function bindings but should not be passed to components
      const props: Record<string, PropValue> = {};
      for (const [key, value] of Object.entries(resolvedProps)) {
        if (!key.startsWith("__function_")) {
          props[key] = value;
        }
      }

      // CRITICAL: Add position:relative to parent when showing drop zones
      // This ensures absolutely positioned DropPlaceholders position correctly
      // We check hasLayerChildren to only apply to containers that will have drop zones
      if (showDropZones && hasLayerChildren(layer)) {
        const existingClassName = (props.className as string) || "";
        // Only add 'relative' if no position class is already present
        // Adding 'relative' when 'absolute', 'fixed', or 'sticky' exists would override them
        // due to Tailwind's class order precedence, breaking the intended layout
        if (!hasPositionClass(existingClassName)) {
          props.className = existingClassName
            ? `${existingClassName} relative`
            : "relative";
        }
      }

      return props;
    }, [resolvedProps, showDropZones, layer]);
    let childProps = baseChildProps;

    if (!componentDefinition) {
      console.error(
        "[UIBuilder] Component definition not found in registry:",
        infoData
      );
      return null;
    }

    let Component: React.ElementType | undefined =
      componentDefinition.component;
    let isPrimitive = false;
    if (isPrimitiveComponent(componentDefinition)) {
      Component = layer.type as keyof React.JSX.IntrinsicElements;
      isPrimitive = true;
    }

    if (!Component) return null;

    // Handle children rendering with improved drop zones
    if (hasLayerChildren(layer) && layer.children.length > 0) {
      const childElements = layer.children.map((child, index) => {
        const childElement = (
          <RenderLayer
            componentRegistry={componentRegistry}
            editorConfig={childEditorConfig}
            functionRegistry={functionRegistry}
            key={child.id}
            layer={child}
            variables={variables}
            variableValues={variableValues}
          />
        );

        // CRITICAL FIX: Use Fragment to render drop placeholders as siblings
        // This prevents wrapper divs from breaking flex/grid layouts
        // The DropPlaceholder calculates its position based on its next sibling
        if (showDropZones) {
          return (
            <Fragment key={child.id}>
              <DropPlaceholder
                isActive={true}
                parentId={layer.id}
                position={index}
              />
              {childElement}
            </Fragment>
          );
        }

        return childElement;
      });

      // Add drop zone after the last child (no wrapper needed)
      if (showDropZones) {
        childElements.push(
          <DropPlaceholder
            isActive={true}
            key={`drop-${layer.id}-${layer.children.length}`}
            parentId={layer.id}
            position={layer.children.length}
          />
        );
      }

      childProps = { ...baseChildProps, children: childElements };
    } else if (isVariableReference(layer.children)) {
      // Resolve variable reference for children
      const resolvedChildren = resolveChildrenVariableReference(
        layer.children,
        effectiveVariables,
        variableValues
      );
      childProps = { ...baseChildProps, children: resolvedChildren };
    } else if (typeof layer.children === "string") {
      childProps = { ...baseChildProps, children: layer.children };
    } else if (showDropZones && hasLayerChildren(layer)) {
      // Show drop zone for empty containers
      // Note: position:relative is already added via useMemo when showDropZones is true
      // Add min-height so empty containers are droppable
      childProps = {
        ...baseChildProps,
        children: (
          <div className="min-h-[2rem] w-full">
            <DropPlaceholder isActive={true} parentId={layer.id} position={0} />
          </div>
        ),
      };
    }

    const RenderComponent = Component as React.ElementType<any>;
    const componentElement = React.createElement(RenderComponent, {
      ...(isPrimitive ? { id: layer.id } : {}),
      "data-testid": layer.id,
      "data-layer-id": layer.id,
      ...childProps,
    } as any);
    const WrappedComponent = isPrimitive ? (
      componentElement
    ) : (
      <ErrorSuspenseWrapper id={layer.id} key={layer.id}>
        {componentElement}
      </ErrorSuspenseWrapper>
    );

    // Apply visual feedback for dragged layer (only on root dragged layer, not descendants)
    const DragFeedbackWrapper = isRootDraggedLayer ? (
      <div
        className="pointer-events-none relative opacity-50"
        data-dragging="true"
      >
        {/* Blue overlay to indicate dragging */}
        <div className="bg-primary/20 pointer-events-none absolute inset-0 z-10 rounded" />
        {WrappedComponent}
      </div>
    ) : (
      WrappedComponent
    );

    if (!editorConfig) {
      return DragFeedbackWrapper;
    }

    // Components with skipEditorWrapper render without the ElementSelector overlay.
    // This is required for structural HTML elements (<html>, <head>, <body>) that
    // cannot legally be children of the <span> MeasureRange uses internally.
    // These layers are still accessible via the layer tree panel.
    if (componentDefinition?.skipEditorWrapper) {
      return (
        <DevProfiler id={layer.type} threshold={20}>
          {DragFeedbackWrapper}
        </DevProfiler>
      );
    }

    const { zIndex, totalLayers, selectedLayer, onSelectElement } =
      editorConfig;

    return (
      <DevProfiler id={layer.type} threshold={20}>
        <ElementSelector
          isPageLayer={isLayerAPage}
          isSelected={layer.id === selectedLayer?.id}
          key={layer.id}
          layer={layer}
          onSelectElement={onSelectElement}
          totalLayers={totalLayers}
          zIndex={zIndex}
        >
          {DragFeedbackWrapper}
        </ElementSelector>
      </DevProfiler>
    );
  },
  (prevProps, nextProps) => {
    if (nextProps.editorConfig?.parentUpdated) {
      return false;
    }
    const editorConfigEqual = isDeepEqual(
      prevProps.editorConfig?.selectedLayer?.id,
      nextProps.editorConfig?.selectedLayer?.id
    );
    const layerEqual = isDeepEqual(prevProps.layer, nextProps.layer);
    const variablesEqual = isDeepEqual(
      prevProps.variables,
      nextProps.variables
    );
    const variableValuesEqual = isDeepEqual(
      prevProps.variableValues,
      nextProps.variableValues
    );
    // Note: We don't deep compare functionRegistry as it's expected to be stable
    // and comparing function references would be problematic
    const functionRegistryEqual =
      prevProps.functionRegistry === nextProps.functionRegistry;
    return (
      editorConfigEqual &&
      layerEqual &&
      variablesEqual &&
      variableValuesEqual &&
      functionRegistryEqual
    );
  }
);

RenderLayer.displayName = "RenderLayer";

const ErrorSuspenseWrapper: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ children }) => {
  const loadingFallback = useMemo(() => <LoadingComponent />, []);

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
};

const LoadingComponent: React.FC = () => <div>Loading...</div>;
