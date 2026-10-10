"use client";

import { Badge } from "@pedia/ui/components/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@pedia/ui/components/command";
import { useDebounce } from "@pedia/ui/hooks/use-debounce";
import { cn } from "@pedia/ui/lib/utils";
import { Command as CommandPrimitive, useCommandState } from "cmdk";
import { X } from "lucide-react";
import * as React from "react";
import { forwardRef, useCallback, useEffect, useMemo } from "react";

const EMPTY_ARRAY: any[] = [];

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
  /** fixed option that can't be removed. */
  fixed?: boolean;
  /** Group the options by providing key. */
  [key: string]: string | boolean | undefined;
}
type GroupOption = Record<string, Option[]>;

interface MultipleSelectorProps {
  value?: Option[];
  defaultOptions?: Option[];
  /** manually controlled options */
  options?: Option[];
  placeholder?: string;
  /** Loading component. */
  loadingIndicator?: React.ReactNode;
  /** Empty component. */
  emptyIndicator?: React.ReactNode;
  /** Debounce time for async search. Only work with `onSearch`. */
  delay?: number;
  /**
   * Only work with `onSearch` prop. Trigger search when `onFocus`.
   * For example, when user click on the input, it will trigger the search to get initial options.
   **/
  triggerSearchOnFocus?: boolean;
  /** async search */
  onSearch?: (value: string) => Promise<Option[]>;
  /**
   * sync search. This search will not showing loadingIndicator.
   * The rest props are the same as async search.
   * i.e.: creatable, groupBy, delay.
   **/
  onSearchSync?: (value: string) => Option[];
  onChange?: (options: Option[]) => void;
  /** Limit the maximum number of selected options. */
  maxSelected?: number;
  /** When the number of selected options exceeds the limit, the onMaxSelected will be called. */
  onMaxSelected?: (maxLimit: number) => void;
  /** Hide the placeholder when there are options selected. */
  hidePlaceholderWhenSelected?: boolean;
  disabled?: boolean;
  /** Group the options base on provided key. */
  groupBy?: string;
  className?: string;
  badgeClassName?: string;

  selectFirstItem?: boolean;
  /** Allow user to create option when there is no option matched. */
  creatable?: boolean;
  /** Props of `Command` */
  commandProps?: React.ComponentPropsWithoutRef<typeof Command>;
  /** Props of `CommandInput` */
  inputProps?: Omit<
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>,
    "value" | "placeholder" | "disabled"
  >;
  /** hide the clear all button. */
  hideClearAllButton?: boolean;
}

export interface MultipleSelectorRef {
  selectedValue: Option[];
  input: HTMLInputElement;
  focus: () => void;
  reset: () => void;
}

function transToGroupOption(options: Option[], groupBy?: string) {
  if (options.length === 0) {
    return {};
  }
  if (!groupBy) {
    return {
      "": options,
    };
  }

  const groupOption: GroupOption = {};
  options.forEach((option) => {
    const key = (option[groupBy] as string) || "";
    if (!groupOption[key]) {
      groupOption[key] = [];
    }
    const group = groupOption[key];
    if (group) {
      group.push(option);
    }
  });
  return groupOption;
}

function removePickedOption(groupOption: GroupOption, picked: Option[]) {
  const cloneOption = structuredClone(groupOption) as GroupOption;

  for (const [key, value] of Object.entries(cloneOption)) {
    cloneOption[key] = value.filter(
      (val) => !picked.find((p) => p.value === val.value)
    );
  }
  return cloneOption;
}

function isOptionsExist(groupOption: GroupOption, targetOption: Option[]) {
  for (const [, value] of Object.entries(groupOption)) {
    if (
      value.some((option) => targetOption.find((p) => p.value === option.value))
    ) {
      return true;
    }
  }
  return false;
}

const CommandEmpty = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CommandPrimitive.Empty>
>(({ className, ...props }, forwardedRef) => {
  const render = useCommandState((state) => state.filtered.count === 0);

  if (!render) return null;

  return (
    <div
      className={cn("py-6 text-center text-sm", className)}
      cmdk-empty=""
      ref={forwardedRef}
      role="presentation"
      {...props}
    />
  );
});

CommandEmpty.displayName = "CommandEmpty";

const MultipleSelector = React.forwardRef<
  MultipleSelectorRef,
  MultipleSelectorProps
