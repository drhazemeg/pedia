"use client";

import { Button } from "@pedia/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@pedia/ui/components/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@pedia/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import { Input } from "@pedia/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pedia/ui/components/tooltip";
import { CodePanel } from "@pedia/ui/components/ui-builder/components/code-panel";
import LayerRenderer from "@pedia/ui/components/ui-builder/layer-renderer";
import type {
  ComponentLayer,
  ComponentRegistry,
  FunctionRegistry,
  PageTypeRenderer,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import type { KeyCombination } from "@pedia/ui/hooks/use-keyboard-shortcuts";
import { useKeyboardShortcuts } from "@pedia/ui/hooks/use-keyboard-shortcuts";
import {
  SHORTCUTS,
  toKeyboardShortcut,
} from "@pedia/ui/lib/ui-builder/shortcuts/shortcut-registry";
import type { EditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { cn } from "@pedia/ui/lib/utils";
import {
  CheckIcon,
  Eye,
  FileUp,
  Maximize,
  Monitor,
  MoonIcon,
  MoreVertical,
  PanelLeft,
  PanelRight,
  PlusIcon,
  Redo,
  Smartphone,
  SunIcon,
  Tablet,
  Undo,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { useStore } from "zustand";

const Z_INDEX = 1000;

export interface NavBarProps {
  leftChildren?: React.ReactNode;
  rightChildren?: React.ReactNode;
  /** Whether to show the Export button. Defaults to true. */
  showExport?: boolean;
}

export function NavBar({
  leftChildren,
  rightChildren,
  showExport = true,
}: NavBarProps = {}) {
  // **Lifted State for Modals** - must be called before any conditional returns
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const variables = useLayerStore((state) => state.variables);
  const componentRegistry = useEditorStore((state) => state.registry);
  const getPageTypeRenderer = useEditorStore(
    (state) => state.getPageTypeRenderer
  );
  const functionRegistry = useEditorStore((state) => state.functionRegistry);
  const incrementRevision = useEditorStore((state) => state.incrementRevision);

  // Panel visibility state
  const showLeftPanel = useEditorStore((state) => state.showLeftPanel);
  const setShowLeftPanel = useEditorStore((state) => state.setShowLeftPanel);
  const showRightPanel = useEditorStore((state) => state.showRightPanel);
  const setShowRightPanel = useEditorStore((state) => state.setShowRightPanel);

  // Fix: Subscribe to temporal state changes using useStoreWithEqualityFn
  const pastStates = useStore(
    useLayerStore.temporal,
    (state) => state.pastStates
  );
  const futureStates = useStore(
    useLayerStore.temporal,
    (state) => state.futureStates
  );
  const { undo, redo } = useLayerStore.temporal.getState();

  const page = findLayerById(selectedPageId);
  const pageTypeRenderer = useMemo(
    () => getPageTypeRenderer?.(page?.pageType ?? ""),
    [getPageTypeRenderer, page?.pageType]
  );

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const handleUndo = useCallback(() => {
    undo();
    // Increment revision counter to trigger form revalidation
    incrementRevision();
  }, [undo, incrementRevision]);

  const handleRedo = useCallback(() => {
    redo();
    // Increment revision counter to trigger form revalidation
    incrementRevision();
  }, [redo, incrementRevision]);

  const keyCombinations = useMemo<KeyCombination[]>(
    () => [
      // Use shortcut registry for undo/redo
      toKeyboardShortcut("undo", (e) => {
        e.preventDefault();
        handleUndo();
      }),
      toKeyboardShortcut("redo", (e) => {
        e.preventDefault();
        handleRedo();
      }),
      // Debug shortcuts (not in registry)
      {
        keys: { metaKey: true, shiftKey: true },
        key: "9",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          const elements = document.querySelectorAll("*");
          elements.forEach((element) => {
            element.classList.add("animate-spin", "origin-center");
          });
        },
      },
      {
        keys: { metaKey: true, shiftKey: true },
        key: "0",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          const elements = document.querySelectorAll("*");
          elements.forEach((element) => {
            element.classList.remove("animate-spin", "origin-center");
          });
        },
      },
    ],
    [handleUndo, handleRedo]
  );

  useKeyboardShortcuts(keyCombinations);

  // Conditional return must be after all hooks
  if (!selectedPageId || !page) return null;

  const handleOpenPreview = useCallback(() => {
    setIsPreviewModalOpen(true);
  }, []);
  const handleOpenExport = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleToggleLeftPanel = useCallback(() => {
    setShowLeftPanel(!showLeftPanel);
  }, [showLeftPanel, setShowLeftPanel]);

  const handleToggleRightPanel = useCallback(() => {
    setShowRightPanel(!showRightPanel);
  }, [showRightPanel, setShowRightPanel]);

  const style = useMemo(() => {
    return { zIndex: Z_INDEX };
  }, []);

  return (
    <div
      className="bg-background flex items-center justify-between border-b px-2 py-4 md:px-6"
      style={style}
    >
      <div className="flex items-center gap-2">
        {leftChildren}
        {leftChildren && <div className="bg-border hidden h-10 w-px md:flex" />}
        <div className="hidden md:contents">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="flex flex-col justify-center"
                  onClick={handleToggleLeftPanel}
                  size="icon"
                  variant={showLeftPanel ? "secondary" : "outline"}
                />
              }
            >
              <span className="sr-only">Toggle Left Panel</span>
              <PanelLeft className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              {showLeftPanel ? "Hide" : "Show"} Left Panel
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="flex flex-col justify-center"
                  onClick={handleToggleRightPanel}
                  size="icon"
                  variant={showRightPanel ? "secondary" : "outline"}
                />
              }
            >
              <span className="sr-only">Toggle Right Panel</span>
              <PanelRight className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              {showRightPanel ? "Hide" : "Show"} Right Panel
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="bg-border hidden h-10 w-px md:flex" />
        <PagesPopover />
        <PreviewModeToggle />
      </div>

      <div className="flex w-full items-center justify-end gap-2">
        {/* Action Buttons for Larger Screens */}
        <div className="hidden space-x-2 md:flex rtl:space-x-reverse">
          <ActionButtons
            canRedo={canRedo}
            canUndo={canUndo}
            onOpenExport={handleOpenExport}
            onOpenPreview={handleOpenPreview}
            onRedo={handleRedo}
            onUndo={handleUndo}
            showExport={showExport}
          />
          <div className="bg-border flex h-10 w-px" />
        </div>

        <ModeToggle />

        {/* Dropdown for Smaller Screens */}
        <div className="flex space-x-2 md:hidden rtl:space-x-reverse">
          <div className="bg-border flex h-10 w-px" />
          <ResponsiveDropdown
            canRedo={canRedo}
            canUndo={canUndo}
            onOpenExport={handleOpenExport}
            onOpenPreview={handleOpenPreview}
            onRedo={handleRedo}
            onUndo={handleUndo}
            showExport={showExport}
          >
            {rightChildren}
          </ResponsiveDropdown>
        </div>
        {/* Right children - hidden on mobile (shown in dropdown instead) */}
        {rightChildren && (
          <div className="hidden items-center gap-2 md:flex">
            <div className="bg-border h-10 w-px" />
            {rightChildren}
          </div>
        )}
      </div>

      {/* **Dialogs Controlled by NavBar State** */}
      <PreviewDialog
        componentRegistry={componentRegistry}
        functionRegistry={functionRegistry}
        isOpen={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        page={page}
        pageTypeRenderer={pageTypeRenderer}
        variables={variables}
      />
      {showExport && (
        <CodeDialog
          isOpen={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />
      )}
    </div>
  );
}

/**
 * Reusable Action Buttons Component
 */
interface ActionButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenPreview: () => void;
  onOpenExport: () => void;
  showExport?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenPreview,
  onOpenExport,
  showExport = true,
}) => (
  <>
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className="flex flex-col justify-center"
            disabled={!canUndo}
            onClick={onUndo}
            size="icon"
            variant="secondary"
          />
        }
      >
        <span className="sr-only">Undo</span>
        <Undo className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        Undo
        <CommandShortcut className="ms-0 text-sm leading-3">
          {SHORTCUTS.undo.shortcutDisplay}
        </CommandShortcut>
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className="flex flex-col justify-center"
            disabled={!canRedo}
            onClick={onRedo}
            size="icon"
            variant="secondary"
          />
        }
      >
        <span className="sr-only">Redo</span>
        <Redo className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        Redo
        <CommandShortcut className="ms-0 text-sm leading-3">
          {SHORTCUTS.redo.shortcutDisplay}
        </CommandShortcut>
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className="flex flex-col justify-center"
            onClick={onOpenPreview}
            size="icon"
            variant="secondary"
          />
        }
      >
        <span className="sr-only">Preview</span>
        <Eye className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        Preview
        <CommandShortcut className="ms-0 text-sm leading-3">
          ⌘+⇧+P
        </CommandShortcut>
      </TooltipContent>
    </Tooltip>

    {showExport && (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="flex flex-col justify-center"
              onClick={onOpenExport}
              size="icon"
              variant="secondary"
            />
          }
        >
          <span className="sr-only">Export</span>
          <FileUp className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          Export Code
          <CommandShortcut className="ms-0 text-sm leading-3">
            ⌘+⇧+E
          </CommandShortcut>
        </TooltipContent>
      </Tooltip>
    )}
  </>
);

