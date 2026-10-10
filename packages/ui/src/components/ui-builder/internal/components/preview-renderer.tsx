// packages/ui/src/components/ui-builder/internal/components/preview-renderer.tsx
//
// A static, editor-free layer renderer used by the component picker to
// draw a visual preview of a component before it's inserted into the
// canvas.
//
// Deliberately does NOT import from `render-utils.tsx`. Doing so would
// recreate the cycle:
//
//   render-utils  →  element-selector  →  layer-menu  →
//   add-component-popover  →  layer-renderer  →  render-utils
//
// The preview path only needs:
//   - the layer tree (component + children)
//   - the registry entry for each layer's type
//   - a way to call React.createElement with the layer's props
//
// It does NOT need:
//   - editorConfig (selection, z-index, drop zones)
//   - ElementSelector / LayerMenu / DropPlaceholder
//   - ErrorBoundary / Suspense / DevProfiler
//   - variable resolution (previews use default props)
//
// The result is ~80 lines instead of ~350, and the module graph stays
// acyclic.

import type {
  ComponentLayer,
  ComponentRegistry,
  PropValue,
} from "@pedia/ui/components/ui-builder/types";
import { isPrimitiveComponent } from "@pedia/ui/lib/ui-builder/store/editor-utils";
import * as React from "react";

export interface PreviewRendererProps {
  page: ComponentLayer;
  componentRegistry: ComponentRegistry;
  className?: string;
}

export function PreviewRenderer({
  page,
  componentRegistry,
  className,
}: PreviewRendererProps) {
  return (
    <div className={className} inert>
      <PreviewLayer layer={page} componentRegistry={componentRegistry} />
    </div>
  );
}

function PreviewLayer({
  layer,
  componentRegistry,
}: {
  layer: ComponentLayer;
  componentRegistry: ComponentRegistry;
}) {
  const definition = componentRegistry[layer.type];
  if (!definition) return null;

  let Component: React.ElementType | undefined = definition.component;
  let isPrimitive = false;
  if (isPrimitiveComponent(definition)) {
    Component = layer.type as keyof React.JSX.IntrinsicElements;
    isPrimitive = true;
  }
  if (!Component) return null;

  const props = filterPreviewProps(layer.props);

  return React.createElement(
    Component,
    {
      ...props,
      ...(isPrimitive ? { key: layer.id } : {}),
      "data-preview-layer": layer.id,
    },
    renderPreviewChildren(layer, componentRegistry)
  );
}

function filterPreviewProps(
  raw: Record<string, PropValue>
): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    // Internal metadata (`__function_*`) is used to trace function
    // bindings in the editor; previews should never see it.
    if (key.startsWith("__function_")) continue;
    out[key] = value;
  }
  return out;
}

function renderPreviewChildren(
  layer: ComponentLayer,
  componentRegistry: ComponentRegistry
): React.ReactNode {
  if (Array.isArray(layer.children)) {
    return layer.children.map((child) => (
      <PreviewLayer
        componentRegistry={componentRegistry}
        key={child.id}
        layer={child}
      />
    ));
  }
  if (typeof layer.children === "string") {
    return layer.children;
  }
  // Variable references are not resolved in previews — the preview shows
  // default content only.
  return null;
}
