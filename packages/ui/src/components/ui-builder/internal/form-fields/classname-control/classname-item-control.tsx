/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <k> */
import { ClassNameGroupControl } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/classname-group-control";
import type {
  ClassNameControlProfile,
  StateType,
} from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { resolveClassNameControlConfig } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { cn } from "@pedia/ui/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ClassNameItemControlProps {
  value: string;
  onChange: (value: string) => void;
  classProfile?: ClassNameControlProfile;
}
const isTailwindClass = (possibleTypes: string[], token: string): boolean => {
  // Strip variants: `md:hover:bg-red-500` → `bg-red-500`
  const utility = token.includes(":")
    ? token.slice(token.lastIndexOf(":") + 1)
    : token;
  return possibleTypes.some((prefix) =>
    prefix.endsWith("-") ? utility.startsWith(prefix) : utility === prefix
  );
};

const toToggleValue = (
  v: string | string[] | null | undefined
): readonly string[] | undefined => {
  if (v == null) return undefined;
  return Array.isArray(v) ? v : [v];
};

export function ClassNameItemControl({
  value,
  onChange,
  classProfile,
}: ClassNameItemControlProps) {
  const { config, layoutGroups, layoutOrder } = useMemo(
    () => resolveClassNameControlConfig(classProfile),
    [classProfile]
  );

  // Memoize parsing for performance
  const parsed = useMemo(() => {
    if (value) {
      const tokens = value.trim().split(/\s+/);
      // Parse all keys
      const parsedState = Object.entries(config).reduce(
        (acc, [key, config]) => {
          const parsed = tokens.filter((token) =>
            isTailwindClass(
              config.possibleTypes.filter(
                (type): type is string => type !== null
              ),
              token
            )
          );
          if (parsed.length > 0) {
            (acc as any)[key] = config.multiple ? parsed : parsed[0];
          }
          return acc;
        },
        Object.fromEntries(Object.keys(config).map((k) => [k, null])) as Record<
          string,
          any
        >
      ) as StateType;
      // For each group, only allow one key to be active at a time
      const initialSelected: Record<string, string> = {};
      layoutGroups.forEach((group) => {
        // If multiple keys have values, clear all but the first
        let found = false;
        group.keys.forEach((key) => {
          if (parsedState[key]) {
            if (found) {
              parsedState[key] = null;
            } else {
              found = true;
              initialSelected[group.label] = key;
            }
          }
        });
        if (!found && group.keys[0]) {
          initialSelected[group.label] = group.keys[0];
        }
      });
      // Find handled tokens
      const handledTokens = new Set(
        Object.values(parsedState).flatMap((v) =>
          Array.isArray(v) ? v : v ? [v] : []
        )
      );
      const unhandledTokens = tokens.filter(
        (token) => !handledTokens.has(token)
      );
      return {
        parsedState,
        unhandledTokens,
        initialSelected,
      };
    }
    // Reset state if value is empty
    const initialSelected: Record<string, string> = {};
    layoutGroups.forEach((group) => {
      if (group.keys[0]) {
        initialSelected[group.label] = group.keys[0];
      }
    });
    return {
      parsedState: {},
      unhandledTokens: [],
      initialSelected,
    };
  }, [value, config, layoutGroups]);

  const [state, setState] = useState<StateType>(parsed.parsedState);
  const [unhandled, setUnhandled] = useState<string[]>(parsed.unhandledTokens);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>(
    parsed.initialSelected
  );

  // Only update state if parsed result changes (deep compare)
  useEffect(() => {
    const stateChanged =
      JSON.stringify(state) !== JSON.stringify(parsed.parsedState);
    const unhandledChanged =
      JSON.stringify(unhandled) !== JSON.stringify(parsed.unhandledTokens);
    const selectedChanged =
      JSON.stringify(selectedKeys) !== JSON.stringify(parsed.initialSelected);
    if (stateChanged) setState(parsed.parsedState);
    if (unhandledChanged) setUnhandled(parsed.unhandledTokens);
    if (selectedChanged) setSelectedKeys(parsed.initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, selectedKeys, state]);

  // Helper to build class string from state and unhandled
  const buildClassString = (
    customState: StateType = state,
    customUnhandled: string[] = unhandled
  ) => {
    const classes: string[] = [];
    for (const key in customState) {
      const value = customState[key];
      if (value) {
        if (Array.isArray(value)) {
          classes.push(...value);
        } else {
          classes.push(value);
        }
      }
    }
    return [...classes, ...customUnhandled].join(" ").trim();
  };

  // Handler for UI changes (toggles, dropdowns, etc.)
  const handleStateChange = useCallback(
    (key: keyof StateType, value: string | string[] | null) => {
      setState((prev) => {
        const newState = { ...prev, [key]: value };
        // If this key is part of a group, update selectedKeys and clear other keys in the group
        const group = layoutGroups.find((g) => g.keys.includes(key));
        if (group) {
          setSelectedKeys((prevSel) => {
            return {
              ...prevSel,
              [group.label]: key,
            };
          });
          // Clear other keys in the group
          group.keys.forEach((k) => {
            if (k !== key) newState[k] = null;
          });
          // Also clear from unhandled
          if (typeof group.clearState === "function") {
            const classesToClear = group.clearState(key, newState);
            setUnhandled((prevUnhandled) =>
              prevUnhandled.filter((token) => !classesToClear.includes(token))
            );
          }
        }

        // if visibility changes from visible to invisible null the value for that key in the newState
        const layoutOrderItemsInvisible = layoutOrder.filter(
          (item) => item.isVisible && !item.isVisible(newState)
        );
        layoutOrderItemsInvisible.forEach((item) => {
          if (item.type === "item") {
            newState[item.key] = null;
          } else if (item.type === "group") {
            const group = layoutGroups.find((g) => g.label === item.label);
            if (group) {
              group.keys.forEach((key) => {
                newState[key] = null;
              });
            }
          }
        });

        return newState;
      });
    },
    [layoutGroups, layoutOrder]
  );

  // Helper to create bound change handlers
  const createChangeHandler = useCallback(
    (key: keyof StateType) => (value: string | string[] | null) =>
      handleStateChange(key, value),
    [handleStateChange]
  );

  // Handler for group key selection
  const handleGroupKeySelect = (groupLabel: string, key: string) => {
    setSelectedKeys((prev) => {
      return {
        ...prev,
        [groupLabel]: key,
      };
    });
    const group = layoutGroups.find((g) => g.label === groupLabel);
    if (group) {
      let classesToClear: string[] = [];
      setState((prevState) => {
        const newState = { ...prevState };
        if (typeof group.clearState === "function") {
          classesToClear = group.clearState(key, newState);
        }
        // Remove all classes in classesToClear from state for all keys in the group except the selected one
        for (const k of group.keys) {
          if (k !== key) {
            const keyConfig = config[k];
            if (!keyConfig) continue;
            if (keyConfig.multiple && Array.isArray(newState[k])) {
              newState[k] = newState[k].filter(
                (v) => !classesToClear.includes(v)
              );
              if (Array.isArray(newState[k]) && newState[k]?.length === 0) {
                newState[k] = null;
              }
            } else if (
              typeof newState[k] === "string" &&
              classesToClear.includes(newState[k])
            ) {
              newState[k] = null;
            }
          }
        }
        // Remove from unhandled synchronously
        setUnhandled((prevUnhandled) =>
          prevUnhandled.filter((token) => !classesToClear.includes(token))
        );
        // Set the selected key's value to null if it was not previously set
        if (!newState[key]) newState[key] = null;
        return newState;
      });
    }
  };

  // Call onChange with the new class string after state/unhandled change
  useEffect(() => {
    const classString = buildClassString(state, unhandled);
    if (onChange) onChange(classString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, unhandled, buildClassString, onChange]);

  return (
    <div className="w-full" data-testid="classname-item-control">
      <div className="flex flex-wrap gap-y-1 px-4 pt-2 pb-4">
        {layoutOrder.map((entry) => {
          if (entry.type === "group") {
            const group = layoutGroups.find((g) => g.label === entry.label);
            if (!group) return null;
            const keys = group.keys.map(String);
            const selectedKey = selectedKeys[group.label] || keys[0];
            if (entry.isVisible && !entry.isVisible(state)) return null;
            if (!selectedKey) return null;
            const groupConfig = config[selectedKey];
            if (!groupConfig) return null;

            return (
              <div
                className={cn("w-full", entry.className)}
                data-testid={`group-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                key={group.label}
              >
                <ClassNameGroupControl
                  group={group}
                  groupConfig={groupConfig}
                  handleGroupKeySelect={handleGroupKeySelect}
                  handleStateChange={handleStateChange}
                  selectedKey={selectedKey}
                  state={state}
                />
              </div>
            );
          }
          if (entry.type === "item") {
            if (entry.isVisible && !entry.isVisible(state)) return null;
            const configKey = entry.key;
            const ungroupedConfig = config[configKey];

            if (!ungroupedConfig) return null;
            return (
              <div
                className={cn("w-full", entry.className)}
                data-testid={`item-${configKey}`}
                key={configKey}
              >
                <ungroupedConfig.component
                  {...ungroupedConfig}
                  {...("multiple" in ungroupedConfig
                    ? { multiple: ungroupedConfig.multiple }
                    : {})}
                  onValueChange={(v) => createChangeHandler(configKey)(v)}
                  value={toToggleValue(state[configKey])}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
