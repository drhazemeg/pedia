import { Checkbox } from "@pedia/ui/components/checkbox";
import { cn } from "@pedia/ui/lib/utils";
import { Subscribe } from "@tanstack/react-table";

import { useHeaderContext, useTableContext } from "../table-context";

export function SelectAllHeader(): React.ReactNode {
  const table = useTableContext();

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ?? false)
          }
          className="translate-y-0.5"
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(value === true)
          }
        />
      )}
    </Subscribe>
  );
}

export function ResizeHandle(): React.ReactNode {
  const header = useHeaderContext();
  const table = useTableContext();

  if (!header.column.getCanResize()) return null;

  return (
    <Subscribe source={table.atoms.columnResizing}>
      {() => (
        <div
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 right-[-2px] z-10 h-6 w-[3px] -translate-y-1/2 cursor-e-resize touch-none rounded-md transition-colors select-none before:absolute before:inset-x-[-4px] before:top-0 before:h-full before:content-[""] hover:bg-blue-600',
            header.column.getIsResizing() && "bg-blue-600"
          )}
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          role="presentation"
        />
      )}
    </Subscribe>
  );
}
