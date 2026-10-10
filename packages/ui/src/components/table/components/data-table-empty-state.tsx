import { Button } from "@pedia/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@pedia/ui/components/empty";
import { Icons } from "@pedia/ui/components/icons";
import { cn } from "@pedia/ui/lib/utils";
import type React from "react";

interface DataTableEmptyStateProps {
  actionLabel?: string;
  className?: string;
  icon?:
    | keyof typeof Icons
    | Exclude<React.ReactNode, string | number | boolean | null | undefined>;
  message?: string;
  onAction?: () => void;
  title?: string;
}

function isIconKey(value: string): value is keyof typeof Icons {
  return Object.hasOwn(Icons, value);
}

export function DataTableEmptyState({
  title = "No Results Found",
  message = "Try adjusting your search or filter criteria",
  icon = "empty",
  actionLabel,
  onAction,
  className,
}: DataTableEmptyStateProps) {
  const iconKey = typeof icon === "string" && isIconKey(icon) ? icon : null;
  const IconComponent = iconKey ? Icons[iconKey] : null;

  const customIcon = typeof icon === "string" ? null : icon;
  const isError = icon === "error";

  return (
    <Empty className={cn("rounded-lg p-8", className)}>
      <EmptyHeader>
        {Boolean(IconComponent || customIcon) && (
          <EmptyMedia variant="icon">
            {IconComponent ? (
              <IconComponent
                className={cn(
                  isError ? "text-destructive" : "text-muted-foreground"
                )}
              />
            ) : (
              customIcon
            )}
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {Boolean(actionLabel && onAction) && (
        <EmptyContent>
          <Button onClick={onAction} type="button">
            {actionLabel}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
