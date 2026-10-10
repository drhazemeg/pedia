import { Badge } from "@pedia/ui/components/badge";
import { Button } from "@pedia/ui/components/button";
import { Calendar } from "@pedia/ui/components/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@pedia/ui/components/command";
import {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from "@pedia/ui/components/faceted";
import { Input } from "@pedia/ui/components/input";
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
import { cn } from "@pedia/ui/lib/utils";
import type {
  ExtendedColumnFilter,
  FilterOperator,
} from "@pedia/ui/types/table";
import type { Column, RowData } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  ListFilter,
  Trash2,
} from "lucide-react";
import * as React from "react";

import type { features } from "../features";
import { getFilterOperators } from "../filters";
import { useTableContext } from "../table-context";

// ============================================================================
// Type Guards
// ============================================================================

function isValidFilterOperator(value: unknown): value is FilterOperator {
  if (typeof value !== "string") return false;

  const validOperators = [
    "arrIncludes",
    "equals",
    "equalsString",
    "greaterThan",
    "greaterThanOrEqualTo",
    "inRange",
    "includesString",
    "isEmpty",
    "isNotEmpty",
    "isRelativeToToday",
    "lessThan",
    "lessThanOrEqualTo",
    "notEquals",
  ] as const;

  return (validOperators as readonly string[]).includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// ============================================================================
// Helper Functions
// ============================================================================

function getColumnOptions({
  column,
}: {
  column: Column<typeof features, RowData>;
}): ReadonlyArray<{ label: string; value: string; count?: number }> {
  const customOptions = column.columnDef.meta?.options;

  if (customOptions) return customOptions;

  const uniqueValues = column.getFacetedUniqueValues();

  return Array.from(uniqueValues.entries()).map(([value, count]) => {
    return {
      label: String(value),
      value: String(value),
      count,
    };
  });
}

// Stable handler for PopoverTrigger's onPointerDown — prevents focus steal on
// left-click so the popover open/close is handled by the click event alone.
function handlePopoverPointerDown(
  event: React.PointerEvent<HTMLButtonElement>
) {
  const { target } = event;
  if (!(target instanceof HTMLElement)) return;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }
  if (event.button === 0 && !event.ctrlKey && event.pointerType === "mouse") {
    event.preventDefault();
  }
}

// ============================================================================
// Stable module-level render components for PopoverTrigger's render= prop
// ============================================================================

// Base UI's render prop accepts a ReactElement or render function. We define
// these at module scope so they are stable references — not created in the
// same render scope as the JSX they are passed into. Each one is a plain
// forward-ref component so Base UI can merge its own props (onClick, etc.) in.

type DateRangeTriggerProps = React.ComponentPropsWithRef<"button"> & {
  inputId: string;
  columnLabel: string;
  hasDateRange: boolean;
  fromFormatted?: string;
  toFormatted?: string;
};
function DateRangeTrigger({
  inputId,
  columnLabel,
  hasDateRange,
  fromFormatted,
  toFormatted,
  ref,
  ...props
}: DateRangeTriggerProps & {
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props}
      aria-controls={`${inputId}-calendar`}
      aria-label={`${columnLabel} date range filter`}
      className={cn(
        "w-full justify-start text-left font-normal [&>svg]:size-3.5",
        !hasDateRange && "text-muted-foreground"
      )}
      id={inputId}
      onPointerDown={handlePopoverPointerDown}
      ref={ref}
      size="sm"
      variant="outline"
    >
      <CalendarIcon />
      {fromFormatted ? (
        toFormatted ? (
          <>
            {fromFormatted} – {toFormatted}
          </>
        ) : (
          fromFormatted
        )
      ) : (
        <span>Select date range</span>
      )}
    </Button>
  );
}
DateRangeTrigger.displayName = "DateRangeTrigger";

