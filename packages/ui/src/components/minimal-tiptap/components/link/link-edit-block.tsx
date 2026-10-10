import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { Switch } from "@pedia/ui/components/switch";
import { cn } from "@pedia/ui/lib/utils";
import * as React from "react";

export interface LinkEditorProps extends React.ComponentProps<"div"> {
  defaultUrl?: string;
  defaultText?: string;
  defaultIsNewTab?: boolean;
  onSave: (url: string, text?: string, isNewTab?: boolean) => void;
}

export function LinkEditBlock({
  onSave,
  defaultIsNewTab,
  defaultUrl,
  defaultText,
  className,
}: LinkEditorProps) {
  const formRef = React.useRef<HTMLDivElement>(null);
  const [url, setUrl] = React.useState(defaultUrl || "");
  const [text, setText] = React.useState(defaultText || "");
  const [isNewTab, setIsNewTab] = React.useState(defaultIsNewTab || false);

  const handleSave = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (formRef.current) {
        const isValid = Array.from(
          formRef.current.querySelectorAll("input")
        ).every((input) => input.checkValidity());

        if (isValid) {
          onSave(url, text, isNewTab);
        } else {
          formRef.current.querySelectorAll("input").forEach((input) => {
            if (!input.checkValidity()) {
              input.reportValidity();
            }
          });
        }
      }
    },
    [onSave, url, text, isNewTab]
  );

  return (
    <div ref={formRef}>
      <div className={cn("space-y-4", className)}>
        <div className="space-y-1">
          <Label>URL</Label>
          <Input
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            required
            type="url"
            value={url}
          />
        </div>

        <div className="space-y-1">
          <Label>Display Text (optional)</Label>
          <Input
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter display text"
            type="text"
            value={text}
          />
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Label>Open in New Tab</Label>
          <Switch checked={isNewTab} onCheckedChange={setIsNewTab} />
        </div>

        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          <Button onClick={handleSave} type="button">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

LinkEditBlock.displayName = "LinkEditBlock";

export default LinkEditBlock;
