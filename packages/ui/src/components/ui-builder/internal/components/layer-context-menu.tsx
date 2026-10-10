"use client";

import type { KeyCombination } from "@pedia/ui/hooks/use-keyboard-shortcuts";
import { useKeyboardShortcuts } from "@pedia/ui/hooks/use-keyboard-shortcuts";
import { useGlobalLayerActions } from "@pedia/ui/lib/ui-builder/hooks/use-layer-actions";
import { SHORTCUTS } from "@pedia/ui/lib/ui-builder/shortcuts/shortcut-registry";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import React, { useCallback, useMemo } from "react";

export interface LayerContextMenuProps {
  layerId: string;
  /** Whether the layer is currently selected */
  isSelected: boolean;
  /** Callback to select the layer */
  onSelect: (layerId: string) => void;
  /** Children to wrap with context menu */
  children: React.ReactNode;
  /** Additional class name for the trigger */
  className?: string;
  /** Style for the trigger */
  style?: React.CSSProperties;
}

/**
 * Context menu wrapper for layers.
 * Captures right-click events and dispatches them to the global context menu portal.
 * If the layer is not selected, right-clicking will select it first.
 * Also handles keyboard shortcuts for copy/cut/paste/duplicate/delete.
 */
export const LayerContextMenu: React.FC<LayerContextMenuProps> = ({
  layerId,
  isSelected,
  onSelect,
  children,
  className,
  style,
}) => {
  const openContextMenu = useEditorStore((state) => state.openContextMenu);

  const {
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleDuplicate,
    getCanPaste,
  } = useGlobalLayerActions(layerId);

  // Handle right-click - open global context menu
  // Use the raw event coordinates since the menu renders inside the iframe
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Select the layer if not already selected
      if (!isSelected) {
        onSelect(layerId);
      }

      // Use raw event coordinates - the menu renders inside the iframe
      // so we don't need any coordinate conversion
      openContextMenu(e.clientX, e.clientY, layerId);
    },
    [isSelected, layerId, onSelect, openContextMenu]
  );

  // Check if the active element is an input or textarea
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    // Use isContentEditable property instead of getAttribute to handle all variations:
    // <div contenteditable>, <div contenteditable="">, <div contenteditable="true">
    const isContentEditable = (activeElement as HTMLElement).isContentEditable;

    return tagName === "input" || tagName === "textarea" || isContentEditable;
  }, []);

  // Register keyboard shortcuts only when this layer is selected
  const keyCombinations = useMemo<KeyCombination[]>(() => {
    if (!isSelected) return [];

    return [
      {
        keys: SHORTCUTS.copy.keys,
        key: SHORTCUTS.copy.key,
        preventDefault: false,
        handler: (e) => {
          if (isInputFocused()) return;
          e.preventDefault();
          handleCopy();
        },
      },
      {
        keys: SHORTCUTS.cut.keys,
        key: SHORTCUTS.cut.key,
        preventDefault: false,
        handler: (e) => {
          if (isInputFocused()) return;
          e.preventDefault();
          handleCut();
        },
      },
      {
        keys: SHORTCUTS.paste.keys,
        key: SHORTCUTS.paste.key,
        preventDefault: false,
        handler: (e) => {
          if (isInputFocused()) return;
          if (!getCanPaste()) return;
          e.preventDefault();
          handlePaste();
        },
      },
      {
        keys: SHORTCUTS.duplicate.keys,
        key: SHORTCUTS.duplicate.key,
        preventDefault: false,
        handler: (e) => {
          if (isInputFocused()) return;
          e.preventDefault();
          handleDuplicate();
        },
      },
      {
        keys: SHORTCUTS.delete.keys,
        key: SHORTCUTS.delete.key,
        preventDefault: false,
        handler: (e) => {
          if (isInputFocused()) return;
          e.preventDefault();
          handleDelete();
        },
      },
    ];
  }, [
    isSelected,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleDelete,
    getCanPaste,
    isInputFocused,
  ]);

  useKeyboardShortcuts(keyCombinations);

  // Wrap the child content in a span so we can attach the context-menu handler
  // without using cloneElement, which is disallowed by the React lint rules.
  const childProps = React.isValidElement(children)
    ? (children.props as React.HTMLAttributes<HTMLElement>)
    : undefined;

  const mergedClassName = childProps?.className
    ? className
      ? `${childProps.className} ${className}`.trim()
      : childProps.className
    : className;

  const mergedStyle = {
    ...(childProps?.style as React.CSSProperties | undefined),
    ...style,
  };

  return (
    <span
      className={mergedClassName}
      onContextMenu={handleContextMenu}
      style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
    >
      {children}
    </span>
  );
};