type DateSingleTriggerProps = React.ComponentPropsWithRef<"button"> & {
  inputId: string;
  columnLabel: string;
  hasValue: boolean;
  formatted?: string;
};
function DateSingleTrigger({
  inputId,
  columnLabel,
  hasValue,
  formatted,
  ref,
  ...props
}: DateSingleTriggerProps & {
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props}
      aria-controls={`${inputId}-calendar`}
      aria-label={`${columnLabel} date filter`}
      className={cn(
        "w-full justify-start text-left font-normal [&>svg]:size-3.5",
        !hasValue && "text-muted-foreground"
      )}
      id={inputId}
      onPointerDown={handlePopoverPointerDown}
      ref={ref}
      size="sm"
      variant="outline"
    >
      <CalendarIcon />
      {formatted ? (
        formatted
      ) : (
        <span className="text-muted-foreground">Pick a date</span>
      )}
    </Button>
  );
}
DateSingleTrigger.displayName = "DateSingleTrigger";

type SelectFacetedTriggerProps = React.ComponentPropsWithRef<"button"> & {
  inputId: string;
  columnLabel: string;
  columnPlaceholder: string;
  options: ReadonlyArray<{ label: string; value: string; count?: number }>;
};
function SelectFacetedTrigger({
  inputId,
  columnLabel,
  columnPlaceholder,
  options,
  ref,
  ...props
}: SelectFacetedTriggerProps & {
  ref?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Button
      {...props}
      aria-controls={`${inputId}-listbox`}
      aria-label={`${columnLabel} filter value`}
      className="h-8 w-full justify-start text-left font-normal"
      id={inputId}
      ref={ref}
      size="sm"
      variant="outline"
    >
      <FacetedBadgeList
        options={[...options]}
        placeholder={`Select ${columnPlaceholder}...`}
      />
    </Button>
  );
}
SelectFacetedTrigger.displayName = "SelectFacetedTrigger";

type MultiSelectFacetedTriggerProps = React.ComponentPropsWithRef<"button"> & {
  inputId: string;
  columnLabel: string;
  columnPlaceholder: string;
  options: ReadonlyArray<{ label: string; value: string; count?: number }>;
};
function MultiSelectFacetedTrigger({
  inputId,
  columnLabel,
  columnPlaceholder,
  options,
  ref,
  ...props
}: MultiSelectFacetedTriggerProps & {
  ref?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Button
      {...props}
      aria-controls={`${inputId}-listbox`}
      aria-label={`${columnLabel} filter values`}
      className="h-8 w-full justify-start text-left font-normal"
      id={inputId}
      ref={ref}
      size="sm"
      variant="outline"
    >
      <FacetedBadgeList
        options={[...options]}
        placeholder={`Select ${columnPlaceholder}...`}
      />
    </Button>
  );
}
MultiSelectFacetedTrigger.displayName = "MultiSelectFacetedTrigger";

type FieldSelectorTriggerProps = React.ComponentPropsWithRef<"button"> & {
  fieldListboxId: string;
  triggerId: string;
  label: string;
};
function FieldSelectorTrigger({
  fieldListboxId,
  triggerId,
  label,
  ref,
  ...props
}: FieldSelectorTriggerProps & {
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props}
      aria-controls={fieldListboxId}
      aria-expanded={false}
      aria-label={`Select filter field. Current: ${label}`}
      className="focus:ring-ring h-8 justify-between font-normal focus:ring-1 focus:outline-none"
      id={triggerId}
      onPointerDown={handlePopoverPointerDown}
      ref={ref}
      role="combobox"
      size="sm"
      variant="outline"
    >
      <span className="truncate">{label}</span>
      <ChevronsUpDown className="opacity-50" />
    </Button>
  );
}
FieldSelectorTrigger.displayName = "FieldSelectorTrigger";

type FilterListTriggerProps = React.ComponentPropsWithRef<"button"> & {
  filterCount: number;
};
function FilterListTrigger({
  filterCount,
  ref,
  ...props
}: FilterListTriggerProps & {
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      {...props}
      className="[&_svg]:size-3"
      ref={ref}
      size="sm"
      variant="outline"
    >
      <ListFilter />
      Filter
      {filterCount > 0 && (
        <Badge
          className="h-[1.14rem] rounded-[0.2rem] px-[0.32rem] font-mono text-[0.65rem] font-normal"
          variant="secondary"
        >
          {filterCount}
        </Badge>
      )}
    </Button>
  );
}
FilterListTrigger.displayName = "FilterListTrigger";

// ============================================================================
// FilterInput — renders the value input for a single filter row
// ============================================================================

