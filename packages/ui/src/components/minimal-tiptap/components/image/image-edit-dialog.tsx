import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@pedia/ui/components/dialog";
import type { toggleVariants } from "@pedia/ui/components/toggle";
import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import { Image } from "lucide-react";
import { useState } from "react";

import { ToolbarButton } from "../toolbar-button";
import { ImageEditBlock } from "./image-edit-block";

interface ImageEditDialogProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

function ImageEditDialog({ editor, size, variant }: ImageEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <ToolbarButton
            aria-label="Image"
            isActive={editor.isActive("image")}
            size={size}
            tooltip="Image"
            variant={variant}
          />
        }
      >
        <Image className="size-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select image</DialogTitle>
          <DialogDescription className="sr-only">
            Upload an image from your computer
          </DialogDescription>
        </DialogHeader>
        <ImageEditBlock close={() => setOpen(false)} editor={editor} />
      </DialogContent>
    </Dialog>
  );
}

export { ImageEditDialog };
