import type { Option } from "@pedia/ui/components/ui-builder/internal/components/multi-select";
import MultipleSelector from "@pedia/ui/components/ui-builder/internal/components/multi-select";
import type { ClassNameControlProfile } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { TAILWIND_CLASSES_WITH_BREAKPOINTS } from "@pedia/ui/components/ui-builder/internal/utils/tailwind-classes";
import type React from "react";
import { useCallback, useMemo } from "react";

const EMPTY_OPTIONS: Option[] = [];

interface ClassNameMultiselectProps {
  value: string;
  onChange: (newClassName: string) => void;
  classProfile?: ClassNameControlProfile;
}

const ClassNameMultiselect: React.FC<ClassNameMultiselectProps> = ({
  value,
  onChange,
  classProfile,
}) => {
  const allowedClassSet = useMemo(
    () =>
      classProfile?.allowedClassNames
        ? new Set(classProfile.allowedClassNames)
        : null,
    [classProfile]
  );

  const searchableClasses = useMemo(() => {
    if (!allowedClassSet) {
      return TAILWIND_CLASSES_WITH_BREAKPOINTS;
    }

    return TAILWIND_CLASSES_WITH_BREAKPOINTS.filter((cls) => {
      if (allowedClassSet.has(cls)) {
        return true;
      }
      const parts = cls.split(":");
      const baseClass = parts.at(-1) ?? cls;
      return allowedClassSet.has(baseClass);
    });
  }, [allowedClassSet]);

  const searchClasses = useCallback(
    (value: string): Promise<Option[]> =>
      new Promise((resolve) => {
        const res = searchableClasses.filter((option) =>
          option.includes(value)
        );
        resolve(
          res.map((cls) => {
            return {
              value: cls,
              label: cls,
            };
          })
        );
      }),
    [searchableClasses]
  );

  const handleChange = useCallback(
    (values: Option[]) => {
      const newClassName = values.map((v) => v.value).join(" ");
      onChange(newClassName);
    },
    [onChange]
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

  const multipleSelectorValues = useMemo(
    () =>
      value
        ?.split(" ")
        .filter((cls) => cls.trim() !== "")
        .map((cls: string) => {
          return {
            value: cls,
            label: cls,
          };
        }) || EMPTY_OPTIONS,
    [value]
  );

  return (
    <MultipleSelector
      creatable
      defaultOptions={EMPTY_OPTIONS}
      emptyIndicator={emptyIndicator}
      loadingIndicator={loadingIndicator}
      onChange={handleChange}
      onSearch={searchClasses}
      placeholder="Type class name..."
      value={multipleSelectorValues}
    />
  );
};

export default ClassNameMultiselect;
