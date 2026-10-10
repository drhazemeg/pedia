import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@pedia/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import { cn } from "@pedia/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { composeEventHandlers, useComposedRefs } from "../lib/compose-refs";
import { Badge } from "./badge";

const FACETED_NAME = "Faceted";
const TRIGGER_NAME = "FacetedTrigger";
const BADGE_LIST_NAME = "FacetedBadgeList";
const CONTENT_NAME = "FacetedContent";
const ITEM_NAME = "FacetedItem";

const ERRORS = {
  [FACETED_NAME]: `\`${FACETED_NAME}\` must be used as root component`,
  [TRIGGER_NAME]: `\`${TRIGGER_NAME}\` must be within \`${FACETED_NAME}\``,
  [BADGE_LIST_NAME]: `\`${BADGE_LIST_NAME}\` must be within \`${FACETED_NAME}\``,
  [CONTENT_NAME]: `\`${CONTENT_NAME}\` must be within \`${FACETED_NAME}\``,
  [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${FACETED_NAME}\``,
};

type FacetedValue<Multiple extends boolean> = Multiple extends true
  ? string[]
  : string;

interface FacetedContextValue<Multiple extends boolean = boolean> {
  multiple?: Multiple;
  onItemSelect?: (value: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  value?: FacetedValue<Multiple> | undefined;
}

const FacetedContext = React.createContext<FacetedContextValue<boolean> | null>(
  null
);

function useFacetedContext(name: keyof typeof ERRORS) {
  const context = React.useContext(FacetedContext);
  if (!context) {
    throw new Error(ERRORS[name]);
  }
  return context;
}

interface FacetedProps<
  Multiple extends boolean = false,
> extends React.ComponentProps<typeof Popover> {
  children?: React.ReactNode;
  multiple?: Multiple;
  onValueChange?: (value: FacetedValue<Multiple> | undefined) => void;
  value?: FacetedValue<Multiple>;
}

function Faceted<Multiple extends boolean = false>(
  props: FacetedProps<Multiple>
) {
  const {
    value,
    onValueChange,
    children,
    multiple = false as Multiple,
    ...facetedProps
  } = props;
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const onItemSelect = React.useCallback(
    (selectedValue: string) => {
      if (!onValueChange) return;

      if (multiple) {
        const currentValue: string[] = Array.isArray(value) ? value : [];
        const newValue = currentValue.includes(selectedValue)
          ? currentValue.filter((v) => v !== selectedValue)
          : [...currentValue, selectedValue];
        onValueChange(newValue as FacetedValue<Multiple>);
      } else {
        if (value === selectedValue) {
          onValueChange();
        } else {
          onValueChange(selectedValue as FacetedValue<Multiple>);
        }

        requestAnimationFrame(() => {
          setOpen(false);
        });
      }
    },
    [multiple, onValueChange, value]
  );

  const contextValue = React.useMemo<FacetedContextValue<Multiple>>(() => {
    return { value, onItemSelect, multiple, triggerRef };
  }, [value, onItemSelect, multiple]);

  return (
    <FacetedContext.Provider value={contextValue}>
      <Popover onOpenChange={setOpen} open={open} {...facetedProps}>
        {children}
      </Popover>
    </FacetedContext.Provider>
  );
}

function FacetedTrigger({
  ref,
  className,
  children,
  ...triggerProps
}: React.ComponentProps<typeof PopoverTrigger>) {
  const context = useFacetedContext(TRIGGER_NAME);
  const composedRef = useComposedRefs(ref, context.triggerRef);

  return (
    <PopoverTrigger
      data-slot="faceted-trigger"
      {...triggerProps}
      className={cn(
        "focus:ring-ring justify-between text-left focus:ring-1 focus:outline-none",
        className
      )}
      onPointerDown={composeEventHandlers(
        triggerProps.onPointerDown,
        (event) => {
          // prevent implicit pointer capture
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
          }

          // Only prevent default if we're not clicking on the input
          // This allows text selection in the input while still preventing focus stealing elsewhere
          if (
            event.button === 0 &&
            event.ctrlKey === false &&
            event.pointerType === "mouse" &&
            !(event.target instanceof HTMLInputElement)
          ) {
            event.preventDefault();
          }
        }
      )}
      ref={composedRef}
    >
      {children}
    </PopoverTrigger>
  );
}

interface FacetedBadgeListProps extends React.ComponentProps<"div"> {
  badgeClassName?: string;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

function FacetedBadgeList({
  ref,
  max = 2,
  placeholder = "Select options...",
  className,
  badgeClassName,
  ...badgeListProps
}: FacetedBadgeListProps) {
  const context = useFacetedContext(BADGE_LIST_NAME);
  const values = Array.isArray(context.value)
    ? context.value
    : context.value
      ? [context.value]
      : [];

  // const getLabel = React.useCallback(
  // 	(value: string) => {
  // 		const option = options.find(opt => opt.value === value);
  // 		return option?.label ?? value;
  // 	},
  // 	[options]
  // );

  if (values.length === 0) {
    return (
      <div
        data-slot="faceted-badge-list"
        {...badgeListProps}
        className="text-muted-foreground flex w-full items-center gap-1"
        ref={ref}
      >
        {placeholder}
        <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
      </div>
    );
  }

  return (
    <div
      data-slot="faceted-badge-list"
      {...badgeListProps}
      className={cn("flex flex-wrap items-center gap-1", className)}
      ref={ref}
    >
      {values.length > max ? (
        <Badge
          className={cn("rounded-sm px-1 font-normal", badgeClassName)}
          variant="secondary"
        >
          {values.length} selected
        </Badge>
      ) : (
        values.map((value) => (
          <Badge
            className={cn("rounded-sm px-1 font-normal", badgeClassName)}
            key={value}
            variant="secondary"
          >
            <span className="truncate">{value}</span>
          </Badge>
        ))
      )}
    </div>
  );
}
function FacetedContent({
  className,
  children,
  _onCloseAutoFocus,
  ...contentProps
}: React.ComponentProps<typeof PopoverContent> & {
  _onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <PopoverContent
      data-slot="faceted-content"
      {...contentProps}
      align="start"
      className={cn("w-[200px] origin-(--transform-origin) p-0", className)}
    >
      <Command>{children}</Command>
    </PopoverContent>
  );
}
const FacetedInput = CommandInput;
const FacetedList = CommandList;
const FacetedEmpty = CommandEmpty;
const FacetedGroup = CommandGroup;
const FacetedSeparator = CommandSeparator;

interface FacetedItemProps extends React.ComponentProps<typeof CommandItem> {
  value: string;
}

function FacetedItem({
  className,
  children,
  value,
  onSelect,
  ...itemProps
}: FacetedItemProps) {
  const context = useFacetedContext(ITEM_NAME);

  const isSelected = context.multiple
    ? Array.isArray(context.value) && context.value.includes(value)
    : context.value === value;

  const onItemSelect = React.useCallback(
    (currentValue: string) => {
      if (onSelect) {
        onSelect(currentValue);
      } else if (context.onItemSelect) {
        context.onItemSelect(currentValue);
      }
    },
    [onSelect, context]
  );

  // Stable handler for CommandItem's onSelect prop
  const handleSelect = React.useCallback(() => {
    onItemSelect(value);
  }, [onItemSelect, value]);

  return (
    <CommandItem
      aria-selected={isSelected}
      className={cn("gap-2", className)}
      data-selected={isSelected}
      data-slot="faceted-item"
      onSelect={handleSelect}
      {...itemProps}
    >
      <span
        className={cn(
          "border-primary flex size-4 items-center justify-center rounded-sm border",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "opacity-50 [&_svg]:invisible"
        )}
      >
        <Check className="size-4" />
      </span>
      {children}
    </CommandItem>
  );
}

export {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedSeparator,
  FacetedTrigger,
};
