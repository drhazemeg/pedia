import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import type { toggleVariants } from "@pedia/ui/components/toggle";
import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import { Link2 } from "lucide-react";
import * as React from "react";

import { ToolbarButton } from "../toolbar-button";
import { LinkEditBlock } from "./link-edit-block";

interface LinkEditPopoverProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

function LinkEditPopover({ editor, size, variant }: LinkEditPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, " ");

  const onSetLink = React.useCallback(
    (url: string, text?: string, openInNewTab?: boolean) => {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .insertContent({
          type: "text",
          text: text || url,
          marks: [
            {
              type: "link",
              attrs: {
                href: url,
                target: openInNewTab ? "_blank" : "",
              },
            },
          ],
        })
        .setLink({ href: url })
        .run();

      editor.commands.enter();
    },
    [editor]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <ToolbarButton
            aria-label="Insert link"
            disabled={editor.isActive("codeBlock")}
            isActive={editor.isActive("link")}
            size={size}
            tooltip="Link"
            variant={variant}
          />
        }
      >
        <Link2 className="size-5" />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom">
        <LinkEditBlock defaultText={text} onSave={onSetLink} />
      </PopoverContent>
    </Popover>
  );
}

export { LinkEditPopover };
