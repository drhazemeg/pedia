import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@pedia/ui/components/form";
import { RadioGroup, RadioGroupItem } from "@pedia/ui/components/radio-group";
import type * as z from "zod";

import AutoFormLabel from "../common/label";
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

export default function AutoFormRadioGroup({
  label,
  isRequired,
  field,
  zodItem,
  fieldProps,
  fieldConfigItem,
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem);
  const values = getEnumValues(baseSchema);
  const { showLabel, ...rest } = fieldProps;

  return (
    <div>
      <FormItem>
        {showLabel === false ? null : (
          <AutoFormLabel
            isRequired={isRequired}
            label={fieldConfigItem?.label ?? label}
          />
        )}
        <FormControl>
          <RadioGroup
            {...rest}
            onValueChange={field.handleChange}
            value={(field.state.value as string) ?? ""}
          >
            {values.map((value) => (
              <FormItem
                className="mb-2 flex items-center gap-3 space-y-0"
                key={value}
              >
                <FormControl>
                  <RadioGroupItem value={value} />
                </FormControl>
                <FormLabel className="font-normal">{value}</FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
}
