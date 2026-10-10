"use client";

import { DragOverlay } from "@dnd-kit/core";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import type React from "react";
import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// External store: tracks the mount target for the drag overlay.
// Subscribes to DOM mutations so the value updates if the editor panel
// or transform container is added/removed after mount.
// ---------------------------------------------------------------------------

const SELECTOR = '[data-testid="transform-component"]';
const FALLBACK_ID = "editor-panel-content";

const OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 9999,
};

const noop = () => {
  // SSR has no DOM to observe; intentionally empty.
};

function getMountNode(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLElement>(SELECTOR) ??
    document.querySelector(`#${FALLBACK_ID}`)
  );
}

function subscribe(callback: () => void): () => void {
  if (typeof document === "undefined") return noop;

  const observer = new MutationObserver(callback);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-testid", "id"],
  });
  return () => observer.disconnect();
}

// ---------------------------------------------------------------------------

export const TransformAwareDragOverlay: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const mountNode = useSyncExternalStore(
    subscribe,
    getMountNode,
    () => null // SSR snapshot
  );

  if (!mountNode) {
    return <DragOverlay dropAnimation={null}>{children}</DragOverlay>;
  }

  return createPortal(
    <div style={OVERLAY_STYLE}>
      <DragOverlay dropAnimation={null}>{children}</DragOverlay>
    </div>,
    mountNode
  );
};

interface DragOverlayContentProps {
  layerId?: string;
  componentType?: string;
}

/* istanbul ignore next */
export const DragOverlayContent: React.FC<DragOverlayContentProps> = ({
  layerId,
  componentType,
}) => {
  const layer = useLayerStore((state) =>
    layerId ? state.findLayerById(layerId) : null
  );

  if (!layer && !componentType) return null;

  const displayName =
    layer?.name || layer?.type || componentType || "Component";

  return (
    <div className="border-primary/50 pointer-events-none mt-10 min-w-fit rounded-lg border-2 bg-white px-3 py-2 text-sm font-medium text-nowrap opacity-90 shadow-lg dark:bg-gray-800">
      {displayName}
    </div>
  );
};
