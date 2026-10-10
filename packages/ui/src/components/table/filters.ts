import type { FilterFn, RowData } from "@tanstack/react-table";

import type {
  ExtendedColumnFilter,
  FilterOperator,
  features,
  JoinOperator,
} from ".";

function toDateSafe(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const SENTINEL_EMPTY = "__empty__";

const fx = {
  equals: (rowValue: unknown, filterValue: unknown): boolean => {
    if (Array.isArray(filterValue)) {
      return filterValue.some((v) => fx.equals(rowValue, v));
    }
    const rowDate = toDateSafe(rowValue);
    const filterDate = toDateSafe(filterValue);
    if (rowDate && filterDate) return isSameDay(rowDate, filterDate);
    if (rowValue === filterValue) return true;
    const rowNum = Number(rowValue);
    const filterNum = Number(filterValue);
    if (!(Number.isNaN(rowNum) || Number.isNaN(filterNum))) {
      return rowNum === filterNum;
    }
    return toStringSafe(rowValue) === toStringSafe(filterValue);
  },
  greaterThan: (rowValue: unknown, filterValue: unknown): boolean => {
    const rowDate = toDateSafe(rowValue);
    const filterDate = toDateSafe(filterValue);
    if (rowDate && filterDate) return rowDate.getTime() > filterDate.getTime();
    const rowNum = Number(rowValue);
    const filterNum = Number(filterValue);
    return (
      !(Number.isNaN(rowNum) || Number.isNaN(filterNum)) && rowNum > filterNum
    );
  },
  greaterThanOrEqualTo: (rowValue: unknown, filterValue: unknown): boolean => {
    const rowDate = toDateSafe(rowValue);
    const filterDate = toDateSafe(filterValue);
    if (rowDate && filterDate) return rowDate.getTime() >= filterDate.getTime();
    const rowNum = Number(rowValue);
    const filterNum = Number(filterValue);
    return (
      !(Number.isNaN(rowNum) || Number.isNaN(filterNum)) && rowNum >= filterNum
    );
  },
  lessThan: (rowValue: unknown, filterValue: unknown): boolean => {
    const rowDate = toDateSafe(rowValue);
    const filterDate = toDateSafe(filterValue);
    if (rowDate && filterDate) return rowDate.getTime() < filterDate.getTime();
    const rowNum = Number(rowValue);
    const filterNum = Number(filterValue);
    return (
      !(Number.isNaN(rowNum) || Number.isNaN(filterNum)) && rowNum < filterNum
    );
  },
  lessThanOrEqualTo: (rowValue: unknown, filterValue: unknown): boolean => {
    const rowDate = toDateSafe(rowValue);
    const filterDate = toDateSafe(filterValue);
    if (rowDate && filterDate) return rowDate.getTime() <= filterDate.getTime();
    const rowNum = Number(rowValue);
    const filterNum = Number(filterValue);
    return (
      !(Number.isNaN(rowNum) || Number.isNaN(filterNum)) && rowNum <= filterNum
    );
  },
  inRange: (rowValue: unknown, filterValue: unknown): boolean => {
    if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
    const [min, max] = filterValue;
    const hasMin = min !== undefined && min !== null && min !== "";
    const hasMax = max !== undefined && max !== null && max !== "";
    if (!(hasMin || hasMax)) return true;
    const rowDate = toDateSafe(rowValue);
    if (rowDate) {
      const minDate = hasMin ? toDateSafe(min) : null;
      const maxDate = hasMax ? toDateSafe(max) : null;
      if (hasMin && !minDate) return false;
      if (hasMax && !maxDate) return false;
      const t = rowDate.getTime();
      if (minDate && t < minDate.getTime()) return false;
      if (maxDate && t > maxDate.getTime()) return false;
      return true;
    }
    const rowNum = Number(rowValue);
    if (Number.isNaN(rowNum)) return false;
    if (hasMin && rowNum < Number(min)) return false;
    if (hasMax && rowNum > Number(max)) return false;
    return true;
  },
  isEmpty: (rowValue: unknown): boolean =>
    rowValue === undefined ||
    rowValue === null ||
    rowValue === "" ||
    (Array.isArray(rowValue) && rowValue.length === 0),
  startsWith: (rowValue: unknown, filterValue: unknown): boolean =>
    toStringSafe(rowValue)
      .toLowerCase()
      .startsWith(toStringSafe(filterValue).toLowerCase().trim()),
  endsWith: (rowValue: unknown, filterValue: unknown): boolean =>
    toStringSafe(rowValue)
      .toLowerCase()
      .endsWith(toStringSafe(filterValue).toLowerCase().trim()),
  includesString: (rowValue: unknown, filterValue: unknown): boolean =>
    toStringSafe(rowValue)
      .toLowerCase()
      .includes(toStringSafe(filterValue).toLowerCase()),
  equalsString: (rowValue: unknown, filterValue: unknown): boolean =>
    toStringSafe(rowValue).toLowerCase() ===
    toStringSafe(filterValue).toLowerCase(),
  arrIncludes: (rowValue: unknown, filterValue: unknown): boolean => {
    if (!Array.isArray(rowValue)) return false;
    if (Array.isArray(filterValue)) {
      return filterValue.some((v) => rowValue.includes(v));
    }
    return rowValue.includes(filterValue);
  },
  isRelativeToToday: (rowValue: unknown, filterValue: unknown): boolean => {
    const rowDate = toDateSafe(rowValue);
    if (!rowDate) return false;
    const rowMidnight = new Date(
      rowDate.getFullYear(),
      rowDate.getMonth(),
      rowDate.getDate()
    );
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffInDays = Math.round(
      (rowMidnight.getTime() - todayMidnight.getTime()) / 86_400_000
    );
    if (typeof filterValue === "number") return diffInDays === filterValue;
    if (typeof filterValue === "string") {
      const n = Number.parseInt(filterValue, 10);
      return !Number.isNaN(n) && diffInDays === n;
    }
    if (Array.isArray(filterValue) && filterValue.length === 2) {
      const [min, max] = filterValue;
      const minDays =
        typeof min === "number" ? min : Number.parseInt(String(min), 10);
      const maxDays =
        typeof max === "number" ? max : Number.parseInt(String(max), 10);
      if (Number.isNaN(minDays) || Number.isNaN(maxDays)) return false;
      return diffInDays >= minDays && diffInDays <= maxDays;
    }
    return false;
  },
} as const;

export { fx as filterOperations };

function evaluateOperator(
  op: FilterOperator,
  rowValue: unknown,
  filterValue: unknown
): boolean {
  switch (op) {
    case "includesString":
      return fx.includesString(rowValue, filterValue);
    case "includesStringSensitive":
      return String(rowValue).includes(String(filterValue));
    case "notIncludesString":
      return !fx.includesString(rowValue, filterValue);
    case "equalsString":
      return fx.equalsString(rowValue, filterValue);
    case "equalsStringSensitive":
      return String(rowValue) === String(filterValue);
    case "notEqualsString":
      return !fx.equalsString(rowValue, filterValue);
    case "startsWith":
      return fx.startsWith(rowValue, filterValue);
    case "endsWith":
      return fx.endsWith(rowValue, filterValue);
    case "isEmpty":
    case "empty":
      return fx.isEmpty(rowValue);
    case "isNotEmpty":
    case "notEmpty":
      return !fx.isEmpty(rowValue);
    case "equals":
    case "weakEquals":
      return fx.equals(rowValue, filterValue);
    case "notEquals":
      return !fx.equals(rowValue, filterValue);
    case "greaterThan":
      return fx.greaterThan(rowValue, filterValue);
    case "notGreaterThan":
      return !fx.greaterThan(rowValue, filterValue);
    case "greaterThanOrEqualTo":
      return fx.greaterThanOrEqualTo(rowValue, filterValue);
    case "notGreaterThanOrEqualTo":
      return !fx.greaterThanOrEqualTo(rowValue, filterValue);
    case "lessThan":
      return fx.lessThan(rowValue, filterValue);
    case "notLessThan":
      return !fx.lessThan(rowValue, filterValue);
    case "lessThanOrEqualTo":
      return fx.lessThanOrEqualTo(rowValue, filterValue);
    case "notLessThanOrEqualTo":
      return !fx.lessThanOrEqualTo(rowValue, filterValue);
    case "inRange":
    case "between":
    case "betweenInclusive":
      return fx.inRange(rowValue, filterValue);
    case "inNumberRange":
      return fx.inRange(rowValue, filterValue);
    case "inDateRange":
      return fx.inRange(rowValue, filterValue);
    case "isRelativeToToday":
      return fx.isRelativeToToday(rowValue, filterValue);
    case "arrIncludes":
    case "arrIncludesSome":
    case "arrHas":
      return fx.arrIncludes(rowValue, filterValue);
    case "arrIncludesAll":
      if (!Array.isArray(rowValue) || !Array.isArray(filterValue)) return false;
      return filterValue.every((v) => rowValue.includes(v));
    default: {
      op satisfies never;
      return filterValue === undefined
        ? true
        : fx.includesString(rowValue, filterValue);
    }
  }
}
const columnFiltersCache = new WeakMap<
  readonly ExtendedColumnFilter[],
  Map<string, readonly ExtendedColumnFilter[]>
>();

function getFiltersForColumn(
  columnFilters: readonly ExtendedColumnFilter[],
  columnId: string
): readonly ExtendedColumnFilter[] {
  let perColumn = columnFiltersCache.get(columnFilters);
  if (!perColumn) {
    perColumn = new Map();
    columnFiltersCache.set(columnFilters, perColumn);
  }
  let filters = perColumn.get(columnId);
  if (!filters) {
    filters = columnFilters.filter((f) => f.id === columnId);
    perColumn.set(columnId, filters);
  }
  return filters;
}

type AppFilterFn = FilterFn<typeof features, RowData>;
function isFalsy(val: unknown): boolean {
  return (
    val === undefined ||
    val === null ||
    val === "" ||
    (Array.isArray(val) && val.length === 0)
  );
}

const dynamicFilterFnImpl: AppFilterFn = (row, columnId, _filterValue) => {
  // Read the filter array from the store. This is the ONLY source that has
  // the `operator` / `joinOperator` fields we need.
  const allFilters = (
    row.table.store.state as {
      columnFilters?: readonly ExtendedColumnFilter[];
    }
  ).columnFilters;

  // ── Nothing to filter by ────────────────────────────────────────────────
  if (!allFilters || allFilters.length === 0) return true;

  // ── Fast path: exactly one filter total ─────────────────────────────────
  // Covers "user typed in the search box" without allocating a per-column
  // slice or touching the WeakMap.
  if (allFilters.length === 1) {
    const only = allFilters[0];
    // TypeScript may still see `only` as possibly undefined. Guard explicitly.
    if (!only || only.id !== columnId) return true;

    const op = only.operator ?? "includesString";
    const value = only.value;

    if (isFalsy(value) && op !== "isEmpty" && op !== "isNotEmpty") return true;

    return evaluateOperator(op, row.getValue(columnId), value);
  }

  // ── Slow path: multiple filters ─────────────────────────────────────────
  // Per-column slice is memoized on the `columnFilters` array reference via
  // WeakMap (see `getFiltersForColumn` in the parent module).
  const filters = getFiltersForColumn(allFilters, columnId);
  if (filters.length === 0) return true;

  const rowValue = row.getValue(columnId);

  let pass = true;
  let joinOperator: JoinOperator = "and";

  for (const [index, filter] of filters.entries()) {
    const op = filter.operator ?? "includesString";
    const value = filter.value;
    const nextJoin = filter.joinOperator ?? "and";

    // Short-circuit: `and` with a failed predicate can bail; `or` with a
    // passing predicate can skip.
    if (index > 0) {
      if (joinOperator === "and" && !pass) break;
      if (joinOperator === "or" && pass) continue;
    }

    // Empty values are skipped for non-empty-aware operators.
    if (isFalsy(value) && op !== "isEmpty" && op !== "isNotEmpty") {
      continue;
    }

    const result = evaluateOperator(op, rowValue, value);

    if (index === 0) {
      pass = result;
    } else {
      pass = joinOperator === "and" ? pass && result : pass || result;
    }

    joinOperator = nextJoin;
  }

  return pass;
};
dynamicFilterFnImpl.autoRemove = isFalsy;

export const dynamicFilterFn = dynamicFilterFnImpl;

// ============================================================
// Public API (unchanged surface)
// ============================================================

export const createFilterFn = ({
  filter,
  resolveFilterValue,
  resolveDataValue,
}: {
  filter: (dataValue: unknown, filterValue: unknown) => boolean;
  resolveFilterValue?: (val: unknown) => unknown;
  resolveDataValue?: (val: unknown) => unknown;
}): FilterFn<typeof features, RowData> => {
  const fn: FilterFn<typeof features, RowData> = (
    row,
    columnId,
    filterValue
  ) => {
    const dataValue = row.getValue(columnId);
    const resolvedFilter = resolveFilterValue?.(filterValue) ?? filterValue;
    const resolvedData = resolveDataValue?.(dataValue) ?? dataValue;
    return filter(resolvedData, resolvedFilter);
  };

  fn.autoRemove = isFalsy;
  return fn;
};

// `autoRemove` on the dynamic filter: drop the filter from the pipeline when
// the value is empty, so we never run the per-row loop for a blank filter.
dynamicFilterFn.autoRemove = isFalsy;

export const EMPTY_SENTINEL = SENTINEL_EMPTY;

// Keep the full operator table exported for the UI layer.
export function getFilterOperators(type: string): Array<{
  label: string;
  value: FilterOperator;
}> {
  switch (type) {
    case "text":
      return [
        { label: "contains", value: "includesString" },
        { label: "does not contain", value: "notIncludesString" },
        { label: "starts with", value: "startsWith" },
        { label: "ends with", value: "endsWith" },
        { label: "is", value: "equalsString" },
        { label: "is not", value: "notEqualsString" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    case "number":
    case "range":
      return [
        { label: "is", value: "equals" },
        { label: "is not", value: "notEquals" },
        { label: "is less than", value: "lessThan" },
        {
          label: "is less than or equal to",
          value: "lessThanOrEqualTo",
        },
        { label: "is greater than", value: "greaterThan" },
        {
          label: "is greater than or equal to",
          value: "greaterThanOrEqualTo",
        },
        { label: "is between", value: "inRange" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    case "date":
    case "dateRange":
      return [
        { label: "is", value: "equals" },
        { label: "is not", value: "notEquals" },
        { label: "is before", value: "lessThan" },
        { label: "is on or before", value: "lessThanOrEqualTo" },
        { label: "is after", value: "greaterThan" },
        { label: "is on or after", value: "greaterThanOrEqualTo" },
        { label: "is between", value: "inRange" },
        { label: "is relative to today", value: "isRelativeToToday" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    case "boolean":
      return [
        { label: "is", value: "equals" },
        { label: "is not", value: "notEquals" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    case "select":
      return [
        { label: "is", value: "equals" },
        { label: "is not", value: "notEquals" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    case "multiSelect":
      return [
        { label: "has any of", value: "arrIncludes" },
        { label: "has some of", value: "arrIncludesSome" },
        { label: "is empty", value: "isEmpty" },
        { label: "is not empty", value: "isNotEmpty" },
      ];
    default:
      return [
        { label: "contains", value: "includesString" },
        { label: "does not contain", value: "notIncludesString" },
        { label: "is", value: "equalsString" },
        { label: "is not", value: "notEqualsString" },
      ];
  }
}
