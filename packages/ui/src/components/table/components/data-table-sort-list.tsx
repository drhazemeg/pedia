import { Badge } from "@pedia/ui/components/badge";
import { Button } from "@pedia/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@pedia/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pedia/ui/components/select";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@pedia/ui/components/sortable";
import { cn } from "@pedia/ui/lib/utils";
import type { ColumnSort } from "@tanstack/react-table";
import {
  ArrowDownUp,
  Check,
  ChevronsUpDown,
  GripVertical,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { useTableContext } from "../table-context";

// ---------------------------------------------------------------------------
// Stable pointer-down handler shared by popover trigger buttons.
// Prevents default on primary mouse clicks so Popover can manage focus.
// ---------------------------------------------------------------------------
function handleTriggerPointerDown(
  event: React.PointerEvent<HTMLButtonElement>
) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }
  if (event.button === 0 && !event.ctrlKey && event.pointerType === "mouse") {
    event.preventDefault();
  }
}

function handleTriggerClick(event: React.MouseEvent<HTMLButtonElement>) {
  event.currentTarget.focus();
}

// ---------------------------------------------------------------------------
// SortItem
// ---------------------------------------------------------------------------
interface SortItemProps {
  index: number;
  listId: string;
  onColumnSelect: (currentSortId: string, newColumnId: string) => void;
  onSortRemove: (sortId: string) => void;
  onSortUpdate: (
    sortId: string,
    updates: Partial<Omit<ColumnSort, "id">>
  ) => void;
  sort: ColumnSort;
  sortableColumns: ReturnType<
    ReturnType<typeof useTableContext>["getAllColumns"]
  >;
  sorting: ColumnSort[];
}