>(
  (
    {
      value,
      onChange,
      placeholder,
      defaultOptions: arrayDefaultOptions = EMPTY_ARRAY,
      options: arrayOptions,
      delay,
      onSearch,
      onSearchSync,
      loadingIndicator,
      emptyIndicator,
      maxSelected = Number.MAX_SAFE_INTEGER,
      onMaxSelected,
      hidePlaceholderWhenSelected,
      disabled,
      groupBy,
      className,
      badgeClassName,
      selectFirstItem = true,
      creatable = false,
      triggerSearchOnFocus = false,
      commandProps,
      inputProps,
      hideClearAllButton = false,
    }: MultipleSelectorProps,
    ref: React.Ref<MultipleSelectorRef>
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [onScrollbar, setOnScrollbar] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null); // Added this

    const [selected, setSelected] = React.useState<Option[]>(
      value || EMPTY_ARRAY
    );
    const [options, setOptions] = React.useState<GroupOption>(
      transToGroupOption(arrayDefaultOptions, groupBy)
    );
    const [inputValue, setInputValue] = React.useState("");
    const debouncedSearchTerm = useDebounce(inputValue, delay || 500);

    const selectedValue = useMemo(() => {
      const input = inputRef.current as HTMLInputElement | null;
      return {
        selectedValue: [...selected],
        input: input ?? (null as unknown as HTMLInputElement),
        focus: () => inputRef?.current?.focus(),
        reset: () => setSelected([]),
      };
    }, [selected]);

    React.useImperativeHandle(ref, () => selectedValue, [selectedValue]);

    const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        inputRef.current.blur();
      }
    }, []);

    const handleUnselect = React.useCallback(
      (option: Option) => {
        const newOptions = selected.filter((s) => s.value !== option.value);
        setSelected(newOptions);
        onChange?.(newOptions);
      },
      [onChange, selected]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current;
        if (input) {
          if (e.key === "Delete" || e.key === "Backspace") {
            if (input.value === "" && selected.length > 0) {
              const lastSelectOption = selected.at(-1);
              // If last item is fixed, we should not remove it.
              if (lastSelectOption && !lastSelectOption.fixed) {
                handleUnselect(lastSelectOption);
              }
            }
          }
          // This is not a default behavior of the <input /> field
          if (e.key === "Escape") {
            input.blur();
          }
        }
      },
      [handleUnselect, selected]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchend", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchend", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchend", handleClickOutside);
      };
      // biome-ignore lint/correctness/useExhaustiveDependencies: <ok>
    }, [open, handleClickOutside]);

    useEffect(() => {
      if (value) {
        setSelected(value);
      }
    }, [value]);

    useEffect(() => {
      /** If `onSearch` is provided, do not trigger options updated. */
      if (!arrayOptions || onSearch) {
        return;
      }
      const newOption = transToGroupOption(
        arrayOptions || EMPTY_ARRAY,
        groupBy
      );
      if (JSON.stringify(newOption) !== JSON.stringify(options)) {
        setOptions(newOption);
      }
    }, [arrayOptions, groupBy, onSearch, options]);

    useEffect(() => {
      /** sync search */

      const doSearchSync = () => {
        const res = onSearchSync?.(debouncedSearchTerm);
        setOptions(transToGroupOption(res || [], groupBy));
      };

      const exec = () => {
        if (!onSearchSync || !open) return;

        if (triggerSearchOnFocus) {
          doSearchSync();
        }

        if (debouncedSearchTerm) {
          doSearchSync();
        }
      };

      exec();
    }, [
      debouncedSearchTerm,
      groupBy,
      open,
      triggerSearchOnFocus,
      onSearchSync,
    ]);

    useEffect(() => {
      /** async search */

      const doSearch = async () => {
        setIsLoading(true);
        const res = await onSearch?.(debouncedSearchTerm);
        setOptions(transToGroupOption(res || [], groupBy));
        setIsLoading(false);
      };

      const exec = async () => {
        if (!onSearch || !open) return;

        if (triggerSearchOnFocus) {
          await doSearch();
        }

        if (debouncedSearchTerm) {
          await doSearch();
        }
      };

      void exec();
    }, [debouncedSearchTerm, groupBy, open, triggerSearchOnFocus, onSearch]);

    const handleCommandKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        handleKeyDown(e);
        commandProps?.onKeyDown?.(e);
      },
      [handleKeyDown, commandProps]
    );

    const handleBadgeGroupClick = useCallback(() => {
      if (disabled) return;
      inputRef?.current?.focus();
    }, [disabled]);

    const handleBadgeGroupKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleBadgeGroupClick();
        }
      },
      [disabled, handleBadgeGroupClick]
    );

    const targetOption = useMemo(
      () => [{ value: inputValue, label: inputValue }],
      [inputValue]
    );

    const handleCommandItemMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
      },
      []
    );
    const handleCommandItemSelect = useCallback(() => {
      if (selected.length >= maxSelected) {
        onMaxSelected?.(selected.length);
        return;
      }
      setInputValue("");
      const newOptions: Option[] = [
        ...selected,
        { value: inputValue, label: inputValue },
      ];
      setSelected(newOptions);
      onChange?.(newOptions);
    }, [maxSelected, onMaxSelected, selected, onChange, inputValue]);

    const shouldShowCreatable =
      creatable &&
      !isOptionsExist(options, targetOption) &&
      !selected.find((s) => s.value === inputValue) &&
      ((!onSearch && inputValue.length > 0) ||
        (onSearch && debouncedSearchTerm.length > 0 && !isLoading));

    const creatableItem = shouldShowCreatable ? (
      <CommandItem
        className="cursor-pointer"
        onMouseDown={handleCommandItemMouseDown}
        onSelect={handleCommandItemSelect}
        value={inputValue}
      >
        {`Create "${inputValue}"`}
      </CommandItem>
    ) : undefined;

    const EmptyItem = React.useCallback(() => {
      if (!emptyIndicator) return;

      // For async search that showing emptyIndicator
      if (onSearch && !creatable && Object.keys(options).length === 0) {
        return (
          <CommandItem disabled value="-">
            {emptyIndicator}
          </CommandItem>
        );
      }

      return <CommandEmpty>{emptyIndicator}</CommandEmpty>;
    }, [creatable, emptyIndicator, onSearch, options]);

    const selectables = React.useMemo<GroupOption>(
      () => removePickedOption(options, selected),
      [options, selected]
    );

    /** Avoid Creatable Selector freezing or lagging when paste a long string. */
    const commandFilter = React.useCallback(() => {
      if (commandProps?.filter) {
        return commandProps.filter;
      }

      if (creatable) {
        return (optionValue: string, search: string) =>
          optionValue.toLowerCase().includes(search.toLowerCase()) ? 1 : -1;
      }
      // Using default filter in `cmdk`. We don't have to provide it.
    }, [creatable, commandProps?.filter]);

    const handlePrimitiveInputValueChange = useCallback(
      (optionValue: string) => {
        setInputValue(optionValue);
        inputProps?.onValueChange?.(optionValue);
      },
      [inputProps]
    );

    const handlePrimitiveInputBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement, Element>) => {
        if (!onScrollbar) {
          setOpen(false);
        }
        inputProps?.onBlur?.(event);
      },
      [onScrollbar, inputProps]
    );

    const handlePrimitiveInputFocus = useCallback(
      (event: React.FocusEvent<HTMLInputElement, Element>) => {
        setOpen(true);
        if (triggerSearchOnFocus) {
          void onSearch?.(debouncedSearchTerm);
        }
        inputProps?.onFocus?.(event);
      },
      [triggerSearchOnFocus, debouncedSearchTerm, inputProps, onSearch]
    );

    const handleClearAllButtonClick = useCallback(() => {
      setSelected(selected.filter((s) => s.fixed));
      onChange?.(selected.filter((s) => s.fixed));
    }, [selected, onChange]);

    const handleCommandListMouseLeave = useCallback(() => {
      setOnScrollbar(false);
    }, []);

    const handleCommandListMouseEnter = useCallback(() => {
      setOnScrollbar(true);
    }, []);

    const handleCommandListMouseUp = useCallback(() => {
      inputRef?.current?.focus();
    }, []);

    const handleCommandGroupItemMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
      },
      []
    );

    const handleCommandGroupItemSelect = useCallback(
      (option: Option) => {
        if (selected.length >= maxSelected) {
          onMaxSelected?.(selected.length);
          return;
        }
        setInputValue("");
        const newOptions = [...selected, option];
        setSelected(newOptions);
        onChange?.(newOptions);
      },
      [maxSelected, onMaxSelected, selected, onChange]
    );

    return (
      <Command
        ref={dropdownRef}
        {...commandProps}
        className={cn(
          "h-auto overflow-visible bg-transparent",
          commandProps?.className
        )}
        filter={commandFilter()}
        onKeyDown={handleCommandKeyDown}
        shouldFilter={
          commandProps?.shouldFilter === undefined
            ? !onSearch
            : commandProps.shouldFilter
        } // When onSearch is provided, we don't want to filter the options. You can still override it.
      >
        <div
          aria-disabled={disabled}
          className={cn(
            "border-input ring-offset-background focus-within:ring-ring min-h-10 rounded-md border text-sm focus-within:ring-2 focus-within:ring-offset-2",
            {
              "px-3 py-2": selected.length > 0,
              "cursor-text": !disabled && selected.length > 0,
            },
            className
          )}
          onClick={handleBadgeGroupClick}
          onKeyDown={handleBadgeGroupKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
        >
          <div className="relative flex flex-wrap gap-1">
            {selected.map((option) => (
              <OptionBadge
                badgeClassName={badgeClassName}
                disabled={disabled}
                key={option.value}
                onUnselect={handleUnselect}
                option={option}
              />
            ))}
            {/* Avoid having the "Search" Icon */}
            <CommandPrimitive.Input
              {...inputProps}
              className={cn(
                "placeholder:text-muted-foreground flex-1 bg-transparent outline-none",
                {
                  "w-full": hidePlaceholderWhenSelected,
                  "px-3 py-2": selected.length === 0,
                  "ml-1": selected.length > 0,
                },
                inputProps?.className
              )}
              disabled={disabled}
              onBlur={handlePrimitiveInputBlur}
              onFocus={handlePrimitiveInputFocus}
              onValueChange={handlePrimitiveInputValueChange}
              placeholder={
                hidePlaceholderWhenSelected && selected.length > 0
                  ? ""
                  : placeholder
              }
              ref={inputRef}
              value={inputValue}
            />
            <button
              className={cn(
                "absolute end-0 h-6 w-6 p-0",
                (hideClearAllButton ||
                  disabled ||
                  selected.length === 0 ||
                  selected.filter((s) => s.fixed).length === selected.length) &&
                  "hidden"
              )}
              onClick={handleClearAllButtonClick}
              type="button"
            >
              <X />
            </button>
          </div>
        </div>
        <div className="relative">
          {open && (
            <CommandList
              className="animate-in bg-popover text-popover-foreground absolute top-1 z-10 w-full rounded-md border shadow-md outline-none"
              onMouseEnter={handleCommandListMouseEnter}
              onMouseLeave={handleCommandListMouseLeave}
              onMouseUp={handleCommandListMouseUp}
            >
              {isLoading ? (
                loadingIndicator
              ) : (
                <>
                  {EmptyItem()}
                  {creatableItem}
                  {!selectFirstItem && (
                    <CommandItem className="hidden" value="-" />
                  )}
                  {Object.entries(selectables).map(([key, dropdowns]) => (
                    <CommandGroup
                      className="h-full overflow-auto"
                      heading={key}
                      key={key}
                    >
                      {dropdowns.map((option) => (
                        <CommandGroupItem
                          key={option.value}
                          onMouseDown={handleCommandGroupItemMouseDown}
                          onSelect={handleCommandGroupItemSelect}
                          option={option}
                        />
                      ))}
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          )}
        </div>
      </Command>
    );
  }
);

MultipleSelector.displayName = "MultipleSelector";
export default MultipleSelector;

function OptionBadge({
  option,
  onUnselect,
  badgeClassName,
  disabled,
}: {
  option: Option;
  onUnselect: (option: Option) => void;
  badgeClassName?: string;
  disabled?: boolean;
}) {
  const handleUnselect = useCallback(() => {
    onUnselect(option);
  }, [onUnselect, option]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter") {
        onUnselect(option);
      }
    },
    [onUnselect, option]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  return (
    <Badge
      className={cn(
        "data-[disabled]:bg-muted-foreground data-[disabled]:text-muted data-[disabled]:hover:bg-muted-foreground",
        "data-[fixed]:bg-muted-foreground data-[fixed]:text-muted data-[fixed]:hover:bg-muted-foreground",
        badgeClassName
      )}
      data-disabled={disabled || undefined}
      data-fixed={option.fixed}
      key={option.value}
    >
      {option.label}
      <button
        className={cn(
          "ring-offset-background focus:ring-ring ms-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2",
          (disabled || option.fixed) && "hidden"
        )}
        onClick={handleUnselect}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        type="button"
      >
        <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
      </button>
    </Badge>
  );
}

function CommandGroupItem({
  option,
  onSelect,
  onMouseDown,
}: {
  option: Option;
  onSelect: (option: Option) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(option);
  }, [onSelect, option]);

  return (
    <CommandItem
      className={cn(
        "cursor-pointer",
        option.disable && "text-muted-foreground cursor-default"
      )}
      disabled={option.disable}
      key={option.value}
      onMouseDown={onMouseDown}
      onSelect={handleSelect}
      value={option.value}
    >
      {option.label}
    </CommandItem>
  );
}
