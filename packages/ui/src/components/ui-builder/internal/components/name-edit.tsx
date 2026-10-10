import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Check, X as XIcon } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface NameEditProps {
  initialName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export const NameEdit: React.FC<NameEditProps> = ({
  initialName,
  onSave,
  onCancel,
}) => {
  const [newName, setNewName] = useState(initialName);

  const handleSave = useCallback(() => {
    if (newName.trim()) {
      onSave(newName.trim());
    }
  }, [newName, onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  return (
    <div className="flex items-center">
      <Input
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        type="text"
        value={newName}
      />
      <Button
        aria-label="Save rename"
        className="ms-1"
        onClick={handleSave}
        size="icon"
        variant="ghost"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        aria-label="Cancel rename"
        className="ms-1"
        onClick={handleCancel}
        size="icon"
        variant="ghost"
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
