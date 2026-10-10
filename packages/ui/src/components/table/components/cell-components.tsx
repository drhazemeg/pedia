import { Badge } from "@pedia/ui/components/badge";
import { Button } from "@pedia/ui/components/button";
import { Checkbox } from "@pedia/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import { formatDate, toSentenceCase } from "@pedia/ui/lib/utils";
import { flexRender, Subscribe } from "@tanstack/react-table";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  HeartPulse,
  MoreHorizontal,
  Stethoscope,
  XCircle,
} from "lucide-react";
import React from "react";

import { useCellContext, useTableContext } from "../table-context";

export function SelectCell(): React.ReactNode {
  const cell = useCellContext();
  const table = useTableContext();
  const row = cell.row;
  const handleCheckedChange = React.useCallback(
    (value: boolean | "indeterminate") => row.toggleSelected(!!value),
    [row]
  );

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          className="translate-y-0.5"
          onCheckedChange={handleCheckedChange}
        />
      )}
    </Subscribe>
  );
}

export function TextCell(): React.ReactNode {
  const cell = useCellContext<string | undefined>();
  const value = cell.getValue();
  return value === null ? null : String(value);
}

export function AgeCell(): React.ReactNode {
  const cell = useCellContext<number>();
  return <span>{String(cell.getValue())}</span>;
}

// Generic status → icon map. Does not assume any specific entity's type.
const STATUS_ICONS: Record<string, React.ReactNode> = {
  Active: <CheckCircle />,
  Inactive: <XCircle />,
  Archived: <Clock />,
};

export function StatusCell(): React.ReactNode {
  const cell = useCellContext<string | undefined>();
  const status = cell.getValue();
  if (!status) return null;

  return (
    <Badge
      className="w-fit gap-1 rounded-full px-3 py-1 [&>svg]:size-3.5 [&>svg]:shrink-0"
      variant="outline"
    >
      {STATUS_ICONS[status] ?? null}
      <span className="truncate">{toSentenceCase(status)}</span>
    </Badge>
  );
}

export function DepartmentCell(): React.ReactNode {
  const cell = useCellContext<string | undefined>();
  const department = cell.getValue();
  if (!department) return null;

  const icons: Record<string, React.ReactNode> = {
    pediatrics: <Baby />,
    cardiology: <HeartPulse />,
    neurology: <Brain />,
    orthopedics: <Bone />,
    emergency: <Activity />,
    general: <Stethoscope />,
  };

  return (
    <Badge
      className="w-fit gap-1 rounded-full px-3 py-1 [&>svg]:size-3.5 [&>svg]:shrink-0"
      variant="outline"
    >
      {icons[department]}
      <span className="truncate">{toSentenceCase(department)}</span>
    </Badge>
  );
}

export function DateCell(): React.ReactNode {
  const cell = useCellContext<string>();
  return <>{formatDate(cell.getValue())}</>;
}

export function GroupedCell(): React.ReactNode {
  const cell = useCellContext();
  const table = useTableContext();
  const row = cell.row;
  const toggleExpanded = row.getToggleExpandedHandler();
  const paddingStyle = {
    paddingLeft: `calc(${row.depth} * 1.5rem + 0.5rem)`,
  };

  return (
    <Subscribe source={table.atoms.expanded}>
      {() => (
        <Button
          className="-ml-2 h-7 gap-1 px-2"
          disabled={!row.getCanExpand()}
          onClick={toggleExpanded}
          size="sm"
          style={paddingStyle}
          variant="ghost"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
          <span className="text-muted-foreground">({row.subRows.length})</span>
        </Button>
      )}
    </Subscribe>
  );
}

export function ActionsCell(): React.ReactNode {
  const cell = useCellContext();
  // Copy the record ID (row.original.id), not the TanStack cell composite ID.
  const recordId: string =
    typeof (cell.row.original as Record<string, unknown>).id === "string"
      ? ((cell.row.original as Record<string, unknown>).id as string)
      : cell.row.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Open menu"
            className="hover:bg-muted flex size-8 items-center justify-center rounded-md p-0"
            type="button"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(recordId)}
        >
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>View details</DropdownMenuItem>
        <DropdownMenuItem>View profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AgeAggregatedCell(): React.ReactNode {
  const cell = useCellContext<number>();
  return (
    <span className="text-muted-foreground">
      Avg: {Math.round(cell.getValue() * 10) / 10}
    </span>
  );
}

export function JoinDateAggregatedCell(): React.ReactNode {
  const cell = useCellContext<string>();
  const earliest = cell.getValue();
  return (
    <span className="text-muted-foreground">
      Earliest: {earliest ? formatDate(earliest) : "—"}
    </span>
  );
}
