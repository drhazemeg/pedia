import { FormControl, FormItem, FormMessage } from "@pedia/ui/components/form";
import { Input } from "@pedia/ui/components/input";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";

export default function AutoFormInput({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel: _showLabel, ...rest } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;
  const type = fieldProps.type ?? "text";

  return (
    <FormItem className="flex w-full flex-col justify-start">
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
          onChange={(e) => field.handleChange(e.target.value)}
          type={type}
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
