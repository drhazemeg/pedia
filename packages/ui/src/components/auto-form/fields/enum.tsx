import { FormControl, FormItem } from "@pedia/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pedia/ui/components/select";
import type * as z from "zod";

import AutoFormLabel from "../common/label";
import AutoFormMessage from "../common/message";
import AutoFormTooltip from "../common/tooltip";
import { getBaseSchema } from "../helpers";
import type { AutoFormInputComponentProps } from "../types";

function getEnumValues(schema: z.ZodType): string[] {
  const withOptions = schema as { options?: unknown };
  if (Array.isArray(withOptions.options)) {
    return withOptions.options.filter(
      (v): v is string => typeof v === "string"
    );
  }
  const withEnum = schema as { enum?: unknown };
  if (
    withEnum.enum &&
    typeof withEnum.enum === "object" &&
    !Array.isArray(withEnum.enum)
  ) {
    return Object.values(withEnum.enum).filter(
      (v): v is string => typeof v === "string"
    );
  }
  const withInternal = schema as { _zod?: { def?: { entries?: unknown } } };
  const entries = withInternal._zod?.def?.entries;
  if (entries && typeof entries === "object" && !Array.isArray(entries)) {
    return Object.values(entries).filter(
      (v): v is string => typeof v === "string"
    );
  }
  return [];
}

export default function AutoFormEnum({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem);
  const baseValues = getEnumValues(baseSchema);
  const values: Array<[string, string]> = baseValues.map((v) => [v, v]);
  const findItem = (value: string) => values.find(([key]) => key === value);

  const handleValueChange = (val: string | null) => {
    if (val === null || val === "") return;
    field.handleChange(val);
  };

  const label_ = fieldConfigItem?.label ?? label;
  const currentValue = (field.state.value as string | null | undefined) ?? null;
  const { showLabel, defaultValue: _defaultValue, ...rest } = fieldProps;

  return (
    <FormItem>
      {showLabel === false ? null : (
        <AutoFormLabel isRequired={isRequired} label={label_} />
      )}
      <FormControl>
        <Select
          {...rest}
          onValueChange={handleValueChange}
          value={currentValue ?? ""}
        >
          <SelectTrigger className={rest.className as string | undefined}>
            <SelectValue
              placeholder={
                fieldConfigItem?.inputProps?.placeholder as string | undefined
              }
            >
              {currentValue ? findItem(currentValue)?.[1] : "Select an option"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {values.map(([value, display]) => (
              <SelectItem key={value} value={value}>
                {display}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <AutoFormMessage />
    </FormItem>
  );
}
