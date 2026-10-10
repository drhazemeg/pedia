import "./styles/index.css";
import { Separator } from "@pedia/ui/components/separator";
import { cn } from "@pedia/ui/lib/utils";
import type { Content, Editor } from "@tiptap/react";
import { EditorContent, EditorContext } from "@tiptap/react";
import { useMemo } from "react";

import { LinkBubbleMenu } from "./components/bubble-menu/link-bubble-menu";
import { MeasuredContainer } from "./components/measured-container";
import { SectionFive } from "./components/section/five";
import { SectionFour } from "./components/section/four";
import { SectionOne } from "./components/section/one";
import { SectionThree } from "./components/section/three";
import { SectionTwo } from "./components/section/two";
import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap";
import { useMinimalTiptapEditor } from "./hooks/use-minimal-tiptap";
import { useTiptapEditor } from "./hooks/use-tiptap-editor";

export interface MinimalTiptapProps extends Omit<
  UseMinimalTiptapEditorProps,
  "onUpdate"
> {
  value?: Content;
  onChange?: (value: Content) => void;
  className?: string;
  editorContentClassName?: string;
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="border-border flex h-12 shrink-0 overflow-x-auto border-b p-2">
      <div className="flex w-max items-center gap-px">
        <SectionOne activeLevels={[1, 2, 3, 4, 5, 6]} editor={editor} />

        <Separator className="mx-2" orientation="vertical" />

        <SectionTwo
          activeActions={[
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "code",
            "clearFormatting",
          ]}
          editor={editor}
          mainActionCount={3}
        />

        <Separator className="mx-2" orientation="vertical" />

        <SectionThree editor={editor} />

        <Separator className="mx-2" orientation="vertical" />

        <SectionFour
          activeActions={["orderedList", "bulletList"]}
          editor={editor}
          mainActionCount={0}
        />

        <Separator className="mx-2" orientation="vertical" />

        <SectionFive
          activeActions={["codeBlock", "blockquote", "horizontalRule"]}
          editor={editor}
          mainActionCount={0}
        />
      </div>
    </div>
  );
}

export function MinimalTiptapEditor({
  value,
  onChange,
  className,
  editorContentClassName,
  ...props
}: MinimalTiptapProps) {
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: onChange,
    ...props,
  });

  const editorContextValue = useMemo(() => ({ editor }), [editor]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContext.Provider value={editorContextValue}>
      <MainMinimalTiptapEditor
        className={className}
        editor={editor}
        editorContentClassName={editorContentClassName}
      />
    </EditorContext.Provider>
  );
}

MinimalTiptapEditor.displayName = "MinimalTiptapEditor";

export default MinimalTiptapEditor;

export function MainMinimalTiptapEditor({
  editor: providedEditor,
  className,
  editorContentClassName,
}: MinimalTiptapProps & { editor: Editor }) {
  const { editor } = useTiptapEditor(providedEditor);

  if (!editor) {
    return null;
  }

  return (
    <MeasuredContainer
      as="div"
      className={cn(
        "border-input min-data-[orientation=vertical]:h-72 flex h-auto w-full flex-col rounded-md border shadow-xs",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        className
      )}
      name="editor"
    >
      <Toolbar editor={editor} />
      <EditorContent
        className={cn("minimal-tiptap-editor", editorContentClassName)}
        editor={editor}
      />
      <LinkBubbleMenu editor={editor} />
    </MeasuredContainer>
  );
}