interface FilterInputProps {
  column: Column<typeof features, RowData>;
  currentFilter: ExtendedColumnFilter | undefined;
  filterId: string;
  filterVariant: string;
  inputId: string;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter, "filterId">>
  ) => void;
  operator: FilterOperator;
}

function FilterInput({
  column,
  operator,
  filterId,
  inputId,
  currentFilter,
  filterVariant,
  onFilterUpdate,
}: FilterInputProps) {
  const columnLabel = column.columnDef.meta?.label ?? column.id;
  const columnPlaceholder = column.columnDef.meta?.label ?? column.id;

  const handleDateRangeSelect = React.useCallback(
    (date: { from?: Date; to?: Date } | undefined) => {
      onFilterUpdate(filterId, {
        value: [
          date?.from ? date.from.toISOString() : undefined,
          date?.to ? date.to.toISOString() : undefined,
        ],
        operator,
      });
    },
    [filterId, onFilterUpdate, operator]
  );

  const handleDateSingleSelect = React.useCallback(
    (date: Date | undefined) => {
      onFilterUpdate(filterId, {
        value: date ? date.toISOString() : undefined,
        operator,
      });
    },
    [filterId, onFilterUpdate, operator]
  );

  const handleNumberRangeMinChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const currentValue = Array.isArray(currentFilter?.value)
        ? currentFilter.value
        : [currentFilter?.value, undefined];
      onFilterUpdate(filterId, {
        value: [
          event.target.value === "" ? undefined : Number(event.target.value),
          currentValue[1] ?? undefined,
        ],
        operator,
      });
    },
    [currentFilter, filterId, onFilterUpdate, operator]
  );

  const handleNumberRangeMaxChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const currentValue = Array.isArray(currentFilter?.value)
        ? currentFilter.value
        : [currentFilter?.value, undefined];
      onFilterUpdate(filterId, {
        value: [
          currentValue[0] ?? undefined,
          event.target.value === "" ? undefined : Number(event.target.value),
        ],
        operator,
      });
    },
    [currentFilter, filterId, onFilterUpdate, operator]
  );

  const handleNumberChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilterUpdate(filterId, {
        value: event.target.value === "" ? "" : Number(event.target.value),
        operator,
      });
    },
    [filterId, onFilterUpdate, operator]
  );

  const handleSelectValueChange = React.useCallback(
    (value: string | undefined) => {
      onFilterUpdate(filterId, { value });
    },
    [filterId, onFilterUpdate]
  );

  const handleMultiSelectValueChange = React.useCallback(
    (value: string[] | undefined) => {
      onFilterUpdate(filterId, { value });
    },
    [filterId, onFilterUpdate]
  );

  const handleTextChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilterUpdate(filterId, { value: event.target.value, operator });
    },
    [filterId, onFilterUpdate, operator]
  );

  const renderDateInput = () => {
    if (operator === "inRange") {
      const currentValue = Array.isArray(currentFilter?.value)
        ? currentFilter.value
        : [currentFilter?.value, undefined];

      const dateRange =
        currentValue[0] || currentValue[1]
          ? {
              from: currentValue[0] ? new Date(currentValue[0]) : undefined,
              to: currentValue[1],
            }
          : undefined;

      return (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={(props) => (
                <DateRangeTrigger
                  {...props}
                  columnLabel={columnLabel}
                  fromFormatted={
                    dateRange?.from
                      ? format(dateRange.from, "LLL dd, y")
                      : undefined
                  }
                  hasDateRange={Boolean(dateRange)}
                  inputId={inputId}
                  toFormatted={
                    dateRange?.to
                      ? format(dateRange.to, "LLL dd, y")
                      : undefined
                  }
                />
              )}
            />

            <PopoverContent
              align="start"
              className="w-auto p-0"
              id={`${inputId}-calendar`}
            >
              <Calendar
                aria-label={`Select ${columnLabel} date range`}
                mode="range"
                numberOfMonths={2}
                onSelect={handleDateRangeSelect}
                {...(dateRange?.from ? { defaultMonth: dateRange.from } : {})}
                {...(dateRange ? { selected: dateRange } : {})}
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    const filterValue =
      typeof currentFilter?.value === "string" ||
      typeof currentFilter?.value === "number"
        ? String(currentFilter.value)
        : undefined;

    const selectedDate = filterValue ? new Date(filterValue) : undefined;

    return (
      <Popover>
        <PopoverTrigger
          render={(props) => (
            <DateSingleTrigger
              {...props}
              columnLabel={columnLabel}
              formatted={
                filterValue ? format(new Date(filterValue), "PP") : undefined
              }
              hasValue={Boolean(currentFilter?.value)}
              inputId={inputId}
            />
          )}
        />

        <PopoverContent
          align="start"
          className="w-auto p-0"
          id={`${inputId}-calendar`}
        >
          <Calendar
            aria-label={`Select ${columnLabel} date`}
            mode="single"
            onSelect={handleDateSingleSelect}
            {...(selectedDate
              ? {
                  defaultMonth: selectedDate,
                  selected: selectedDate,
                }
              : {})}
          />
        </PopoverContent>
      </Popover>
    );
  };

  const renderNumberInput = () => {
    if (operator === "inRange") {
      const currentValue = Array.isArray(currentFilter?.value)
        ? currentFilter.value
        : [currentFilter?.value, undefined];

      return (
        <div className="flex items-center gap-2">
          <Input
            aria-label={`${columnLabel} minimum value`}
            className="h-8"
            id={`${inputId}-min`}
            onChange={handleNumberRangeMinChange}
            placeholder="Min"
            type="number"
            value={currentValue[0] ?? ""}
          />
          <Input
            aria-label={`${columnLabel} maximum value`}
            className="h-8"
            id={`${inputId}-max`}
            onChange={handleNumberRangeMaxChange}
            placeholder="Max"
            type="number"
            value={currentValue[1] ?? ""}
          />
        </div>
      );
    }

    return (
      <Input
        aria-label={`${columnLabel} filter value`}
        className="h-8"
        id={inputId}
        onChange={handleNumberChange}
        placeholder="Enter number..."
        type="number"
        value={
          typeof currentFilter?.value === "number" ||
          typeof currentFilter?.value === "string"
            ? currentFilter.value
            : ""
        }
      />
    );
  };

  const renderSelectInput = () => {
    const selectOptions = getColumnOptions({ column });

    return (
      <Faceted
        onValueChange={handleSelectValueChange}
        value={
          typeof currentFilter?.value === "string" ? currentFilter.value : ""
        }
      >
        <FacetedTrigger>
          <SelectFacetedTrigger
            columnLabel={columnLabel}
            columnPlaceholder={columnPlaceholder}
            inputId={inputId}
            options={selectOptions}
          />
        </FacetedTrigger>
        <FacetedContent id={`${inputId}-listbox`}>
          <FacetedInput
            aria-label={`Search ${columnLabel} options`}
            placeholder={`Search ${columnPlaceholder}...`}
          />
          <FacetedList>
            <FacetedEmpty>No options found.</FacetedEmpty>
            <FacetedGroup>
              {selectOptions.map((option) => (
                <FacetedItem key={option.value} value={option.value}>
                  <span>{option.label}</span>
                  {Boolean(option.count) && (
                    <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                      {option.count}
                    </span>
                  )}
                </FacetedItem>
              ))}
            </FacetedGroup>
          </FacetedList>
        </FacetedContent>
      </Faceted>
    );
  };

  const renderMultiSelectInput = () => {
    const multiSelectOptions = getColumnOptions({ column });
    const selectedValues = isStringArray(currentFilter?.value)
      ? currentFilter.value
      : [];

    return (
      <Faceted
        multiple
        onValueChange={handleMultiSelectValueChange}
        value={selectedValues}
      >
        <FacetedTrigger>
          <MultiSelectFacetedTrigger
            columnLabel={columnLabel}
            columnPlaceholder={columnPlaceholder}
            inputId={inputId}
            options={multiSelectOptions}
          />
        </FacetedTrigger>
        <FacetedContent id={`${inputId}-listbox`}>
          <FacetedInput
            aria-label={`Search ${columnLabel} options`}
            placeholder={`Search ${columnPlaceholder}...`}
          />
          <FacetedList>
            <FacetedEmpty>No options found.</FacetedEmpty>
            <FacetedGroup>
              {multiSelectOptions.map((option) => (
                <FacetedItem key={option.value} value={option.value}>
                  <span>{option.label}</span>
                  {Boolean(option.count) && (
                    <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                      {option.count}
                    </span>
                  )}
                </FacetedItem>
              ))}
            </FacetedGroup>
          </FacetedList>
        </FacetedContent>
      </Faceted>
    );
  };

  const renderTextInput = () => {
    if (operator === "isEmpty" || operator === "isNotEmpty") {
      return (
        <output
          aria-label={`${columnLabel} filter is ${
            operator === "isEmpty" ? "empty" : "not empty"
          }`}
          aria-live="polite"
          className="h-8 w-full rounded-md border border-dashed"
          id={inputId}
        />
      );
    }

    return (
      <Input
        aria-label={`${columnLabel} filter value`}
        className="h-8"
        id={inputId}
        onChange={handleTextChange}
        placeholder={`Search ${columnPlaceholder}...`}
        type="text"
        value={
          typeof currentFilter?.value === "string" ||
          typeof currentFilter?.value === "number"
            ? currentFilter.value
            : ""
        }
      />
    );
  };

  switch (filterVariant) {
    case "date":
      return renderDateInput();
    case "number":
      return renderNumberInput();
    case "select":
      return renderSelectInput();
    case "multi-select":
      return renderMultiSelectInput();
    default:
      return renderTextInput();
  }
}

// ============================================================================
// FilterRow — renders a single filter row (field selector, operator, input, remove)
// ============================================================================

interface FilterRowProps {
  baseId: string;
  column: Column<typeof features, RowData>;
  columnFilters: ExtendedColumnFilter[];
  filter: ExtendedColumnFilter;
  filterableColumns: Array<Column<typeof features, RowData>>;
  filterVariant: string;
  index: number;
  onFilterRemove: (filterId: string) => void;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter, "filterId">>
  ) => void;
  setColumnFilters: (filters: ExtendedColumnFilter[]) => void;
}

