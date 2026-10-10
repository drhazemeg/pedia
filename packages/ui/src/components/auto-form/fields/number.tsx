import { FormControl, FormItem, FormMessage } from "@pedia/ui/components/form";
import { Input } from "@pedia/ui/components/input";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";

export default function AutoFormNumber({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const rest = fieldProps;
  const showLabel = true;

  return (
    <FormItem>
      {showLabel ? (
        <AutoFormLabel
          isRequired={isRequired}
          label={fieldConfigItem?.label ?? label}
        />
      ) : null}
      <FormControl>
        <Input
          {...rest}
          onBlur={field.handleBlur}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            field.handleChange(Number.isNaN(n) ? undefined : n);
          }}
          type="number"
          value={
            field.state.value === undefined || field.state.value === null
              ? ""
              : String(field.state.value)
          }
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
