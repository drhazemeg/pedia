import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from "@pedia/ui/components/form";
import { iconNames } from "@pedia/ui/components/ui-builder/components/icon";
import type { Option } from "@pedia/ui/components/ui-builder/internal/components/multi-select";
import MultipleSelector from "@pedia/ui/components/ui-builder/internal/components/multi-select";
import type React from "react";
import { useCallback, useMemo } from "react";

const EMPTY_OPTIONS: Option[] = [];

interface IconNameFieldProps {
  description?: React.ReactNode;
  label?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
}

const IconNameField: React.FC<IconNameFieldProps> = ({
  value,
  onChange,
  description,
  label,
  isRequired,
}) => {
  const searchNames = useCallback(
    (value: string): Promise<Option[]> =>
      new Promise((resolve) => {
        const res = iconNames.filter((option) =>
          option.toLowerCase().includes(value.toLowerCase())
        );
        resolve(
          res.map((name) => {
            return {
              value: name,
              label: name,
            };
          })
        );
      }),
    []
  );

  const handleChange = useCallback(
    (values: Option[]) => {
      const firstValue = values[0];
      if (firstValue) {
        onChange(firstValue.value);
      }
    },
    [onChange]
  );

  const multipleSelectorValues = useMemo(
    () => [{ value, label: value }],
    [value]
  );

  const emptyIndicator = useMemo(
    () => (
      <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
        No results found.
      </p>
    ),
    []
  );

  const loadingIndicator = useMemo(
    () => (
      <p className="text-muted-foreground py-2 text-center text-lg leading-10">
        Loading...
      </p>
    ),
    []
  );

  return (
    <FormItem className="flex flex-col">
      <FormLabel>
        {label}
        {isRequired && <span className="text-destructive"> *</span>}
      </FormLabel>
      <FormControl>
        <MultipleSelector
          defaultOptions={EMPTY_OPTIONS}
          emptyIndicator={emptyIndicator}
          loadingIndicator={loadingIndicator}
          maxSelected={1}
          onChange={handleChange}
          onSearch={searchNames}
          placeholder="Type icon name..."
          value={multipleSelectorValues}
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
    </FormItem>
  );
};

export default IconNameField;
