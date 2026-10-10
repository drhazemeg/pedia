import * as React from "react";
import { useCallback, useRef } from "react";
import type {
  DropzoneInputProps,
  DropzoneProps,
  DropzoneRootProps,
  FileRejection,
} from "react-dropzone";
import Dropzone from "react-dropzone";
import { toast } from "sonner";

import { useControllableState } from "../hooks/use-controllable-state";
import { cn, formatBytes } from "../lib/utils";
import { Button } from "./button";
import { Icons } from "./icons";
import { Progress } from "./progress";

export interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Accepted file types for the uploader.
   * @type { [key: string]: string[]}
   * @default
   * ```ts
   * { "image/*": [] }
   * ```
   * @example accept={["image/png", "image/jpeg"]}
   */
  accept?: DropzoneProps["accept"];

  /**
   * Whether the uploader is disabled.
   * @type boolean
   * @default false
   * @example disabled
   */
  disabled?: boolean;

  /**
   * Maximum number of files for the uploader.
   * @type number | undefined
   * @default 1
   * @example maxFiles={5}
   */
  maxFiles?: DropzoneProps["maxFiles"];

  /**
   * Maximum file size for the uploader.
   * @type number | undefined
   * @default 1024 * 1024 * 2 // 2MB
   * @example maxSize={1024 * 1024 * 2} // 2MB
   */
  maxSize?: DropzoneProps["maxSize"];

  /**
   * Whether the uploader should accept multiple files.
   * @type boolean
   * @default false
   * @example multiple
   */
  multiple?: boolean;

  /**
   * Function to be called when files are uploaded.
   * @type (files: File[]) => Promise<void>
   * @default undefined
   * @example onUpload={(files) => uploadFiles(files)}
   */
  onUpload?: (files: File[]) => Promise<void>;

  /**
   * Function to be called when the value changes.
   * @type React.Dispatch<React.SetStateAction<File[]>>
   * @default undefined
   * @example onValueChange={(files) => setFiles(files)}
   */
  onValueChange?: React.Dispatch<React.SetStateAction<File[]>>;

  /**
   * Progress of the uploaded files.
   * @type Record<string, number> | undefined
   * @default undefined
   * @example progresses={{ "file1.png": 50 }}
   */
  progresses?: Record<string, number>;
  /**
   * Value of the uploader.
   * @type File[]
   * @default undefined
   * @example value={files}
   */
  value?: File[];
}
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024 * 2;

export function FileUploader(props: FileUploaderProps) {
  const {
    value: valueProp,
    onValueChange,
    onUpload,
    progresses,
    accept = { "image/*": [] },
    maxSize = DEFAULT_MAX_FILE_SIZE_BYTES, // ← identifier, reorderable
    maxFiles = 1,
    multiple = false,
    disabled = false,
    className,
    ...dropzoneProps
  } = props;

  const [files, setFiles] = useControllableState<File[]>({
    prop: valueProp,
    onChange: onValueChange,
  });

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (!multiple && maxFiles === 1 && acceptedFiles.length > 1) {
        toast.error("Cannot upload more than 1 file at a time");
        return;
      }

      if ((files?.length ?? 0) + acceptedFiles.length > maxFiles) {
        toast.error(`Cannot upload more than ${maxFiles} files`);
        return;
      }

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      const updatedFiles = files ? [...files, ...newFiles] : newFiles;

      setFiles(updatedFiles);

      if (rejectedFiles.length > 0) {
        for (const file of rejectedFiles) {
          toast.error(`File ${file.file.name} was rejected`);
        }
      }

      if (
        onUpload &&
        updatedFiles.length > 0 &&
        updatedFiles.length <= maxFiles
      ) {
        const target =
          updatedFiles.length > 0 ? `${updatedFiles.length} files` : "file";

        toast.promise(onUpload(updatedFiles), {
          loading: `Uploading ${target}...`,
          success: () => {
            setFiles([]);
            return `${target} uploaded`;
          },
          error: `Failed to upload ${target}`,
        });
      }
    },
    [files, maxFiles, multiple, onUpload, setFiles]
  );

  const onRemove = useCallback(
    (index: number) => {
      if (!files) return;
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onValueChange?.(newFiles);
    },
    [files, setFiles, onValueChange]
  );

  const onRemoveRef = useRef(onRemove);
  React.useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);
  const handleRemove = useCallback((index: number) => {
    onRemoveRef.current(index);
  }, []);

  // Revoke preview url when component unmounts
  React.useEffect(
    () => () => {
      if (!files) return;
      for (const file of files) {
        if (isFileWithPreview(file)) {
          URL.revokeObjectURL(file.preview);
        }
      }
    },
    [files]
  );

  const isDisabled = disabled || (files?.length ?? 0) >= maxFiles;

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      <Dropzone
        accept={accept}
        disabled={isDisabled}
        maxFiles={maxFiles}
        maxSize={maxSize}
        multiple={maxFiles > 1 || multiple}
        onDrop={onDrop}
      >
        {({
          getRootProps,
          getInputProps,
          isDragActive,
        }: {
          getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
          getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
          isDragActive: boolean;
        }) => (
          <div
            {...getRootProps()}
            className={cn(
              "group border-muted-foreground/25 hover:bg-muted/25 relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed px-5 py-2.5 text-center transition",
              "ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
              isDragActive && "border-muted-foreground/50",
              isDisabled && "pointer-events-none opacity-60",
              className
            )}
            {...dropzoneProps}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <Icons.upload
                    aria-hidden="true"
                    className="text-muted-foreground size-7"
                  />
                </div>
                <p className="text-muted-foreground font-medium">
                  Drop the files here
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <Icons.upload
                    aria-hidden="true"
                    className="text-muted-foreground size-7"
                  />
                </div>
                <div className="space-y-px">
                  <p className="text-muted-foreground font-medium">
                    Drag {`'n'`} drop files here, or click to select files
                  </p>
                  <p className="text-muted-foreground/70 text-sm">
                    You can upload
                    {maxFiles > 1
                      ? ` ${maxFiles === Number.POSITIVE_INFINITY ? "multiple" : maxFiles}
                      files (up to ${formatBytes(maxSize)} each)`
                      : ` a file with ${formatBytes(maxSize)}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Dropzone>
      {files?.map((file, index) => (
        <FileCard
          file={file}
          index={index}
          key={file.name}
          onRemove={handleRemove}
          progress={progresses?.[file.name]}
        />
      ))}
    </div>
  );
}

interface FileCardProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
  progress?: number;
}

function FileCard({ file, index, progress, onRemove }: FileCardProps) {
  const handleRemoveClick = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div className="relative flex items-center space-x-4">
      <div className="flex flex-1 space-x-4">
        {isFileWithPreview(file) ? (
          <img
            alt={file.name}
            className="aspect-square shrink-0 rounded-md object-cover"
            height={48}
            loading="lazy"
            src={file.preview}
            width={48}
          />
        ) : null}
        <div className="flex w-full flex-col gap-2">
          <div className="space-y-px">
            <p className="text-foreground/80 line-clamp-1 text-sm font-medium">
              {file.name}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(file.size)}
            </p>
          </div>
          {progress ? <Progress value={progress} /> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="size-8 rounded-full"
          disabled={progress !== undefined && progress < 100}
          onClick={handleRemoveClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Icons.close className="text-muted-foreground" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  );
}

function isFileWithPreview(file: File): file is File & { preview: string } {
  return "preview" in file && typeof file.preview === "string";
}