/**
 * Dropdown containing Action Buttons for Smaller Screens
 */
interface ResponsiveDropdownProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenPreview: () => void;
  onOpenExport: () => void;
  showExport?: boolean;
  /** Content to render at the bottom of the dropdown (for rightChildren on mobile) */
  children?: React.ReactNode;
}

const ResponsiveDropdown: React.FC<ResponsiveDropdownProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenPreview,
  onOpenExport,
  showExport = true,
  children,
}) => {
  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="outline" />}>
        <span className="sr-only">Actions</span>
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={style}>
        <DropdownMenuItem
          className="gap-2"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo className="h-4 w-4" />
          Undo
          <span className="text-muted-foreground ms-auto text-xs">
            {SHORTCUTS.undo.shortcutDisplay}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo className="h-4 w-4" />
          Redo
          <span className="text-muted-foreground ms-auto text-xs">
            {SHORTCUTS.redo.shortcutDisplay}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onClick={onOpenPreview}>
          <Eye className="h-4 w-4" />
          Preview
          <span className="text-muted-foreground ms-auto text-xs">⌘+⇧+P</span>
        </DropdownMenuItem>
        {showExport && (
          <DropdownMenuItem className="gap-2" onClick={onOpenExport}>
            <FileUp className="h-4 w-4" />
            Export
            <span className="text-muted-foreground ms-auto text-xs">⌘+⇧+E</span>
          </DropdownMenuItem>
        )}
        {children && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">{children}</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Preview Dialog Component
 */
interface PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  page: ComponentLayer;
  componentRegistry: ComponentRegistry;
  pageTypeRenderer?: PageTypeRenderer;
  variables?: Variable[];
  functionRegistry?: FunctionRegistry;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  page,
  componentRegistry,
  pageTypeRenderer,
  variables,
  functionRegistry,
}) => {
  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        keys: { metaKey: true, shiftKey: true },
        key: "p",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          onOpenChange(true);
        },
      },
    ],
    [onOpenChange]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger />
      <DialogContentWithZIndex
        className="max-h-[calc(100dvh)] max-w-[calc(100dvw)] gap-0 overflow-auto p-0"
        style={style}
      >
        <DialogHeader>
          <DialogTitle className="bg-yellow-600 py-3 text-center">
            <span className="text-lg font-semibold">Page Preview</span>
          </DialogTitle>
        </DialogHeader>
        {pageTypeRenderer ? (
          pageTypeRenderer.renderEditorCanvas({
            page,
            componentRegistry,
            variables,
            functionRegistry,
          })
        ) : (
          <LayerRenderer
            className="flex h-full w-full flex-col overflow-x-hidden"
            componentRegistry={componentRegistry}
            functionRegistry={functionRegistry}
            page={page}
            variables={variables}
          />
        )}
      </DialogContentWithZIndex>
    </Dialog>
  );
};

