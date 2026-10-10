import { Checkbox } from "@pedia/ui/components/checkbox";
import { FormControl, FormItem } from "@pedia/ui/components/form";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";

export default function AutoFormCheckbox({
  label,
  isRequired,
  field,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel, ...rest } = fieldProps;

  return (
    <div>
      <FormItem>
        <div className="mb-3 flex items-center gap-3">
          <FormControl>
            <Checkbox
              {...rest}
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) =>
                field.handleChange(Boolean(checked))
              }
            />
          </FormControl>
          {showLabel === false ? null : (
            <AutoFormLabel
              isRequired={isRequired}
              label={fieldConfigItem?.label ?? label}
            />
          )}
        </div>
      </FormItem>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  );
}
