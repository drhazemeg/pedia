import { Card, CardContent, CardFooter } from "@pedia/ui/components/card";
import type { Icons } from "@pedia/ui/components/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pedia/ui/components/table";
import type {
  Cell,
  HeaderGroup,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  Updater,
} from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { lazy, Suspense, useMemo } from "react";

import type { features } from "../features";
import { useAppTable } from "../table";
import { DataTableEmptyState } from "./data-table-empty-state";
import { DataTableLoading } from "./data-table-loading";

const DataTablePagination = lazy(() =>
  import("./data-table-pagination").then((m) => {
    return {
      default: m.DataTablePagination,
    };
  })
);

export type DataTableProps<TData extends { id?: unknown }> = {
  data: TData[];
  columns: Parameters<typeof useAppTable<TData>>[0]["columns"];
  isLoading?: boolean;
  error?: Error | null;
  refetch?: () => void;
  showPagination?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showSorting?: boolean;
  showViewOptions?: boolean;
  emptyMessage?: string;
  emptyIcon?:
    | keyof typeof Icons
    | Exclude<ReactNode, string | number | boolean | null | undefined>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  className?: string;
  manualPagination?: boolean;
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  virtualize?: boolean;
  /** Estimated row height for virtualization (default: 48) */
  rowHeight?: number;
  /** Container height for virtual scrolling (default: 400) */
  height?: number;
};

export function DataTable<TData extends { id?: unknown }>({
  data,
  columns,
  isLoading = false,
  error = null,
  refetch,
  showPagination = true,
  showSearch = false,
  showFilters = false,
  showSorting = false,
  showViewOptions = false,
  emptyMessage = "No results found",
  emptyIcon,
  rowSelection,
  onRowSelectionChange,
  className,
  manualPagination = false,
  pageCount,
  pageIndex = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData>) {
  const paginationState = useMemo(() => {
    return { pageIndex, pageSize };
  }, [pageIndex, pageSize]);
  const tableState = useMemo(() => {
    return {
      ...(rowSelection === undefined ? {} : { rowSelection }),
      pagination: paginationState,
    };
  }, [rowSelection, paginationState]);

  const handlePaginationChange: OnChangeFn<PaginationState> = useMemo(
    () => (updater: Updater<PaginationState>) => {
      const next =
        typeof updater === "function" ? updater(paginationState) : updater;
      onPageChange?.(next.pageIndex + 1);
      onPageSizeChange?.(next.pageSize);
    },
    [paginationState, onPageChange, onPageSizeChange]
  );
  const table = useAppTable({
    data,
    columns,
    state: tableState,
    ...(onRowSelectionChange === undefined ? {} : { onRowSelectionChange }),
    onPaginationChange: handlePaginationChange,
    manualPagination,
    ...(pageCount === undefined ? {} : { pageCount }),
  });

  if (isLoading) {
    return <DataTableLoading columns={columns.length} rows={5} />;
  }

  if (error) {
    return (
      <DataTableEmptyState
        actionLabel="Try Again"
        icon="error"
        message={error.message || "An error occurred while loading data"}
        {...(refetch ? { onAction: refetch } : {})}
        title="Error Loading Data"
      />
    );
  }

  if (data.length === 0) {
    return (
      <DataTableEmptyState
        icon={emptyIcon}
        message={emptyMessage}
        title="No Results Found"
      />
    );
  }

  return (
    <Card className={className}>
      {showSearch || showFilters || showSorting || showViewOptions ? (
        <div className="flex flex-wrap items-center gap-4 border-b p-4">
          {showSearch ? (
            <div className="min-w-[200px] flex-1">{/* Search component */}</div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {showFilters ? <div>{/* Filter component */}</div> : null}
            {showSorting ? <div>{/* Sort component */}</div> : null}
            {showViewOptions ? <div>{/* View options */}</div> : null}
          </div>
        </div>
      ) : null}

      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              {table
                .getHeaderGroups()
                .map((headerGroup: HeaderGroup<typeof features, TData>) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  className={row.getIsSelected() ? "bg-muted/50" : ""}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  key={row.id}
                >
                  {row
                    .getVisibleCells()
                    .map((cell: Cell<typeof features, TData>) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {showPagination ? (
        <CardFooter className="border-t p-4">
          <Suspense>
            <DataTablePagination
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </Suspense>
        </CardFooter>
      ) : null}
    </Card>
  );
}