/**
 * Code Dialog Component
 */
interface CodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CodeDialog: React.FC<CodeDialogProps> = ({ isOpen, onOpenChange }) => {
  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        keys: { metaKey: true, shiftKey: true },
        key: "e",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          onOpenChange(true);
        },
      },
    ],
    [onOpenChange]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger />
      <DialogContentWithZIndex
        className="max-h-[625px] sm:max-w-[625px]"
        style={style}
      >
        <DialogHeader>
          <DialogTitle>Generated Code</DialogTitle>
        </DialogHeader>
        <CodePanel />
      </DialogContentWithZIndex>
    </Dialog>
  );
};

function ModeToggle() {
  const { setTheme } = useTheme();

  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  const handleSetLightTheme = useCallback(() => {
    setTheme("light");
  }, [setTheme]);
  const handleSetDarkTheme = useCallback(() => {
    setTheme("dark");
  }, [setTheme]);
  const handleSetSystemTheme = useCallback(() => {
    setTheme("system");
  }, [setTheme]);

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger render={<Button size="icon" variant="outline" />} />
          }
        >
          <SunIcon className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </DropdownMenuTrigger>
        <TooltipContent>Toggle theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" style={style}>
        <DropdownMenuItem onClick={handleSetLightTheme}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSetDarkTheme}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSetSystemTheme}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PagesPopover() {
  const { pages, selectedPageId, addPageLayer, selectPage } = useLayerStore();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [textInputValue, setTextInputValue] = useState("");
  const [selectedPageType, setSelectedPageType] = useState<
    string | undefined
  >();
  const [pageNameError, setPageNameError] = useState<string | null>(null);
  const allowPagesCreation = useEditorStore(
    (state) => state.allowPagesCreation
  );
  const pageTypeRenderers = useEditorStore((state) => state.pageTypeRenderers);
  const pageTypeKeys = useMemo(
    () => Object.keys(pageTypeRenderers),
    [pageTypeRenderers]
  );
  const hasPageTypes = pageTypeKeys.length > 0;

  const selectedPageData = useMemo(
    () => pages.find((page) => page.id === selectedPageId),
    [pages, selectedPageId]
  );

  const handleSelect = useCallback(
    (pageId: string) => {
      setSelectedPage(pageId);
      selectPage(pageId);
      setOpen(false);
    },
    [selectPage]
  );

  const handleAddPageLayer = useCallback(
    (pageName: string) => {
      const trimmedPageName = pageName.trim();
      if (!trimmedPageName) {
        setPageNameError("Page name is required.");
        return;
      }
      const renderer = selectedPageType
        ? pageTypeRenderers[selectedPageType]
        : undefined;
      addPageLayer(
        trimmedPageName,
        selectedPageType,
        renderer?.defaultRootLayerType,
        renderer?.defaultRootLayerProps
      );
      setTextInputValue("");
      setSelectedPageType(undefined);
      setPageNameError(null);
    },
    [addPageLayer, selectedPageType, pageTypeRenderers]
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setTextInputValue("");
      setSelectedPageType(undefined);
      setPageNameError(null);
    }
    setOpen(nextOpen);
  }, []);

  const handleSubmit = useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleAddPageLayer(textInputValue);
    },
    [handleAddPageLayer, textInputValue]
  );

  const handleTextInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTextInputValue(e.target.value);
      if (pageNameError !== null) {
        setPageNameError(null);
      }
    },
    [pageNameError]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddPageLayer(textInputValue);
      }
    },
    [handleAddPageLayer, textInputValue]
  );

  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  const pageTypeSelector = hasPageTypes ? (
    <div className="mb-2 flex flex-wrap gap-1" data-testid="page-type-selector">
      <button
        className={cn(
          "rounded-full border px-2 py-0.5 text-xs transition-colors",
          selectedPageType === undefined
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:border-foreground"
        )}
        onClick={() => setSelectedPageType(undefined)}
        type="button"
      >
        Web
      </button>
      {pageTypeKeys.map((key) => (
        <button
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs transition-colors",
            selectedPageType === key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-foreground"
          )}
          key={key}
          onClick={() => setSelectedPageType(key)}
          type="button"
        >
          {pageTypeRenderers[key]?.label ?? key}
        </button>
      ))}
    </div>
  ) : null;

  const textInputForm = (
    <form className="w-full" onSubmit={handleSubmit}>
      {pageTypeSelector}
      <div className="flex w-full items-center space-x-2 rtl:space-x-reverse">
        <Input
          aria-invalid={pageNameError !== null}
          className="w-full grow"
          onChange={handleTextInputChange}
          onKeyDown={handleKeyDown}
          placeholder="New page name..."
          value={textInputValue}
        />
        <Button
          disabled={!textInputValue.trim()}
          type="submit"
          variant="secondary"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      {pageNameError === null ? null : (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {pageNameError}
        </p>
      )}
    </form>
  );
  return (
    <div className="relative flex justify-center">
      <Popover onOpenChange={handleOpenChange} open={open}>
        <Tooltip>
          <PopoverTrigger
            render={
              <TooltipTrigger
                render={
                  <Button
                    className="max-w-30 overflow-hidden"
                    data-testid="current-page-button"
                    size="default"
                    variant="outline"
                  />
                }
              />
            }
          >
            {selectedPageData?.name}
          </PopoverTrigger>
          <TooltipContent>Select page</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-[300px] p-0" style={style}>
          <Command>
            <CommandInput
              onValueChange={setInputValue}
              placeholder="Select page or create new..."
              value={inputValue}
            />
            <CommandList>
              <CommandEmpty>
                No pages found
                {allowPagesCreation && textInputForm}
              </CommandEmpty>
              {pages.map((page) => (
                <PageItem
                  key={page.id}
                  onSelect={handleSelect}
                  page={page}
                  selectedPageId={selectedPageId}
                />
              ))}
              <CommandSeparator />
              {allowPagesCreation && (
                <CommandGroup heading="Create new page">
                  <CommandItem>{textInputForm}</CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function PageItem({
  selectedPageId,
  page,
  onSelect,
}: {
  selectedPageId: string;
  page: ComponentLayer;
  onSelect: (pageId: string) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(page.id);
  }, [onSelect, page.id]);

  return (
    <CommandItem
      className={cn(selectedPageId === page.id && "font-bold")}
      onSelect={handleSelect}
      value={page.name}
    >
      {selectedPageId === page.id ? (
        <CheckIcon className="me-2 h-4 w-4" />
      ) : null}
      {page.name}
    </CommandItem>
  );
}

const DialogContentWithZIndex = forwardRef<
  React.ComponentRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => {
  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);
  return (
    <DialogPortal>
      <DialogOverlay style={style} />
      <DialogContent
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] bg-background data-[state=closed]:animate-out data-[state=open]:animate-in fixed start-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg rtl:-translate-x-[-50%]",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        <DialogClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute end-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
          <X className="h-4 w-4 rounded-full p-1" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  );
});

