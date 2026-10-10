import { Button } from "@pedia/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import type {
  ConfigItem,
  StateType,
} from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { CONFIG } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { MoreVertical } from "lucide-react";
import { useCallback, useMemo } from "react";

const EMPTY_OBJECT = {};

type ClassNameGroupControlProps = {
  groupConfig: ConfigItem;
  group: {
    label: string;
    keys: string[];
  };
  state: StateType;
  handleStateChange: (
    key: keyof StateType,
    value: string | string[] | null
  ) => void;
  handleGroupKeySelect: (groupLabel: string, key: string) => void;
  selectedKey: string | string[] | null;
};

export function ClassNameGroupControl({
  groupConfig,
  group,
  state,
  handleStateChange,
  handleGroupKeySelect,
  selectedKey,
}: ClassNameGroupControlProps) {
  // Memoize the conditional spread props
  const spreadProps = useMemo(
    () =>
      "multiple" in groupConfig
        ? { multiple: groupConfig.multiple }
        : EMPTY_OBJECT,
    [groupConfig]
  );

  // Memoize the dropdown click handler
  const handleDropdownClick = useCallback(
    (key: string) => () => handleGroupKeySelect(group.label, key),
    [handleGroupKeySelect, group.label]
  );

  return (
    <>
      <span className="text-muted-foreground text-xs font-medium">
        {group.label}
      </span>
      <div className="flex flex-row">
        <div>
          <groupConfig.component
            {...groupConfig}
            {...spreadProps}
            hidden={true}
            onValueChange={(value: string[]) =>
              handleStateChange(selectedKey as keyof StateType, value)
            }
            value={
              (Array.isArray(state[selectedKey as keyof StateType])
                ? (state[selectedKey as keyof StateType] as string[])
                : []) as readonly string[]
            }
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="w-6 px-1 py-1 text-xs"
                size="icon"
                variant="outline"
              />
            }
          >
            <MoreVertical className="!size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {group.keys.map((key) => (
              <DropdownMenuItem
                className={
                  selectedKey === String(key)
                    ? "bg-secondary-foreground/10"
                    : ""
                }
                key={String(key)}
                onClick={handleDropdownClick(String(key))}
              >
                {CONFIG[String(key)]?.label || String(key)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
