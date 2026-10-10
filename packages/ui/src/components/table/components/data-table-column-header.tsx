import { Button } from "@pedia/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import { cn } from "@pedia/ui/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
  Group,
  Pin,
  PinOff,
  Ungroup,
} from "lucide-react";
import { useCallback } from "react";

import { useHeaderContext, useTableContext } from "../table-context";

export function ColumnHeader({
  title,
  className,
}: {
  title?: string;
  className?: string;
}): React.ReactNode {
  const header = useHeaderContext();
  const table = useTableContext();
  const { column } = header;

  const displayTitle = column.columnDef.meta?.label ?? title ?? column.id;

  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const canPin = column.getCanPin();
  const canGroup = column.getCanGroup();

  // All hooks must be called at the top level
  const handleSortAsc = useCallback(() => {
    if (canSort) column.toggleSorting(false);
  }, [column, canSort]);
  const handleSortDesc = useCallback(() => {
    if (canSort) column.toggleSorting(true);
  }, [column, canSort]);
  const handleToggleGrouping = useCallback(() => {
    if (canGroup) column.getToggleGroupingHandler()?.();
  }, [column, canGroup]);
  const handlePinLeft = useCallback(() => {
    if (canPin) column.pin("start");
  }, [column, canPin]);
  const handlePinRight = useCallback(() => {
    if (canPin) column.pin("end");
  }, [column, canPin]);
  const handleUnpin = useCallback(() => {
    if (canPin) column.pin(false);
  }, [canPin, column]);
  const handleHide = useCallback(() => {
    if (canHide) column.toggleVisibility(false);
  }, [canHide, column]);

  if (!(canSort || canHide || canPin || canGroup)) {
    return <div className={cn(className)}>{displayTitle}</div>;
  }

  // Get current state directly from the table
  const { grouping, columnPinning } = table.state;
  const isSorted = canSort ? column.getIsSorted() : false;
  const isGrouped = canGroup ? grouping?.includes(column.id) : false;
  const isPinnedLeft = canPin
    ? columnPinning?.start?.includes(column.id)
    : false;
  const isPinnedRight = canPin
    ? columnPinning?.end?.includes(column.id)
    : false;
  const isPinned = isPinnedLeft || isPinnedRight;

  const hasSortItems = canSort;
  const hasGroupItems = canGroup;
  const hasPinItems = canPin;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="group data-[state=open]:bg-accent -ml-3 h-8"
              size="sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <span>{displayTitle}</span>
          {isSorted === "desc" ? (
            <ArrowDown className="ml-2 size-4" />
          ) : isSorted === "asc" ? (
            <ArrowUp className="ml-2 size-4" />
          ) : canSort ? (
            <ChevronsUpDown className="ml-2 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100" />
          ) : null}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          {hasSortItems && (
            <>
              <DropdownMenuItem onClick={handleSortAsc}>
                <ArrowUp className="text-muted-foreground/70 mr-2 size-3.5" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSortDesc}>
                <ArrowDown className="text-muted-foreground/70 mr-2 size-3.5" />
                Desc
              </DropdownMenuItem>
            </>
          )}
          {hasGroupItems && (
            <>
              {hasSortItems ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={handleToggleGrouping}>
                {isGrouped ? (
                  <>
                    <Ungroup className="text-muted-foreground/70 mr-2 size-3.5" />
                    Ungroup
                  </>
                ) : (
                  <>
                    <Group className="text-muted-foreground/70 mr-2 size-3.5" />
                    Group by
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
          {hasPinItems && (
            <>
              {hasSortItems || hasGroupItems ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem disabled={isPinnedLeft} onClick={handlePinLeft}>
                <Pin className="text-muted-foreground/70 mr-2 size-3.5" />
                Pin left
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPinnedRight}
                onClick={handlePinRight}
              >
                <Pin className="text-muted-foreground/70 mr-2 size-3.5 rotate-180" />
                Pin right
              </DropdownMenuItem>
              {isPinned ? (
                <DropdownMenuItem onClick={handleUnpin}>
                  <PinOff className="text-muted-foreground/70 mr-2 size-3.5" />
                  Unpin
                </DropdownMenuItem>
              ) : null}
            </>
          )}
          {canHide && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleHide}>
                <EyeOff className="text-muted-foreground/70 mr-2 size-3.5" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