function SortItem({
  sort,
  index,
  listId,
  sortableColumns,
  sorting,
  onColumnSelect,
  onSortUpdate,
  onSortRemove,
}: SortItemProps) {
  const columnTitle =
    sortableColumns.find((col) => col.id === sort.id)?.columnDef.meta?.label ??
    sort.id;
  const sortItemId = `${listId}-item-${sort.id}`;
  const triggerId = `${listId}-${index}-trigger`;
  const fieldListboxId = `${sortItemId}-field-listbox`;
  const operatorListboxId = `${sortItemId}-operator-listbox`;

  const [fieldOpen, setFieldOpen] = React.useState(false);

  const handleColumnSelect = React.useCallback(
    (newColumnId: string) => {
      onColumnSelect(sort.id, newColumnId);
    },
    [onColumnSelect, sort.id]
  );

  const handleRemove = React.useCallback(() => {
    onSortRemove(sort.id);
  }, [onSortRemove, sort.id]);

  return (
    <SortableItem key={sort.id} value={sort.id}>
      <li
        className="grid grid-cols-[175px_100px_32px_32px] items-center gap-2"
        id={sortItemId}
        tabIndex={-1}
      />

      <Popover onOpenChange={setFieldOpen} open={fieldOpen}>
        <PopoverTrigger
          render={(props) => (
            <Button
              {...props}
              aria-controls={fieldListboxId}
              aria-expanded={fieldOpen}
              aria-label={`Select column to sort by. Current: ${columnTitle}`}
              className="focus:ring-ring h-8 justify-between gap-2 font-normal focus:ring-1 focus:outline-none"
              id={triggerId}
              onPointerDown={handleTriggerPointerDown}

              role="combobox"
              size="sm"
              variant="outline"
            >
              <span className="truncate">{columnTitle}</span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          )}
        />

        <PopoverContent
          className="w-[var(--anchor-width)] p-0"
          id={fieldListboxId}
        >
          <Command>
            <CommandInput
              aria-label="Search sortable columns"
              placeholder="Search columns..."
            />
            <CommandList>
              <CommandEmpty>No column found.</CommandEmpty>
              <CommandGroup>
                {sortableColumns
                  .filter(
                    (column) =>
                      !sorting.some(
                        (s) => s.id === column.id && s.id !== sort.id
                      )
                  )
                  .map((column) => (
                    <CommandItem
                      key={column.id}
                      onSelect={handleColumnSelect}
                      value={column.id}
                    >
                      <span className="truncate">
                        {column.columnDef.meta?.label ?? column.id}
                      </span>
                      <Check
                        aria-hidden="true"
                        className={cn(
                          "ml-auto size-4",
                          column.id === sort.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Select
        onValueChange={(value) => {
          if (value !== null) {
            onSortUpdate(sort.id, { desc: value === "desc" });
          }
        }}
        value={sort.desc ? "desc" : "asc"}
      >
        <SelectTrigger
          aria-controls={operatorListboxId}
          aria-label={`Sort direction for ${columnTitle}`}
          className="h-8"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="min-w-[var(--anchor-width)]"
          id={operatorListboxId}
        >
          <SelectItem value="asc">Asc</SelectItem>
          <SelectItem value="desc">Desc</SelectItem>
        </SelectContent>
      </Select>
      <Button
        aria-label={`Remove sort for ${columnTitle}`}
        className="size-8 shrink-0 [&_svg]:size-3.5"
        onClick={handleRemove}
        size="icon"
        variant="outline"
      >
        <Trash2 />
      </Button>
      <SortableItemHandle
        render={(props) => (
          <Button
            {...props}
            aria-label={`Drag to reorder ${columnTitle} sort`}
            className="size-8 shrink-0 [&_svg]:size-3.5"
            size="icon"
            variant="outline"
          >
            <GripVertical />
          </Button>
        )}
      />
    </SortableItem>
  );
}

// ---------------------------------------------------------------------------
// DataTableSortList
// ---------------------------------------------------------------------------
export function DataTableSortList(): React.ReactNode {
  const table = useTableContext();
  const sorting = table.state.sorting;

  const labelId = React.useId();
  const descriptionId = React.useId();
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);

  const sortableColumns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanSort()),
    [table]
  );

  const onColumnSelect = React.useCallback(
    (currentSortId: string, newColumnId: string) => {
      const newSorting = sorting.map((s) =>
        s.id === currentSortId ? { ...s, id: newColumnId } : s
      );
      table.setSorting(newSorting);
    },
    [sorting, table]
  );

  const onSortAdd = React.useCallback(() => {
    const firstAvailableColumn = sortableColumns.find(
      (col) => !sorting.some((s) => s.id === col.id)
    );
    if (firstAvailableColumn) {
      table.setSorting([
        ...sorting,
        { id: firstAvailableColumn.id, desc: false },
      ]);
    }
  }, [sorting, sortableColumns, table]);

  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<Omit<ColumnSort, "id">>) => {
      const newSorting = sorting.map((s) =>
        s.id === sortId ? { ...s, ...updates } : s
      );
      table.setSorting(newSorting);
    },
    [sorting, table]
  );

  const onSortRemove = React.useCallback(
    (sortId: string) => {
      const newSorting = sorting.filter((s) => s.id !== sortId);
      table.setSorting(newSorting);
    },
    [sorting, table]
  );

  const onSortingChange = React.useCallback(
    (value: ColumnSort[]) => table.setSorting(value),
    [table]
  );

  const onResetSorting = React.useCallback(() => table.resetSorting(), [table]);

  const getSortItemValue = React.useCallback((item: ColumnSort) => item.id, []);

  return (
    <Sortable
      getItemValue={getSortItemValue}
      onValueChange={onSortingChange}
      value={sorting}
    >
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={(props) => (
            <Button
              {...props}
              className="[&_svg]:size-3"
              onClick={handleTriggerClick}
              onPointerDown={handleTriggerPointerDown}
              size="sm"
              variant="outline"
            >
              <ArrowDownUp />
              Sort
              {sorting.length > 0 && (
                <Badge
                  className="h-[1.14rem] rounded-[0.2rem] px-[0.32rem] font-mono text-[0.65rem] font-normal"
                  variant="secondary"
                >
                  {sorting.length}
                </Badge>
              )}
            </Button>
          )}
        />

        <PopoverContent
          align="start"
          aria-describedby={descriptionId}
          aria-labelledby={labelId}
          className="flex w-[calc(100vw-theme(spacing.20))] max-w-[25rem] min-w-72 origin-[var(--transform-origin)] flex-col gap-3 p-4 sm:w-[25rem]"
        >
          <div className="flex flex-col gap-1">
            <h4 className="leading-none font-medium" id={labelId}>
              {sorting.length > 0 ? "Sort by" : "No sorting applied"}
            </h4>
            <p
              className={cn(
                "text-muted-foreground text-sm",
                sorting.length > 0 && "sr-only"
              )}
              id={descriptionId}
            >
              {sorting.length > 0
                ? "Modify sorting to organize your results."
                : "Add sorting to organize your results."}
            </p>
          </div>
          {sorting.length > 0 ? (
            <SortableContent>
              <ul
                aria-describedby={descriptionId}
                aria-labelledby={labelId}
                className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-0.5"
                id={listId}
              >
                {sorting.map((sort, index) => (
                  <SortItem
                    index={index}
                    key={sort.id}
                    listId={listId}
                    onColumnSelect={onColumnSelect}
                    onSortRemove={onSortRemove}
                    onSortUpdate={onSortUpdate}
                    sort={sort}
                    sortableColumns={sortableColumns}
                    sorting={sorting}
                  />
                ))}
              </ul>
            </SortableContent>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              aria-label="Add new sort"
              disabled={sorting.length >= sortableColumns.length}
              onClick={onSortAdd}
              size="sm"
            >
              Add sort
            </Button>
            {sorting.length > 0 && (
              <Button
                aria-label="Reset all sorting"
                onClick={onResetSorting}
                size="sm"
                variant="outline"
              >
                Reset
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className="grid grid-cols-[175px_100px_32px_32px] gap-2">
          <div className="bg-primary/10 h-8 rounded-md" />
          <div className="bg-primary/10 h-8 rounded-md" />
          <div className="bg-primary/10 h-8 shrink-0 rounded-md" />
          <div className="bg-primary/10 h-8 shrink-0 rounded-md" />
        </div>
      </SortableOverlay>
    </Sortable>
  );
}
