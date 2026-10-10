import type {
  Announcements,
  DndContextProps,
  DragEndEvent,
  DraggableSyntheticListeners,
  DropAnimation,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import type { SortableContextProps } from "@dnd-kit/sortable";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@pedia/ui/lib/utils";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { composeEventHandlers, useComposedRefs } from "../lib/compose-refs";

const orientationConfig = {
  vertical: {
    modifiers: [restrictToVerticalAxis, restrictToParentElement],
    strategy: verticalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  horizontal: {
    modifiers: [restrictToHorizontalAxis, restrictToParentElement],
    strategy: horizontalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  mixed: {
    modifiers: [restrictToParentElement],
    strategy: undefined,
    collisionDetection: closestCorners,
  },
};

const ROOT_NAME = "Sortable";
const CONTENT_NAME = "SortableContent";
const ITEM_NAME = "SortableItem";
const ITEM_HANDLE_NAME = "SortableItemHandle";
const OVERLAY_NAME = "SortableOverlay";

type LocalSlotProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
  [key: string]: unknown;
};

function renderLocalSlot(
  asChild: boolean | undefined,
  fallback: keyof React.JSX.IntrinsicElements,
  props: LocalSlotProps,
  ref?: React.Ref<HTMLElement>,
  render?: (props: LocalSlotProps) => React.ReactElement
) {
  const { children, className, style, ...slotProps } = props;
  if (render) return render({ ...props, ref });

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      style?: React.CSSProperties;
      children?: React.ReactNode;
    }>;

    const mergedProps = {
      ...child.props,
      ...slotProps,
      ref,
      className: cn(className, child.props.className),
      style: { ...child.props.style, ...style },
    } as React.Attributes & {
      ref?: React.Ref<HTMLElement>;
      className?: string;
      style?: React.CSSProperties;
      children?: React.ReactNode;
    };

    return React.createElement(child.type, mergedProps, child.props.children);
  }

  return React.createElement(
    fallback,
    { ...slotProps, ref, className, style },
    children
  );
}

const SORTABLE_ERROR = {
  [ROOT_NAME]: `\`${ROOT_NAME}\` components must be within \`${ROOT_NAME}\``,
  [CONTENT_NAME]: `\`${CONTENT_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${CONTENT_NAME}\``,
  [ITEM_HANDLE_NAME]: `\`${ITEM_HANDLE_NAME}\` must be within \`${ITEM_NAME}\``,
  [OVERLAY_NAME]: `\`${OVERLAY_NAME}\` must be within \`${ROOT_NAME}\``,
} as const;

interface SortableRootContextValue<T> {
  activeId: UniqueIdentifier | null;
  flatCursor: boolean;
  getItemValue: (item: T) => UniqueIdentifier;
  id: string;
  items: UniqueIdentifier[];
  modifiers: DndContextProps["modifiers"];
  setActiveId: (id: UniqueIdentifier | null) => void;
  strategy: SortableContextProps["strategy"];
}

const SortableRootContext =
  React.createContext<SortableRootContextValue<unknown> | null>(null);
SortableRootContext.displayName = ROOT_NAME;

function useSortableContext(name: keyof typeof SORTABLE_ERROR) {
  const context = React.useContext(SortableRootContext);
  if (!context) {
    throw new Error(SORTABLE_ERROR[name]);
  }
  return context;
}

interface GetItemValue<T> {
  /**
   * Callback that returns a unique identifier for each sortable item. Required for array of objects.
   * @example getItemValue={(item) => item.id}
   */
  getItemValue: (item: T) => UniqueIdentifier;
}

type SortableProps<T> = DndContextProps & {
  value: T[];
  onValueChange?: (items: T[]) => void;
  onMove?: (
    event: DragEndEvent & { activeIndex: number; overIndex: number }
  ) => void;
  strategy?: SortableContextProps["strategy"];
  orientation?: "vertical" | "horizontal" | "mixed";
  flatCursor?: boolean;
} & (T extends object ? GetItemValue<T> : Partial<GetItemValue<T>>);

