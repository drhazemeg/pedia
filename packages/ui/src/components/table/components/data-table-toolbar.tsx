import { Input } from "@pedia/ui/components/input";
import { cn } from "@pedia/ui/lib/utils";
import { Search } from "lucide-react";
import type { JSX } from "react";

import { DataTableFilterList } from "./data-table-filter-list";
import { DataTableSortList } from "./data-table-sort-list";
import { DataTableViewOptions } from "./data-table-view-options";

type DataTableToolbarTable = {
  getState: () => { globalFilter?: string };
  setGlobalFilter: (value: string) => void;
};

interface DataTableToolbarProps {
  className?: string;
  searchPlaceholder?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  showSorting?: boolean;
  showViewOptions?: boolean;
  table: DataTableToolbarTable;
}

export function DataTableToolbar({
  table,
  showSearch = true,
  showFilters = true,
  showSorting = true,
  showViewOptions = true,
  className,
  searchPlaceholder = "Search...",
}: DataTableToolbarProps): JSX.Element {
  const searchValue = table.getState().globalFilter ?? "";

  const searchNode = showSearch ? (
    <div className="min-w-[200px] flex-1">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
        <Input
          className="h-9 w-full pl-8"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          value={searchValue}
        />
      </div>
    </div>
  ) : null;

  const actionNode = (
    <div className="flex flex-wrap items-center gap-2">
      {showFilters ? <DataTableFilterList /> : null}
      {showSorting ? <DataTableSortList /> : null}
      {showViewOptions ? <DataTableViewOptions /> : null}
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 border-b p-4",
        className
      )}
    >
      {searchNode}
      {actionNode}
    </div>
  );
}
