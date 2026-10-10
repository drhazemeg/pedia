"use client";

import type { VirtualElement } from "@floating-ui/react";
import {
  flip,
  limitShift,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useFrame } from "@pedia/ui/components/ui-builder/internal/canvas/auto-frame";
import { AddComponentsPopover } from "@pedia/ui/components/ui-builder/internal/components/add-component-popover";
import { useDndContext } from "@pedia/ui/lib/ui-builder/context/dnd-context";
import { useGlobalLayerActions } from "@pedia/ui/lib/ui-builder/hooks/use-layer-actions";
import { SHORTCUTS } from "@pedia/ui/lib/ui-builder/shortcuts/shortcut-registry";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { canComponentAcceptChildren } from "@pedia/ui/lib/ui-builder/store/schema-utils";
import { canPasteLayer } from "@pedia/ui/lib/ui-builder/utils/paste-validation";
import { cn } from "@pedia/ui/lib/utils";
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  Plus,
  Scissors,
  Trash,
} from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

/**
 * Global context menu portal that renders at mouse position INSIDE the iframe.
 * This component should be rendered inside the AutoFrame/iframe context.
 * It subscribes to context menu state from editor-store and renders
 * a menu at the captured mouse coordinates using floating-ui for smart positioning.
 */
export const LayerContextMenuPortal: React.FC = () => {
  const contextMenu = useEditorStore((state) => state.contextMenu);
  const closeContextMenu = useEditorStore((state) => state.closeContextMenu);
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const { isDragging } = useDndContext();

  // Client-only gate via useSyncExternalStore — no effect, no extra render,
  // no `react(set-state-in-effect)` warning.
  const mounted = useSyncExternalStore(
    () => () => {
      "";
    },
    () => true,
    () => false
  );

  // Track the layer ID that the context menu was opened for
  const contextMenuLayerIdRef = useRef<string | null>(null);

  // Local ref that mirrors floating-ui's `refs.floating`.
  // Reading `floatingRef.current` is safe from oxlint's `react/refs` rule;
  // reading `refs.floating.current` (a third-party ref) is not understood by it.
  const floatingRef = useRef<HTMLDivElement | null>(null);

  // Get iframe context - if we're inside an iframe, we'll render there
  const frameContext = useFrame();

  // Use floating-ui for smart positioning with boundary detection
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [
      offset(2), // Small offset from cursor
      flip({
        fallbackPlacements: ["top-start", "bottom-end", "top-end"],
        padding: 8,
      }),
      shift({
        crossAxis: true,
        limiter: limitShift(),
        padding: 8,
      }),
    ],
  });

  // Merge floating-ui's setFloating with our local ref
  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      floatingRef.current = node;
      refs.setFloating(node);
    },
    [refs]
  );

  // Update the virtual reference position when context menu coordinates change
  useEffect(() => {
    if (!contextMenu.open) return;

    const virtualReference: VirtualElement = {
      getBoundingClientRect: () => {
        return {
          x: contextMenu.x,
          y: contextMenu.y,
          width: 0,
          height: 0,
          top: contextMenu.y,
          left: contextMenu.x,
          right: contextMenu.x,
          bottom: contextMenu.y,
        };
      },
    };

    refs.setPositionReference(virtualReference);
  }, [contextMenu.open, contextMenu.x, contextMenu.y, refs]);

  // Track which layer the context menu was opened for
  useEffect(() => {
    if (contextMenu.open && contextMenu.layerId) {
      contextMenuLayerIdRef.current = contextMenu.layerId;
    } else {
      contextMenuLayerIdRef.current = null;
    }
  }, [contextMenu.open, contextMenu.layerId]);

  // Close menu when a different layer is selected
  useEffect(() => {
    if (
      contextMenu.open &&
      contextMenuLayerIdRef.current &&
      selectedLayerId !== contextMenuLayerIdRef.current
    ) {
      closeContextMenu();
    }
  }, [selectedLayerId, contextMenu.open, closeContextMenu]);

  // Close menu when drag starts
  useEffect(() => {
    if (isDragging && contextMenu.open) {
      closeContextMenu();
    }
  }, [isDragging, contextMenu.open, closeContextMenu]);

  // Handle click outside to close menu
  useEffect(() => {
    if (!contextMenu.open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const floatingEl = floatingRef.current;
      if (floatingEl && !floatingEl.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleContextMenuOutside = (e: MouseEvent) => {
      const floatingEl = floatingRef.current;
      if (floatingEl && !floatingEl.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const targetDoc = frameContext.document ?? document;

    targetDoc.addEventListener("mousedown", handleClickOutside);
    targetDoc.addEventListener("contextmenu", handleContextMenuOutside);

    return () => {
      targetDoc.removeEventListener("mousedown", handleClickOutside);
      targetDoc.removeEventListener("contextmenu", handleContextMenuOutside);
    };
  }, [contextMenu.open, closeContextMenu, frameContext.document]);

  // Handle escape key to close menu
  useEffect(() => {
    if (!contextMenu.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    };

    const targetDoc = frameContext.document ?? document;

    targetDoc.addEventListener("keydown", handleKeyDown);
    return () => targetDoc.removeEventListener("keydown", handleKeyDown);
  }, [contextMenu.open, closeContextMenu, frameContext.document]);

  if (!mounted || !contextMenu.open || !contextMenu.layerId) {
    return null;
  }

  // Determine where to render the portal
  const portalTarget = frameContext.document?.body ?? document.body;

  const menuContent = (
    <div
      className="fade-in-0 zoom-in-95 animate-in bg-popover text-popover-foreground z-[10000] min-w-[14rem] overflow-hidden rounded-md border p-1 shadow-md"
      data-testid="layer-context-menu-portal"
      ref={setFloatingRef}
      style={floatingStyles}
    >
      <ContextMenuPortalItems
        layerId={contextMenu.layerId}
        onAction={closeContextMenu}
      />
    </div>
  );

  return createPortal(menuContent, portalTarget);
};

interface ContextMenuPortalItemsProps {
  layerId: string;
  onAction: () => void;
}

/**
 * Menu items for the context menu portal.
 */
const ContextMenuPortalItems: React.FC<ContextMenuPortalItemsProps> = ({
  layerId,
  onAction,
}) => {
  const selectedLayer = useLayerStore((state) => state.findLayerById(layerId));
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const componentRegistry = useEditorStore((state) => state.registry);

  const clipboardLayer = useEditorStore((state) => state.clipboard.layer);

  const {
    canDuplicate,
    canDelete,
    canCut,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleDuplicate,
  } = useGlobalLayerActions(layerId);

  const canPaste = useMemo(() => {
    if (!clipboardLayer || !selectedLayer) return false;
    return canPasteLayer(
      clipboardLayer,
      layerId,
      componentRegistry,
      findLayerById
    );
  }, [
    clipboardLayer,
    layerId,
    componentRegistry,
    findLayerById,
    selectedLayer,
  ]);

  const canRenderAddChild = useMemo(() => {
    if (!selectedLayer) return false;

    const componentDef = componentRegistry[selectedLayer.type];
    if (!componentDef) return false;

    return canComponentAcceptChildren(componentDef.schema);
  }, [selectedLayer, componentRegistry]);

  const handleCopyClick = useCallback(() => {
    handleCopy();
    onAction();
  }, [handleCopy, onAction]);

  const handleCutClick = useCallback(() => {
    handleCut();
    onAction();
  }, [handleCut, onAction]);

  const handlePasteClick = useCallback(() => {
    handlePaste();
    onAction();
  }, [handlePaste, onAction]);

  const handleDuplicateClick = useCallback(() => {
    handleDuplicate();
    onAction();
  }, [handleDuplicate, onAction]);

  const handleDeleteClick = useCallback(() => {
    handleDelete();
    onAction();
  }, [handleDelete, onAction]);

  return (
    <>
      {canRenderAddChild && (
        <>
          <AddComponentsPopover parentLayerId={layerId}>
            <MenuItem onClick={(e) => e.stopPropagation()}>
              <Plus className="me-2 h-4 w-4" />
              Add Child
            </MenuItem>
          </AddComponentsPopover>
          <MenuSeparator />
        </>
      )}

      <MenuItem onClick={handleCopyClick}>
        <Copy className="me-2 h-4 w-4" />
        Copy
        <MenuShortcut>{SHORTCUTS.copy.shortcutDisplay}</MenuShortcut>
      </MenuItem>

      {canCut && (
        <MenuItem onClick={handleCutClick}>
          <Scissors className="me-2 h-4 w-4" />
          Cut
          <MenuShortcut>{SHORTCUTS.cut.shortcutDisplay}</MenuShortcut>
        </MenuItem>
      )}

      <MenuItem disabled={!canPaste} onClick={handlePasteClick}>
        <ClipboardPaste className="me-2 h-4 w-4" />
        Paste
        <MenuShortcut>{SHORTCUTS.paste.shortcutDisplay}</MenuShortcut>
      </MenuItem>

      <MenuSeparator />

      {canDuplicate && (
        <MenuItem onClick={handleDuplicateClick}>
          <CopyPlus className="me-2 h-4 w-4" />
          Duplicate
          <MenuShortcut>{SHORTCUTS.duplicate.shortcutDisplay}</MenuShortcut>
        </MenuItem>
      )}

      {canDelete && (
        <MenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDeleteClick}
        >
          <Trash className="me-2 h-4 w-4" />
          Delete
          <MenuShortcut>{SHORTCUTS.delete.shortcutDisplay}</MenuShortcut>
        </MenuItem>
      )}
    </>
  );
};

// Simple menu item component
interface MenuItemProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  children,
  onClick,
  disabled,
  className,
}) => (
  <button
    className={cn(
      "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    data-testid="menu-item"
    disabled={disabled}
    onClick={onClick}
    role="menuitem"
    type="button"
  >
    {children}
  </button>
);

// Simple separator component
const MenuSeparator: React.FC = () => (
  <div className="bg-muted -mx-1 my-1 h-px" data-testid="menu-separator" />
);

// Simple shortcut display component
const MenuShortcut: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span
    className="ms-auto text-xs tracking-widest opacity-60"
    data-testid="menu-shortcut"
  >
    {children}
  </span>
);
