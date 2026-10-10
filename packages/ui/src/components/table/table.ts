// packages/tanstack/src/table/table.ts
import { createTableHook } from "@tanstack/react-table";
import { lazy } from "react";

// Eager: small, hot-path components rendered per-cell / per-header
import {
  ActionsCell,
  AgeAggregatedCell,
  AgeCell,
  DateCell,
  GroupedCell,
  JoinDateAggregatedCell,
  SelectCell,
  StatusCell,
  TextCell,
} from "./components/cell-components";
import { ColumnHeader } from "./components/data-table-column-header";
import { ResizeHandle, SelectAllHeader } from "./components/header-components";
import { features } from "./features";
import { dynamicFilterFn } from "./filters";
import { cellContext, headerContext, tableContext } from "./table-context";

// Lazy: heavy popover/command/dnd-based toolbars (cold path)
const DataTablePagination = lazy(() =>
  import("./components/data-table-pagination").then((m) => {
    return {
      default: m.DataTablePagination,
    };
  })
);
const DataTableFilterList = lazy(() =>
  import("./components/data-table-filter-list").then((m) => {
    return {
      default: m.DataTableFilterList,
    };
  })
);
const DataTableSortList = lazy(() =>
  import("./components/data-table-sort-list").then((m) => {
    return {
      default: m.DataTableSortList,
    };
  })
);
const DataTableViewOptions = lazy(() =>
  import("./components/data-table-view-options").then((m) => {
    return {
      default: m.DataTableViewOptions,
    };
  })
);

export const {
  createAppColumnHelper,
  useAppTable,
  useTableContext,
  useCellContext,
  useHeaderContext,
} = createTableHook({
  features,
  tableContext,
  cellContext,
  headerContext,
  defaultColumn: {
    size: 120,
    minSize: 60,
    maxSize: 800,
    filterFn: dynamicFilterFn, // autoRemove is now attached to this function
  },
  globalFilterFn: "fuzzy",
  getRowId: (row: Record<string, unknown>) =>
    typeof row.id === "string" ? row.id : "",
  enableRowSelection: true,
  columnResizeMode: "onChange" as const,

  tableComponents: {
    Pagination: DataTablePagination,
    FilterList: DataTableFilterList,
    SortList: DataTableSortList,
    ViewOptions: DataTableViewOptions,
  },

  cellComponents: {
    SelectCell,
    TextCell,
    AgeCell,
    StatusCell,
    DateCell,
    GroupedCell,
    ActionsCell,
    AgeAggregatedCell,
    JoinDateAggregatedCell,
  },

  headerComponents: {
    ColumnHeader,
    SelectAllHeader,
    ResizeHandle,
  },
});

export { cellContext, headerContext, tableContext } from "./table-context";

export type DataTableConfig = typeof dataTableConfig;

export const dataTableConfig = {
  textOperators: [
    { label: "Contains", value: "includesString" as const },
    { label: "Does not contain", value: "notIncludesString" as const },
    { label: "Is", value: "equalsString" as const },
    { label: "Is not", value: "notEqualsString" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  numericOperators: [
    { label: "Is", value: "equals" as const },
    { label: "Is not", value: "notEquals" as const },
    { label: "Is less than", value: "lessThan" as const },
    {
      label: "Is less than or equal to",
      value: "lessThanOrEqualTo" as const,
    },
    { label: "Is greater than", value: "greaterThan" as const },
    {
      label: "Is greater than or equal to",
      value: "greaterThanOrEqualTo" as const,
    },
    { label: "Is between", value: "inRange" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  dateOperators: [
    { label: "Is", value: "equals" as const },
    { label: "Is not", value: "notEquals" as const },
    { label: "Is before", value: "lessThan" as const },
    { label: "Is after", value: "greaterThan" as const },
    { label: "Is on or before", value: "lessThanOrEqualTo" as const },
    { label: "Is on or after", value: "greaterThanOrEqualTo" as const },
    { label: "Is between", value: "inRange" as const },
    { label: "Is relative to today", value: "isRelativeToToday" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  selectOperators: [
    { label: "Is", value: "equals" as const },
    { label: "Is not", value: "notEquals" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  multiSelectOperators: [
    { label: "Has any of", value: "arrIncludes" as const },
    { label: "Has none of", value: "notArrIncludes" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  booleanOperators: [
    { label: "Is", value: "equals" as const },
    { label: "Is not", value: "notEquals" as const },
  ],
  sortOrders: [
    { label: "Asc", value: "asc" as const },
    { label: "Desc", value: "desc" as const },
  ],
  filterVariants: [
    "text",
    "number",
    "range",
    "date",
    "dateRange",
    "boolean",
    "select",
    "multiSelect",
  ] as const,
  operators: [
    "includesString",
    "notIncludesString",
    "equalsString",
    "notEqualsString",
    "equals",
    "notEquals",
    "arrIncludes",
    "notArrIncludes",
    "isEmpty",
    "isNotEmpty",
    "lessThan",
    "lessThanOrEqualTo",
    "greaterThan",
    "greaterThanOrEqualTo",
    "inRange",
    "isRelativeToToday",
    "startsWith",
    "endsWith",
  ] as const,
  joinOperators: ["and", "or"] as const,
};
