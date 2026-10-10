// components/ui/fields/file-upload-field.tsx

import { FieldDescription, FieldLabel } from "@pedia/ui/components/field";
import { FileUploader } from "@pedia/ui/components/file-uploader";

import {
  createFormField,
  FormField,
  FormFieldError,
  FormFieldSet,
  useFieldContext,
} from "../core/context";
import { useFieldValue } from "../core/select";
import { isFileArray } from "../core/types";

export interface FileUploadFieldProps {
  description?: string;
  label: string;
  maxFiles?: number;
  maxSize?: number;
  required?: boolean;
}

/**
 * Outer wrapper. Renders `<FormFieldSet>` FIRST so the inner component can
 * call `useFieldContext()` — the provider must already be mounted for the
 * hook to find it. See `core/context.tsx` for the layering contract.
 */
export function FileUploadField(props: FileUploadFieldProps) {
  return (
    <FormFieldSet>
      <FileUploadFieldInner {...props} />
    </FormFieldSet>
  );
}

function FileUploadFieldInner({
  label,
  description,
  required,
  maxSize,
  maxFiles,
}: FileUploadFieldProps) {
  const { field } = useFieldContext();

  // The field stores `File[] | undefined`. The guard rejects anything that
  // isn't an array of File instances (strings, nulls, partially-loaded
  // uploads) and the fallback provides a stable empty array so consumers
  // don't need to null-check.
  //
  // `EMPTY_FILES` is a module-level constant: the array reference is reused
  // across renders, so `<FileUploader value={...}>` sees a stable prop and
  // doesn't re-render its internal state every time the parent re-renders.
  const value = useFieldValue(field, isFileArray, EMPTY_FILES);

  return (
    <>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required ? " *" : null}
        </FieldLabel>
        <div>
          <FileUploader
            maxFiles={maxFiles}
            maxSize={maxSize}
            onValueChange={field.handleChange}
            value={value}
          />
        </div>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FormField>
      <FormFieldError />
    </>
  );
}

const EMPTY_FILES: File[] = [];

export const FormFileUploadField =
  createFormField<FileUploadFieldProps>(FileUploadField);
