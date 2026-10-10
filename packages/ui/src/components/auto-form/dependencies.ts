// components/auto-form/dependencies.ts
import type * as z from "zod";

import type { Dependency, EnumValues } from "./types";
import { DependencyType } from "./types";

export default function resolveDependencies<
  SchemaType extends z.infer<z.ZodObject<any, any>>,
>(
  dependencies: Array<Dependency<SchemaType>>,
  currentFieldName: keyof SchemaType,
  getValue: (name: string) => unknown
) {
  let isDisabled = false;
  let isHidden = false;
  let isRequired = false;
  let overrideOptions: EnumValues | undefined;

  const currentFieldValue = getValue(currentFieldName as string);

  for (const dependency of dependencies) {
    if (dependency.targetField !== currentFieldName) continue;

    const watchedValue = getValue(dependency.sourceField as string);
    const conditionMet = dependency.when(watchedValue, currentFieldValue);
    if (!conditionMet) continue;

    switch (dependency.type) {
      case DependencyType.DISABLES:
        isDisabled = true;
        break;
      case DependencyType.REQUIRES:
        isRequired = true;
        break;
      case DependencyType.HIDES:
        isHidden = true;
        break;
      case DependencyType.SETS_OPTIONS:
        overrideOptions = dependency.options;
        break;
      default:
    }
  }

  return { isDisabled, isHidden, isRequired, overrideOptions };
}