function Sortable<T>(props: SortableProps<T>) {
  const generatedId = React.useId();
  const {
    id: idProp,
    value,
    onValueChange,
    modifiers,
    strategy,
    onMove,
    orientation = "vertical",
    flatCursor = false,
    getItemValue: getItemValueProp,
    accessibility,
    ...sortableProps
  } = props;
  const id = idProp ?? generatedId;
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const config = React.useMemo(
    () => orientationConfig[orientation],
    [orientation]
  );
  const getItemValue = React.useCallback(
    (item: T): UniqueIdentifier => {
      if (typeof item === "object" && !getItemValueProp) {
        throw new Error(
          "getItemValue is required when using array of objects."
        );
      }
      return getItemValueProp
        ? getItemValueProp(item)
        : (item as UniqueIdentifier);
    },
    [getItemValueProp]
  );

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const activeIndex = value.findIndex(
          (item) => getItemValue(item) === active.id
        );
        const overIndex = value.findIndex(
          (item) => getItemValue(item) === over.id
        );

        if (onMove) {
          onMove({ ...event, activeIndex, overIndex });
        } else {
          onValueChange?.(arrayMove(value, activeIndex, overIndex));
        }
      }
      setActiveId(null);
    },
    [value, onValueChange, onMove, getItemValue]
  );

  const announcements: Announcements = {
    onDragStart({ active }) {
      const activeValue = active.id.toString();
      return `Grabbed sortable item "${activeValue}". Current position is ${active.data.current?.sortable.index + 1} of ${value.length}. Use arrow keys to move, space to drop.`;
    },
    onDragOver({ active, over }) {
      if (over) {
        const overIndex = over.data.current?.sortable.index ?? 0;
        const activeIndex = active.data.current?.sortable.index ?? 0;
        const moveDirection = overIndex > activeIndex ? "down" : "up";
        const activeValue = active.id.toString();
        return `Sortable item "${activeValue}" moved ${moveDirection} to position ${overIndex + 1} of ${value.length}.`;
      }
      return "Sortable item is no longer over a droppable area. Press escape to cancel.";
    },
    onDragEnd({ active, over }) {
      const activeValue = active.id.toString();
      if (over) {
        const overIndex = over.data.current?.sortable.index ?? 0;
        return `Sortable item "${activeValue}" dropped at position ${overIndex + 1} of ${value.length}.`;
      }
      return `Sortable item "${activeValue}" dropped. No changes were made.`;
    },
    onDragCancel({ active }) {
      const activeIndex = active.data.current?.sortable.index ?? 0;
      const activeValue = active.id.toString();
      return `Sorting cancelled. Sortable item "${activeValue}" returned to position ${activeIndex + 1} of ${value.length}.`;
    },
    onDragMove({ active, over }) {
      if (over) {
        const overIndex = over.data.current?.sortable.index ?? 0;
        const activeIndex = active.data.current?.sortable.index ?? 0;
        const moveDirection = overIndex > activeIndex ? "down" : "up";
        const activeValue = active.id.toString();
        return `Sortable item "${activeValue}" is moving ${moveDirection} to position ${overIndex + 1} of ${value.length}.`;
      }
      return "Sortable item is no longer over a droppable area. Press escape to cancel.";
    },
  };

  const screenReaderInstructions: ScreenReaderInstructions =
    React.useMemo(() => {
      return {
        draggable: `
        To pick up a sortable item, press space or enter.
        While dragging, use the ${orientation === "vertical" ? "up and down" : orientation === "horizontal" ? "left and right" : "arrow"} keys to move the item.
        Press space or enter again to drop the item in its new position, or press escape to cancel.
      `,
      };
    }, [orientation]);

  const items = React.useMemo(
    () => value.map((item) => getItemValue(item)),
    [value, getItemValue]
  );

  const contextValue = React.useMemo(() => {
    return {
      id,
      items,
      modifiers: modifiers ?? config.modifiers,
      strategy: strategy ?? config.strategy,
      activeId,
      setActiveId,
      getItemValue,
      flatCursor,
    };
  }, [
    id,
    items,
    modifiers,
    strategy,
    config.modifiers,
    config.strategy,
    activeId,
    getItemValue,
    flatCursor,
  ]);

  return (
    <SortableRootContext.Provider
      value={contextValue as SortableRootContextValue<unknown>}
    >
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions,
          ...accessibility,
        }}
        collisionDetection={config.collisionDetection}
        id={id}
        modifiers={modifiers ?? config.modifiers}
        onDragCancel={composeEventHandlers(sortableProps.onDragCancel, () =>
          setActiveId(null)
        )}
        onDragEnd={composeEventHandlers(sortableProps.onDragEnd, onDragEnd)}
        onDragStart={composeEventHandlers(
          sortableProps.onDragStart,
          ({ active }) => setActiveId(active.id)
        )}
        sensors={sensors}
        {...sortableProps}
      />
    </SortableRootContext.Provider>
  );
}

