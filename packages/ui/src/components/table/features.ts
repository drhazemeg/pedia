// src/lib/tanstack/table/features.ts

import { rankItem } from "@tanstack/match-sorter-utils";
import type { QueryKey } from "@tanstack/react-query";
import type { FilterFn, Row, RowData } from "@tanstack/react-table";
import {
  aggregationFn_mean,
  aggregationFn_min,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  metaHelper,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
} from "@tanstack/react-table";

/* ------------------------------------------------------------------ */
/* Column meta                                                         */
/* ------------------------------------------------------------------ */

/**
 * Metadata attached to every column definition.
 *
 * `variant` drives which filter UI renders (see data-table-filter-list).
 * Keep this a discriminated-friendly union so `meta.options` is only
 * required for `select` / `multi-select`.
 */
export type MyColumnMeta = {
  label?: string;
  variant?: "text" | "number" | "date" | "boolean" | "select" | "multi-select";
  options?: ReadonlyArray<{ label: string; value: string; count?: number }>;
};

/** Convenience alias for a strongly-typed column filter option. */
export type ColumnFilterOption = NonNullable<MyColumnMeta["options"]>[number];

/* ------------------------------------------------------------------ */
/* Table meta                                                          */
/* ------------------------------------------------------------------ */

export interface MyTableMeta {
  /** Optional caption for empty states. */
  emptyMessage?: string;
  queryKeys?: QueryKey;
}

/* ------------------------------------------------------------------ */
/* Fuzzy filter — properly typed, no `any`                             */
/* ------------------------------------------------------------------ */

/**
 * Shape of the metadata attached by the fuzzy filter to each row via
 * `addMeta`. Exposed so other code (e.g. a "best match" column) can
 * consume it in a typed way.
 */
export type FuzzyFilterMeta = {
  itemRank: ReturnType<typeof rankItem>;
};

/**
 * TanStack's `FilterFn` is generic over `TFeatures` and `TData`. Because we
 * are *inside* the `tableFeatures({...})` call that defines the features,
 * we can't reference `typeof features` here (circular).
 *
 * The pragmatic solution is to declare the function against the smallest
 * feature set that supports `globalFilteringFeature` and let TypeScript
 * widen it when passed to `tableFeatures`.
 *
 * Runtime contract (verified by TanStack):
 *   - `row.getValue(columnId)` returns the cell value for the current row
 *   - `filterValue` is whatever the user typed (typically a string)
 *   - `addMeta(meta)` registers row-level filter metadata
 */
const fuzzyFilterFn: FilterFn<
  { globalFilteringFeature: typeof globalFilteringFeature },
  RowData
> = (
  row: Row<{ globalFilteringFeature: typeof globalFilteringFeature }, RowData>,
  columnId: string,
  filterValue: unknown,
  addMeta?: (meta: FuzzyFilterMeta) => void
) => {
  // Coerce both sides to strings so `rankItem` always receives valid input.
  // Empty query → match everything (no filtering).
  const query = typeof filterValue === "string" ? filterValue : "";
  if (query.trim() === "") return true;

  const cellValue = row.getValue(columnId);
  if (cellValue === null || cellValue === undefined) return false;

  const text =
    typeof cellValue === "string"
      ? cellValue
      : typeof cellValue === "number" || typeof cellValue === "boolean"
        ? String(cellValue)
        : JSON.stringify(cellValue);

  const itemRank = rankItem(text, query);
  addMeta?.({ itemRank });
  return itemRank.passed;
};

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

export const features = tableFeatures({
  // Row models — order matters: filter → sort → group → expand → paginate
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),

  // Feature flags — every one is required at runtime for the toolbar/filters
  // to work. Adding a feature here is what unlocks the corresponding atoms
  // and column helpers on `table` / `column`.
  rowAggregationFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnFacetingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  columnGroupingFeature,

  // Meta helpers — must be declared *before* any usage of `column.meta`
  // or `table.options.meta` for inference to flow to consumers.
  tableMeta: metaHelper<MyTableMeta>(),
  columnMeta: metaHelper<MyColumnMeta>(),

  // Custom filter functions — keyed by the string consumers use in
  // `columnDef.filterFn: "fuzzy"` and `tableFeatures({ globalFilterFn: "fuzzy" })`.
  //
  // The cast is avoided: `FilterFn<{ globalFilteringFeature }, RowData>` is
  // structurally compatible with what `tableFeatures` expects for its
  // `filterFns` slot when `globalFilteringFeature` is present.
  filterFns: {
    fuzzy: fuzzyFilterFn,
  },

  // Sort functions — these are the built-ins the app relies on
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
    basic: sortFn_basic,
    caseSensitive: sortFn_textCaseSensitive,
  },

  // Aggregation functions — used by grouped-row model
  aggregationFns: {
    mean: aggregationFn_mean,
    min: aggregationFn_min,
  },
});

export type TanstackFeatures = typeof features;
export type DataTableFeatures = typeof features;
