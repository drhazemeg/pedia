import { DatePicker } from "@pedia/ui/components/date-picker";
import { FormControl, FormItem, FormMessage } from "@pedia/ui/components/form";
import { useCallback } from "react";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import { getBaseType } from "../helpers";
import type { AutoFormInputComponentProps } from "../types";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

export default function AutoFormDate({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
  zodItem,
}: AutoFormInputComponentProps) {
  const baseType = getBaseType(zodItem);
  const expectsDateObject = baseType === "ZodDate" || baseType === "date";

  const handleChange = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        field.handleChange();
        return;
      }
      field.handleChange(expectsDateObject ? date : date.toISOString());
    },
    [field, expectsDateObject]
  );

  const { showLabel, ...rest } = fieldProps;

  return (
    <FormItem>
      {showLabel === false ? null : (
        <AutoFormLabel
          isRequired={isRequired}
          label={fieldConfigItem?.label ?? label}
        />
      )}
      <FormControl>
        <DatePicker
          {...rest}
          date={toDate(field.state.value)}
          setDate={handleChange}
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