const SortableContentContext = React.createContext<boolean>(false);
SortableContentContext.displayName = CONTENT_NAME;

interface SortableContentProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
  children: React.ReactNode;
  render?: (props: LocalSlotProps) => React.ReactElement;
  strategy?: SortableContextProps["strategy"];
  withoutSlot?: boolean;
}

const SortableContent = function SortableContent({
  strategy: strategyProp,
  asChild,
  render,
  withoutSlot,
  children,
  ref,
  ...contentProps
}: SortableContentProps & { ref?: React.RefObject<HTMLElement | null> }) {
  const context = useSortableContext(CONTENT_NAME);
  const contentRef = useComposedRefs(ref);
  const strategy = strategyProp ?? context.strategy;

  return (
    <SortableContentContext.Provider value={true}>
      {strategy ? (
        <SortableContext items={context.items} strategy={strategy}>
          {withoutSlot
            ? children
            : renderLocalSlot(
                asChild,
                "div",
                {
                  "data-slot": "sortable-content",
                  ...contentProps,
                  children,
                },
                contentRef,
                render
              )}
        </SortableContext>
      ) : (
        <SortableContext items={context.items}>
          {withoutSlot
            ? children
            : renderLocalSlot(
                asChild,
                "div",
                {
                  "data-slot": "sortable-content",
                  ...contentProps,
                  children,
                },
                contentRef,
                render
              )}
        </SortableContext>
      )}
    </SortableContentContext.Provider>
  );
};

interface SortableItemContextValue {
  attributes: React.HTMLAttributes<HTMLElement>;
  disabled?: boolean;
  id: string;
  isDragging?: boolean;
  listeners: DraggableSyntheticListeners | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
}

const SortableItemContext =
  React.createContext<SortableItemContextValue | null>(null);
SortableItemContext.displayName = ITEM_NAME;

interface SortableItemProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
  asHandle?: boolean;
  disabled?: boolean;
  render?: (props: LocalSlotProps) => React.ReactElement;
  value: UniqueIdentifier;
}

const SortableItem = function SortableItem({
  value,
  style,
  asHandle,
  asChild,
  render,
  disabled,
  className,
  ref,
  ...itemProps
}: SortableItemProps & { ref?: React.RefObject<HTMLElement | null> }) {
  const inSortableContent = React.useContext(SortableContentContext);
  const inSortableOverlay = React.useContext(SortableOverlayContext);

  if (!(inSortableContent || inSortableOverlay)) {
    throw new Error(SORTABLE_ERROR[ITEM_NAME]);
  }

  if (value === "") {
    throw new Error(`\`${ITEM_NAME}\` value cannot be an empty string`);
  }

  const context = useSortableContext(ITEM_NAME);
  const id = React.useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: value,
    ...(disabled === undefined ? {} : { disabled }),
  });

  // Create a ref to store a callback that captures the latest props
  const handleRef = React.useRef<((node: HTMLElement | null) => void) | null>(
    null
  );

  // Update the callback in an effect to avoid render-time ref updates
  React.useLayoutEffect(() => {
    handleRef.current = (node: HTMLElement | null) => {
      if (disabled) return;
      setNodeRef(node);
      if (asHandle) setActivatorNodeRef(node);
    };
  }, [disabled, asHandle, setNodeRef, setActivatorNodeRef]);

  const composedRef = useComposedRefs(
    ref,
    React.useCallback(() => {}, [])
  );

  const composedStyle = React.useMemo<React.CSSProperties>(() => {
    return {
      transform: CSS.Translate.toString(transform),
      transition,
      ...style,
    };
  }, [transform, transition, style]);

  const itemContext = React.useMemo<SortableItemContextValue>(() => {
    return {
      id,
      attributes,
      listeners,
      setActivatorNodeRef,
      isDragging,
      disabled: disabled ?? false,
    };
  }, [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled]);

  return (
    <SortableItemContext.Provider value={itemContext}>
      {renderLocalSlot(
        asChild,
        "div",
        {
          "data-slot": "sortable-item",
          id,
          "data-dragging": isDragging ? "" : undefined,
          ...itemProps,
          ...(asHandle ? attributes : {}),
          ...(asHandle ? listeners : {}),
          tabIndex: disabled ? undefined : 0,
          ref: composedRef,
          style: composedStyle,
          className: cn(
            "focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
            {
              "touch-none select-none": asHandle,
              "cursor-default": context.flatCursor,
              "data-dragging:cursor-grabbing": !context.flatCursor,
              "cursor-grab": !isDragging && asHandle && !context.flatCursor,
              "opacity-50": isDragging,
              "pointer-events-none opacity-50": disabled,
            },
            className
          ),
        },
        composedRef,
        render
      )}
    </SortableItemContext.Provider>
  );
};

