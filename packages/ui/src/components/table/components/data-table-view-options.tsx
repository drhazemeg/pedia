import { Button } from "@pedia/ui/components/button";
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
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@pedia/ui/components/sortable";
import { cn } from "@pedia/ui/lib/utils";
import type { Column, RowData } from "@tanstack/react-table";
import { Check, ChevronsUpDown, GripVertical, Settings2 } from "lucide-react";
import * as React from "react";

import type { TanstackFeatures } from "../features";
import { useTableContext } from "../table-context";

// RowData → the actual row shape isn't known here, so use `unknown` for TData
// and `typeof features` for the feature map.
// type AppColumn = Column<typeof features, unknown>;

export function DataTableViewOptions(): React.ReactNode {
  const table = useTableContext();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const columnOrder = table.state.columnOrder;

  const handleValueChange = React.useCallback(
    (order: string[]) => table.setColumnOrder(order),
    [table]
  );

  const handlePointerDown = React.useCallback(
    ({
      target,
      pointerId,
      button,
      ctrlKey,
      pointerType,
    }: React.PointerEvent<HTMLButtonElement>) => {
      if (!(target instanceof HTMLElement)) return;
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      if (button === 0 && !ctrlKey && pointerType === "mouse") {
        target.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true })
        );
        const event = new PointerEvent("pointerdown", {
          bubbles: true,
        });
        Object.defineProperty(event, "preventDefault", {
          value: () => {},
        });
        event.preventDefault?.();
      }
    },
    []
  );

  const sortValue = React.useMemo(() => columnOrder ?? [], [columnOrder]);

  const hideAllColumns = React.useCallback(
    () => table.toggleAllColumnsVisible(false),
    [table]
  );
  const showAllColumns = React.useCallback(
    () => table.toggleAllColumnsVisible(true),
    [table]
  );
  const listId = React.useId();
  return (
    <Sortable onValueChange={handleValueChange} value={sortValue}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-controls={listId}
              aria-expanded={false}
              aria-label="Toggle columns"
              className="focus:ring-ring ml-auto hidden h-8 gap-2 focus:ring-1 focus:outline-none lg:flex"
              onPointerDown={handlePointerDown}
              ref={triggerRef}
              size="sm"
              variant="outline"
            >
              <Settings2 />
              View
              <ChevronsUpDown className="ml-auto opacity-50" />
            </Button>
          }
        />

        <PopoverContent align="end" className="w-full max-w-48 p-0">
          <Command>
            <CommandInput placeholder="Search columns..." />
            <SortableContent
              render={(props) => (
                <CommandList
                  {...props}
                  id={listId}
                  ref={props.ref as React.Ref<HTMLDivElement>}
                />
              )}
            >
              <CommandEmpty>No columns found.</CommandEmpty>
              <CommandGroup>
                {table
                  .getAllColumns()
                  .toSorted((a, b) => {
                    const aIndex = columnOrder?.indexOf(a.id) ?? 0;
                    const bIndex = columnOrder?.indexOf(b.id) ?? 0;
                    return aIndex - bIndex;
                  })
                  .filter((column) => typeof column.accessorFn !== "undefined")
                  .map((column) => (
                    <ColumnItem column={column} key={column.id} />
                  ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex items-center gap-1">
                  <CommandItem
                    className="w-full justify-center border"
                    onSelect={hideAllColumns}
                  >
                    Hide All
                  </CommandItem>
                  <CommandItem
                    className="w-full justify-center border"
                    onSelect={showAllColumns}
                  >
                    Show All
                  </CommandItem>
                </div>
              </CommandGroup>
            </SortableContent>
          </Command>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className="bg-primary/10 size-full" />
      </SortableOverlay>
    </Sortable>
  );
}

function ColumnItem({ column }: { column: Column<TanstackFeatures, RowData> }) {
  const isVisible = column.getIsVisible();
  const handleSelect = React.useCallback(
    () => column.toggleVisibility(!isVisible),
    [column, isVisible]
  );

  return (
    <SortableItem
      render={(props) => (
        <CommandItem
          {...props}
          aria-selected={isVisible}
          data-selected={isVisible}
          onSelect={handleSelect}
          ref={props.ref as React.Ref<HTMLDivElement>}
        >
          <Check
            className={cn(
              "size-4 shrink-0",
              isVisible ? "opacity-100" : "opacity-0"
            )}
          />
          <span className="truncate">
            {column.columnDef.meta?.label ?? column.id}
          </span>
          <SortableItemHandle render={(props) => <Button {...props} />}>
            <Button className="ml-auto size-6" size="icon" variant="ghost">
              <GripVertical />
            </Button>
          </SortableItemHandle>
        </CommandItem>
      )}
      value={column.id}
    />
  );
}
