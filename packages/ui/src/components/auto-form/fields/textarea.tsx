import { FormControl, FormItem, FormMessage } from "@pedia/ui/components/form";
import { Textarea } from "@pedia/ui/components/textarea";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";

export default function AutoFormTextarea({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel: _showLabel, ...rest } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  return (
    <FormItem>
      {showLabel ? (
        <AutoFormLabel
          isRequired={isRequired}
          label={fieldConfigItem?.label ?? label}
        />
      ) : null}
      <FormControl>
        <Textarea
          {...rest}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
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