function FilterRow({
  filter,
  index,
  baseId,
  column,
  filterVariant,
  filterableColumns,
  columnFilters,
  onFilterUpdate,
  onFilterRemove,
  setColumnFilters,
}: FilterRowProps) {
  const operators = getFilterOperators(filterVariant);
  const filterItemId = `${baseId}-filter-${filter.filterId}`;
  const triggerId = `${filterItemId}-trigger`;
  const joinOperatorListboxId = `${filterItemId}-join-operator-listbox`;
  const fieldListboxId = `${filterItemId}-field-listbox`;
  const operatorListboxId = `${filterItemId}-operator-listbox`;
  const inputId = `${filterItemId}-input`;

  const currentFilter = columnFilters.find(
    (f) => f.filterId === filter.filterId
  );

  const handleJoinOperatorChange = React.useCallback(
    (value: "and" | "or" | null) => {
      if (value === null) return;
      if (columnFilters.length > 0) {
        setColumnFilters(
          columnFilters.map((f) => {
            return { ...f, joinOperator: value };
          })
        );
      }
    },
    [columnFilters, setColumnFilters]
  );

  const handleFieldSelect = React.useCallback(
    (value: string) => {
      if (!filter.filterId) return;
      onFilterUpdate(filter.filterId, { id: value });
    },
    [filter.filterId, onFilterUpdate]
  );

  const handleOperatorChange = React.useCallback(
    (value: FilterOperator | null) => {
      if (value === null) return;
      if (!filter.filterId) return;
      onFilterUpdate(filter.filterId, { operator: value });
    },
    [filter.filterId, onFilterUpdate]
  );

  const handleRemove = React.useCallback(() => {
    if (!filter.filterId) return;
    onFilterRemove(filter.filterId);
  }, [filter.filterId, onFilterRemove]);

  const columnLabel = column.columnDef.meta?.label ?? column.id;

  return (
    <li
      className="grid grid-cols-[70px_135px_125px_minmax(0,200px)_32px] items-center gap-2"
      id={filterItemId}
    >
      {index === 0 ? (
        <span className="text-muted-foreground text-center text-sm">Where</span>
      ) : index === 1 ? (
        <Select
          onValueChange={handleJoinOperatorChange}
          value={filter.joinOperator}
        >
          <SelectTrigger
            aria-controls={joinOperatorListboxId}
            aria-label="Select join operator"
            className="h-8"
          >
            <SelectValue placeholder="Join" />
          </SelectTrigger>
          <SelectContent
            className="min-w-(--anchor-width)"
            id={joinOperatorListboxId}
          >
            <SelectItem value="and">and</SelectItem>
            <SelectItem value="or">or</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground text-center text-sm">
          {filter.joinOperator}
        </span>
      )}

      <Popover>
        <PopoverTrigger
          render={(props) => (
            <FieldSelectorTrigger
              {...props}
              fieldListboxId={fieldListboxId}
              label={columnLabel}
              triggerId={triggerId}
            />
          )}
        />

        <PopoverContent className="w-(--anchor-width) p-0" id={fieldListboxId}>
          <Command>
            <CommandInput
              aria-label="Search filterable columns"
              placeholder="Search columns..."
            />
            <CommandList>
              <CommandEmpty>No column found.</CommandEmpty>
              <CommandGroup>
                {filterableColumns.map((col) => (
                  <CommandItem
                    key={col.id}
                    onSelect={handleFieldSelect}
                    value={col.id}
                  >
                    <span className="truncate">
                      {col.columnDef.meta?.label ?? col.id}
                    </span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-4",
                        col.id === filter.id ? "opacity-100" : "opacity-0"
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
        onValueChange={handleOperatorChange}
        value={filter.operator ?? "includesString"}
      >
        <SelectTrigger
          aria-controls={operatorListboxId}
          aria-label="Select filter operator"
          className="h-8"
        >
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent id={operatorListboxId}>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FilterInput
        column={column}
        currentFilter={currentFilter}
        filterId={filter.filterId ?? ""}
        filterVariant={filterVariant}
        inputId={inputId}
        onFilterUpdate={onFilterUpdate}
        operator={filter.operator ?? "includesString"}
      />

      <Button
        aria-label={`Remove ${columnLabel} filter`}
        className="size-8 [&_svg]:size-3.5"
        onClick={handleRemove}
        size="icon"
        variant="outline"
      >
        <Trash2 />
      </Button>
    </li>
  );
}

// ============================================================================
// DataTableFilterList
// ============================================================================

export function DataTableFilterList(): React.ReactNode {
  const table = useTableContext();
  const columnFilters = table.state.columnFilters as ExtendedColumnFilter[];

  const setColumnFilters = React.useCallback(
    (filters: ExtendedColumnFilter[]) => {
      table.options.onColumnFiltersChange?.(filters);
    },
    [table]
  );

  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);

  const filterableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column: Column<typeof features, RowData>) =>
          column.getCanFilter()
        ),
    [table]
  );

  const getColumnFilterVariant = React.useCallback(
    (column: Column<typeof features, RowData>) => {
      if (column.columnDef.meta?.variant) {
        return column.columnDef.meta.variant;
      }

      const firstValue = table
        .getPreFilteredRowModel()
        .flatRows[0]?.getValue(column.id);

      if (Array.isArray(firstValue)) return "multi-select";
      if (typeof firstValue === "number") return "number";
      if (firstValue instanceof Date) return "date";
      if (column.columnDef.meta?.variant === "select") return "select";

      return "text";
    },
    [table]
  );

  const onFilterAddImpl = React.useCallback(
    (columnId: string): ExtendedColumnFilter | null => {
      const column = filterableColumns.find(
        (col: Column<typeof features, RowData>) => col.id === columnId
      );
      if (!column) return null;

      const filterVariant = getColumnFilterVariant(column);
      const operators = getFilterOperators(filterVariant ?? "text");
      const defaultOperator = operators[0]?.value ?? "includesString";

      if (!isValidFilterOperator(defaultOperator)) return null;

      return {
        id: columnId,
        value: filterVariant === "multi-select" ? [] : "",
        operator: defaultOperator,
        filterId: crypto.randomUUID(),
        joinOperator: "and",
      };
    },
    [filterableColumns, getColumnFilterVariant]
  );

  const onFilterAdd = React.useCallback(() => {
    const [firstFilterableColumn] = filterableColumns;
    if (!firstFilterableColumn) return;

    const newFilter = onFilterAddImpl(firstFilterableColumn.id);
    if (newFilter) {
      setColumnFilters([...columnFilters, newFilter]);
    }
  }, [columnFilters, filterableColumns, onFilterAddImpl, setColumnFilters]);

  const onFilterUpdate = React.useCallback(
    (
      filterId: string,
      updates: Partial<Omit<ExtendedColumnFilter, "filterId">>
    ) => {
      const newFilters = columnFilters.map((filter) => {
        if (filter.filterId === filterId) {
          if (updates.id) {
            const newColumn = filterableColumns.find(
              (col: Column<typeof features, RowData>) => col.id === updates.id
            );
            if (newColumn) {
              const filterVariant = getColumnFilterVariant(newColumn);
              const operators = getFilterOperators(filterVariant ?? "text");
              const defaultOperator = operators[0]?.value ?? "includesString";

              if (!isValidFilterOperator(defaultOperator)) {
                return filter;
              }

              return {
                ...filter,
                ...updates,
                operator: defaultOperator,
                value: filterVariant === "multi-select" ? [] : "",
              };
            }
          }

          if (
            updates.operator &&
            filter.value &&
            isValidFilterOperator(updates.operator)
          ) {
            const column = filterableColumns.find(
              (col: Column<typeof features, RowData>) => col.id === filter.id
            );
            if (column && getColumnFilterVariant(column) === "date") {
              const currentValue = filter.value;
              if (
                updates.operator === "inRange" &&
                !Array.isArray(currentValue)
              ) {
                return {
                  ...filter,
                  ...updates,
                  value: [currentValue, undefined],
                };
              }
              if (
                updates.operator !== "inRange" &&
                Array.isArray(currentValue)
              ) {
                return {
                  ...filter,
                  ...updates,
                  value: currentValue[0] ?? "",
                };
              }
            }
          }

          return { ...filter, ...updates };
        }
        return filter;
      });
      setColumnFilters(newFilters);
    },
    [columnFilters, filterableColumns, getColumnFilterVariant, setColumnFilters]
  );

  const onFilterRemove = React.useCallback(
    (filterId: string) => {
      setColumnFilters(
        columnFilters.filter((filter) => filter.filterId !== filterId)
      );
    },
    [columnFilters, setColumnFilters]
  );

  const handleResetFilters = React.useCallback(() => {
    setColumnFilters([]);
  }, [setColumnFilters]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={(props) => (
          <FilterListTrigger {...props} filterCount={columnFilters.length} />
        )}
      />

      <PopoverContent
        align="start"
        aria-describedby={descriptionId}
        aria-labelledby={labelId}
        className="flex w-[calc(100vw-theme(spacing.12))] min-w-60 origin-(--transform-origin) flex-col gap-3 p-4 sm:w-fit sm:min-w-80"
      >
        <div className="flex flex-col gap-1">
          <h4 className="leading-none font-medium" id={labelId}>
            Filters
          </h4>
          <p
            className={cn(
              "text-muted-foreground text-sm",
              columnFilters.length > 0 && "sr-only"
            )}
            id={descriptionId}
          >
            {columnFilters.length > 0
              ? "Modify filters to refine your results."
              : "Add filters to refine your results."}
          </p>
        </div>
        {columnFilters.length > 0 && (
          <ul
            className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-0.5"
            id={listId}
          >
            {columnFilters.map((filter, index) => {
              const column = table.getColumn(filter.id);
              if (!(column && filter.filterId)) return null;
              const filterVariant = getColumnFilterVariant(column) ?? "text";
              return (
                <FilterRow
                  baseId={id}
                  column={column}
                  columnFilters={columnFilters}
                  filter={filter}
                  filterableColumns={filterableColumns}
                  filterVariant={filterVariant}
                  index={index}
                  key={filter.filterId}
                  onFilterRemove={onFilterRemove}
                  onFilterUpdate={onFilterUpdate}
                  setColumnFilters={setColumnFilters}
                />
              );
            })}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Button aria-label="Add new filter" onClick={onFilterAdd} size="sm">
            Add filter
          </Button>
          {columnFilters.length > 0 && (
            <Button
              aria-label="Reset all filters"
              onClick={handleResetFilters}
              size="sm"
              variant="outline"
            >
              Reset filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
