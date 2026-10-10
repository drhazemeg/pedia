import type { toggleVariants } from "@pedia/ui/components/toggle";
import {
  IconCaretDown,
  IconDeviceIpadHorizontalHeart,
} from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import { Code, PlusIcon, Quote } from "lucide-react";
import type * as React from "react";

import type { FormatAction } from "../../types";
import { ImageEditDialog } from "../image/image-edit-dialog";
import { LinkEditPopover } from "../link/link-edit-popover";
import { ToolbarSection } from "../toolbar-section";

type InsertElementAction = "codeBlock" | "blockquote" | "horizontalRule";

interface InsertElement extends FormatAction {
  value: InsertElementAction;
}

const formatActions: InsertElement[] = [
  {
    value: "codeBlock",
    label: "Code block",
    icon: <Code className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCodeBlock().run(),
    shortcuts: ["mod", "alt", "C"],
  },
  {
    value: "blockquote",
    label: "Blockquote",
    icon: <Quote className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBlockquote().run(),
    shortcuts: ["mod", "shift", "B"],
  },
  {
    value: "horizontalRule",
    label: "Divider",
    icon: <IconDeviceIpadHorizontalHeart className="size-5" />,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().setHorizontalRule().run(),
    shortcuts: ["mod", "alt", "-"],
  },
];

const defaultActiveActions = formatActions.map((action) => action.value);

interface SectionFiveProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: InsertElementAction[];
  mainActionCount?: number;
}

export const SectionFive: React.FC<SectionFiveProps> = ({
  editor,
  activeActions = defaultActiveActions,
  mainActionCount = 0,
  size,
  variant,
}) => (
  <>
    <LinkEditPopover editor={editor} size={size} variant={variant} />
    <ImageEditDialog editor={editor} size={size} variant={variant} />
    <ToolbarSection
      actions={formatActions}
      activeActions={activeActions}
      dropdownIcon={
        <>
          <PlusIcon className="size-5" />
          <IconCaretDown className="size-5" />
        </>
      }
      dropdownTooltip="Insert elements"
      editor={editor}
      mainActionCount={mainActionCount}
      size={size}
      variant={variant}
    />
  </>
);

SectionFive.displayName = "SectionFive";

export default SectionFive;