interface SortableItemHandleProps extends React.ComponentProps<"button"> {
  asChild?: boolean;
  render?: (
    props: Omit<LocalSlotProps, "ref"> & {
      ref?: React.Ref<HTMLButtonElement>;
    }
  ) => React.ReactElement;
}

const SortableItemHandle = function SortableItemHandle({
  asChild,
  render,
  disabled,
  className,
  ref,
  ...itemHandleProps
}: SortableItemHandleProps & { ref?: React.RefObject<HTMLElement | null> }) {
  const itemContext = React.useContext(SortableItemContext);
  if (!itemContext) {
    throw new Error(SORTABLE_ERROR[ITEM_HANDLE_NAME]);
  }
  const context = useSortableContext(ITEM_HANDLE_NAME);

  const isDisabled = disabled ?? itemContext.disabled;

  // Create a ref to store the callback
  const handleRef = React.useRef<((node: HTMLElement | null) => void) | null>(
    null
  );

  // Update the callback in an effect
  React.useLayoutEffect(() => {
    handleRef.current = (node: HTMLElement | null) => {
      if (isDisabled) return;
      itemContext.setActivatorNodeRef(node);
    };
  }, [isDisabled, itemContext]);

  const composedRef = useComposedRefs(ref, (node) => {
    if (!isDisabled) {
      itemContext.setActivatorNodeRef(node);
    }
  });

  const handleProps: LocalSlotProps = {
    "data-slot": "sortable-item-handle",
    type: "button",
    "aria-controls": itemContext.id,
    "data-dragging": itemContext.isDragging ? "" : undefined,
    ...itemHandleProps,
    ...itemContext.attributes,
    ...itemContext.listeners,
    ref: composedRef,
    className: cn(
      "select-none disabled:pointer-events-none disabled:opacity-50",
      context.flatCursor
        ? "cursor-default"
        : "cursor-grab data-dragging:cursor-grabbing",
      className
    ),
    disabled: isDisabled,
  };

  return render
    ? render({
        ...handleProps,
        ref: composedRef,
      })
    : renderLocalSlot(asChild, "button", handleProps);
};

const SortableOverlayContext = React.createContext(false);
SortableOverlayContext.displayName = OVERLAY_NAME;

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

interface SortableOverlayProps extends Omit<
  React.ComponentProps<typeof DragOverlay>,
  "children"
> {
  children?:
    | ((params: { value: UniqueIdentifier }) => React.ReactNode)
    | React.ReactNode;
  container?: HTMLElement | DocumentFragment | null;
}

function SortableOverlay(props: SortableOverlayProps) {
  const { container: containerProp, children, ...overlayProps } = props;
  const context = useSortableContext(OVERLAY_NAME);

  const container =
    containerProp ?? (typeof document === "undefined" ? null : document.body);

  if (!container) return null;

  return ReactDOM.createPortal(
    <DragOverlay
      className={cn(!context.flatCursor && "cursor-grabbing")}
      dropAnimation={dropAnimation}
      {...(context.modifiers ? { modifiers: context.modifiers } : {})}
      {...overlayProps}
    >
      <SortableOverlayContext.Provider value={true}>
        {context.activeId
          ? typeof children === "function"
            ? children({ value: context.activeId })
            : children
          : null}
      </SortableOverlayContext.Provider>
    </DragOverlay>,
    container
  );
}

const Root = Sortable;
const Content = SortableContent;
const Item = SortableItem;
const ItemHandle = SortableItemHandle;
const Overlay = SortableOverlay;

export {
  Content,
  Item,
  ItemHandle,
  Overlay,
  //
  Root,
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
};
