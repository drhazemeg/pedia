import type {
  ComponentLayer,
  ComponentRegistry,
  PropValue,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import { isVariableReference } from "@pedia/ui/components/ui-builder/types";
import { isPrimitiveComponent } from "@pedia/ui/lib/ui-builder/store/editor-utils";
import { hasLayerChildren } from "@pedia/ui/lib/ui-builder/store/layer-utils";
import {
  resolveChildrenVariableReference,
  resolveVariableReferences,
} from "@pedia/ui/lib/ui-builder/utils/variable-resolver";
import React from "react";

// ============================================================
// Constants
// ============================================================

const EMPTY_VARIABLES: readonly Variable[] = Object.freeze([]);

// ============================================================
// Types
// ============================================================

export interface ServerLayerRendererProps<
  TRegistry extends ComponentRegistry = ComponentRegistry,
> {
  /** Optional CSS class for the root container */
  className?: string;
  /** The ComponentLayer tree to render */
  page: ComponentLayer;
  /** Registry mapping component types to their definitions */
  componentRegistry: TRegistry;
  /** Optional variable definitions */
  variables?: readonly Variable[];
  /** Optional variable values to override defaults */
  variableValues?: Record<string, PropValue>;
}

/** Props always injected onto rendered layer elements for debugging/testing. */
type InjectedLayerProps = {
  "data-layer-id"?: string;
  "data-testid"?: string;
  id?: string;
  children?: React.ReactNode;
};

// ============================================================
// Entry point
// ============================================================

/**
 * ServerLayerRenderer - An SSR-friendly renderer for UI Builder pages.
 *
 * This component renders ComponentLayer trees without any client-side dependencies,
 * making it suitable for use in React Server Components (RSC), Static Site Generation (SSG),
 * and Server-Side Rendering (SSR).
 *
 * Unlike LayerRenderer, this component:
 * - Uses no React hooks
 * - Does not access any Zustand stores
 * - Does not include editor functionality (selection, drag-and-drop)
 * - Is a pure functional component
 *
 * @example
 * ```tsx
 * // In a Next.js Server Component (no "use client" needed)
 * import { ServerLayerRenderer } from '@/components/ui/ui-builder/server-layer-renderer';
 *
 * export default async function Page() {
 *   const page = await fetchPageFromDatabase();
 *   return (
 *     <ServerLayerRenderer
 *       page={page}
 *       componentRegistry={myRegistry}
 *     />
 *   );
 * }
 * ```
 */
export function ServerLayerRenderer<
  TRegistry extends ComponentRegistry = ComponentRegistry,
>({
  className,
  page,
  componentRegistry,
  variables = EMPTY_VARIABLES,
  variableValues,
}: ServerLayerRendererProps<TRegistry>): React.JSX.Element {
  return (
    <div className={className}>
      {renderLayer(page, componentRegistry, variables, variableValues)}
    </div>
  );
}

// ============================================================
// Recursive renderer
// ============================================================

/**
 * Pure recursive function to render a ComponentLayer tree.
 * No hooks, no side effects — suitable for SSR/RSC.
 */
function renderLayer(
  layer: ComponentLayer,
  componentRegistry: ComponentRegistry,
  variables: readonly Variable[],
  variableValues?: Record<string, PropValue>
): React.ReactNode {
  const componentDefinition = componentRegistry[layer.type];

  if (!componentDefinition) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[ServerLayerRenderer] Component definition not found in registry:",
        {
          layerType: layer.type,
          layerId: layer.id,
          layerName: layer.name,
        }
      );
    }
    return null;
  }

  // ── Resolve props ──────────────────────────────────────────────────
  const resolvedProps = resolveVariableReferences(
    layer.props,
    [...variables],
    variableValues
  );

  // Strip internal metadata props (`__function_*`) so they don't leak
  // into the rendered element's DOM attributes.
  const childProps: Record<string, PropValue> = {};
  for (const [key, value] of Object.entries(resolvedProps)) {
    if (!key.startsWith("__function_")) {
      childProps[key] = value;
    }
  }

  // ── Resolve children ───────────────────────────────────────────────
  if (hasLayerChildren(layer) && layer.children.length > 0) {
    childProps.children = layer.children.map((child) => (
      <React.Fragment key={child.id}>
        {renderLayer(child, componentRegistry, variables, variableValues)}
      </React.Fragment>
    ));
  } else if (isVariableReference(layer.children)) {
    childProps.children = resolveChildrenVariableReference(
      layer.children,
      [...variables],
      variableValues
    );
  } else if (typeof layer.children === "string") {
    childProps.children = layer.children;
  }
  // Otherwise: empty children array or undefined → no children prop needed

  // ── Primitive HTML element ─────────────────────────────────────────
  if (isPrimitiveComponent(componentDefinition)) {
    const Tag = layer.type as keyof React.JSX.IntrinsicElements;

    const htmlProps = {
      id: layer.id,
      "data-layer-id": layer.id,
      "data-testid": layer.id,
      ...childProps,
    } as React.HTMLAttributes<HTMLElement> & InjectedLayerProps;

    return React.createElement(Tag, htmlProps);
  }

  // ── Custom component ───────────────────────────────────────────────
  // Registry entries are dynamically typed, so the props shape isn't
  // statically knowable here — cast to a permissive shape.
  const CustomComponent = componentDefinition.component as React.ComponentType<
    Record<string, unknown> & InjectedLayerProps
  >;

  return (
    <CustomComponent
      data-layer-id={layer.id}
      data-testid={layer.id}
      {...childProps}
    />
  );
}

export default ServerLayerRenderer;