DialogContentWithZIndex.displayName = "DialogContentWithZIndex";

function PreviewModeToggle() {
  const { previewMode, setPreviewMode } = useEditorStore();

  const handleSelect = useCallback(
    (mode: EditorStore["previewMode"]) => {
      setPreviewMode(mode);
    },
    [setPreviewMode]
  );

  const style = useMemo(() => {
    return { zIndex: Z_INDEX + 1 };
  }, []);

  const previewModeIcon = useMemo(
    () =>
      ({
        mobile: <Smartphone className="h-4 w-4" />,
        tablet: <Tablet className="h-4 w-4" />,
        desktop: <Monitor className="h-4 w-4" />,
        responsive: <Maximize className="h-4 w-4" />,
      })[previewMode],
    [previewMode]
  );

  const handleSelectMobile = useCallback(() => {
    handleSelect("mobile");
  }, [handleSelect]);
  const handleSelectTablet = useCallback(() => {
    handleSelect("tablet");
  }, [handleSelect]);
  const handleSelectDesktop = useCallback(() => {
    handleSelect("desktop");
  }, [handleSelect]);
  const handleSelectResponsive = useCallback(() => {
    handleSelect("responsive");
  }, [handleSelect]);

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger render={<Button size="icon" variant="outline" />} />
          }
        >
          {previewModeIcon}
          <span className="sr-only">Select screen size</span>
        </DropdownMenuTrigger>
        <TooltipContent>Select screen size</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" style={style}>
        <DropdownMenuItem
          className={
            previewMode === "mobile"
              ? "bg-secondary text-secondary-foreground"
              : ""
          }
          onSelect={handleSelectMobile}
        >
          <Smartphone className="me-2 h-4 w-4" />
          <span>Mobile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={
            previewMode === "tablet"
              ? "bg-secondary text-secondary-foreground"
              : ""
          }
          onSelect={handleSelectTablet}
        >
          <Tablet className="me-2 h-4 w-4" />
          <span>Tablet</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={
            previewMode === "desktop"
              ? "bg-secondary text-secondary-foreground"
              : ""
          }
          onSelect={handleSelectDesktop}
        >
          <Monitor className="me-2 h-4 w-4" />
          <span>Desktop</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={
            previewMode === "responsive"
              ? "bg-secondary text-secondary-foreground"
              : ""
          }
          onSelect={handleSelectResponsive}
        >
          <Maximize className="me-2 h-4 w-4" />
          <span>Responsive</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
