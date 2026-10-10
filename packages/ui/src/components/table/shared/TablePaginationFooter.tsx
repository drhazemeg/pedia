import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";

export interface TablePaginationFooterProps {
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions?: number[];
  total: number;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function TablePaginationFooter({
  pageIndex,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationFooterProps): React.ReactNode {
  if (total === 0) return null;

  const firstRow = pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <nav className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row">
      <div className="flex items-center gap-4">
        <span>
          Showing {firstRow}–{lastRow} of {total}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 focus:outline-none"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              value={pageSize}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          type="button"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span>
          Page {pageIndex + 1} of {Math.max(1, pageCount)}
        </span>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
          type="button"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </nav>
  );
}
