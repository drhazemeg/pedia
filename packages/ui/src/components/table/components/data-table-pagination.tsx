// ui/table/components/data-table-pagination.tsx

import { Button } from "@pedia/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pedia/ui/components/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useCallback } from "react";

import { useTableContext } from "../table-context";

const DEFAULT_PAGE_SIZE_OPTIONS = [
  10,
  20,
  30,
  40,
  50,
  Number.POSITIVE_INFINITY,
] as const;

export function DataTablePagination({
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
}): React.ReactNode {
  const table = useTableContext();

  const handleFirstPage = useCallback(() => {
    table.setPageIndex(0);
  }, [table]);

  const handlePreviousPage = useCallback(() => {
    table.previousPage();
  }, [table]);

  const handleNextPage = useCallback(() => {
    table.nextPage();
  }, [table]);

  const handleLastPage = useCallback(() => {
    table.lastPage();
  }, [table]);

  return (
    <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
      <div className="text-muted-foreground flex-1 text-sm whitespace-nowrap">
        {table.getFilteredSelectedRowModel().rows.length.toLocaleString()} of{" "}
        {table.getFilteredRowModel().rows.length.toLocaleString()} row(s)
        selected.
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
          <Select
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={`${table.state.pagination.pageSize}`}
          >
            <SelectTrigger className="h-8 w-[4.5rem]">
              <SelectValue placeholder={table.state.pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize === Number.POSITIVE_INFINITY
                    ? "All"
                    : String(pageSize)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {(table.state.pagination.pageIndex + 1).toLocaleString()} of{" "}
          {table.getPageCount().toLocaleString()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            className="hidden size-8 p-0 lg:flex"
            disabled={!table.getCanPreviousPage()}
            onClick={handleFirstPage}
            variant="outline"
          >
            <ChevronsLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Go to previous page"
            className="size-8"
            disabled={!table.getCanPreviousPage()}
            onClick={handlePreviousPage}
            size="icon"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Go to next page"
            className="size-8"
            disabled={!table.getCanNextPage()}
            onClick={handleNextPage}
            size="icon"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Go to last page"
            className="hidden size-8 lg:flex"
            disabled={!table.getCanLastPage()}
            onClick={handleLastPage}
            size="icon"
            variant="outline"
          >
            <ChevronsRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
