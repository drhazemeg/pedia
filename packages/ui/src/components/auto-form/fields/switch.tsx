import { FormControl, FormItem } from "@pedia/ui/components/form";
import { Switch } from "@pedia/ui/components/switch";

import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";

export default function AutoFormSwitch({
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
        <div className="flex items-center gap-3">
          <FormControl>
            <Switch
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
