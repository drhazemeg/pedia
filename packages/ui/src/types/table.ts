import type { features } from "@pedia/ui/components/table/features.ts";
import type {
  BuiltInFilterFn,
  ColumnDef,
  ColumnFilter,
  RowData,
  TableFeatures,
} from "@tanstack/react-table";

export type TableFilterFeatures<TFeatures extends TableFeatures> = Pick<
  TFeatures,
  "columnFilteringFeature" | "columnFacetingFeature"
>;

export type FilterOperator =
  | BuiltInFilterFn
  | "notIncludesString"
  | "notEqualsString"
  | "notEquals"
  | "greaterThan"
  | "notGreaterThan"
  | "greaterThanOrEqualTo"
  | "notGreaterThanOrEqualTo"
  | "lessThan"
  | "notLessThan"
  | "lessThanOrEqualTo"
  | "notLessThanOrEqualTo"
  | "isRelativeToToday"
  | "inRange"
  | "startsWith"
  | "endsWith"
  | "isEmpty"
  | "isNotEmpty";

export type JoinOperator = "and" | "or";

export interface ExtendedColumnFilter extends ColumnFilter {
  filterId?: string;
  joinOperator?: JoinOperator;
  operator?: FilterOperator;
}
export interface TableColumnMeta {
  filterable?: boolean;
  groupable?: boolean;
  hideable?: boolean;
  label?: string;
  maxSize?: number;
  minSize?: number;
  options?: Array<{ label: string; value: string; count?: number }>;
  pinable?: boolean;
  size?: number;
  sortable?: boolean;
  variant?: "text" | "number" | "date" | "boolean" | "select" | "multi-select";
}

export type ExtendedColumnDef<TData extends RowData = RowData> = ColumnDef<
  typeof features,
  TData
> & {
  meta?: TableColumnMeta;
};
