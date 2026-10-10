// components/auto-form/types.ts
import type { AnyFieldApi } from "@tanstack/react-form";
import type * as z from "zod";

import type { INPUT_COMPONENTS } from "./config";
import type { SerializableInputProps } from "./shared-form-types";
export {
  type BooleanInputProps,
  type DateInputProps,
  type EnumInputProps,
  type NumberInputProps,
  type SerializableInputProps,
  type StringInputProps,
  type TypedInputProps,
} from "./shared-form-types";

export type AutoFormFieldType = keyof typeof INPUT_COMPONENTS;

export type FieldInputProps = SerializableInputProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    keyof SerializableInputProps
  > &
  Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    keyof SerializableInputProps
  >;

export type FieldConfigItem = {
  description?: React.ReactNode;
  inputProps?: FieldInputProps;
  label?: string;
  fieldType?:
    | keyof typeof INPUT_COMPONENTS
    | React.FC<AutoFormInputComponentProps>;
  renderParent?: (props: {
    children: React.ReactNode;
  }) => React.ReactElement | null;
  order?: number;
};

export type FieldConfigObject = FieldConfigItem & {
  [key: string]: FieldConfigItem | FieldConfigObject | undefined;
};

type AnyZodShape = z.ZodRawShape;

export type FieldConfig<SchemaType extends z.infer<z.ZodObject<AnyZodShape>>> =
  {
    [Key in keyof SchemaType]?: FieldConfigItem | FieldConfigObject;
  };

export enum DependencyType {
  DISABLES = 0,
  REQUIRES = 1,
  HIDES = 2,
  SETS_OPTIONS = 3,
}

type BaseDependency<SchemaType extends z.infer<z.ZodObject<AnyZodShape>>> = {
  sourceField: keyof SchemaType;
  type: DependencyType;
  targetField: keyof SchemaType;
  when: (sourceFieldValue: unknown, targetFieldValue: unknown) => boolean;
};

export type ValueDependency<
  SchemaType extends z.infer<z.ZodObject<AnyZodShape>>,
> = BaseDependency<SchemaType> & {
  type:
    | DependencyType.DISABLES
    | DependencyType.REQUIRES
    | DependencyType.HIDES;
};

export type EnumValues = readonly [string, ...string[]];

export type OptionsDependency<
  SchemaType extends z.infer<z.ZodObject<AnyZodShape>>,
> = BaseDependency<SchemaType> & {
  type: DependencyType.SETS_OPTIONS;
  options: EnumValues;
};

export type Dependency<SchemaType extends z.infer<z.ZodObject<AnyZodShape>>> =
  | ValueDependency<SchemaType>
  | OptionsDependency<SchemaType>;

/**
 * The AutoForm field components consume the TanStack Form field API directly.
 * We keep this alias so field components have a stable, narrow type to
 * destructure (`field.state.value`, `field.handleChange`, ...).
 */
export type AnyAutoFormField = AnyFieldApi;

export type AutoFormFieldProps = Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "className"
  | "disabled"
  | "placeholder"
  | "id"
  | "name"
  | "autoComplete"
  | "required"
> & {
  placeholder?: string;
  showLabel?: boolean;
  type?: string;
  defaultValue?: React.InputHTMLAttributes<HTMLInputElement>["defaultValue"];
  [key: string]: unknown;
};

export type AutoFormInputComponentProps = {
  zodInputProps: React.InputHTMLAttributes<HTMLInputElement>;
  field: AnyAutoFormField;
  fieldConfigItem: FieldConfigItem | undefined;
  label: string;
  isRequired: boolean;
  fieldProps: AutoFormFieldProps;
  zodItem: z.ZodType;
  className?: string;
};
