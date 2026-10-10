import { useDraggable } from "@dnd-kit/core";
import { cn } from "@pedia/ui/lib/utils";
import { GripVertical } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface DraggableNewComponentProps {
  componentType: string;
  children: React.ReactNode;
  onDragStart?: () => void;
  className?: string;
}

/**
 * Wrapper component that makes a new component item draggable from the popover.
 * When dragged, the component can be dropped onto the canvas to create a new layer.
 */
export const DraggableNewComponent: React.FC<DraggableNewComponentProps> = ({
  componentType,
  children,
  onDragStart,
  className,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: `new-component-${componentType}`,
      data: {
        type: "new-component",
        componentType,
      },
    });

  // Call onDragStart when dragging begins
  useEffect(() => {
    if (isDragging && onDragStart) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        isDragging && "opacity-50",
        className
      )}
      ref={setNodeRef}
      {...attributes}
    >
      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Drag ${componentType} to canvas`}
        className={cn(
          "-ms-1 flex-shrink-0 cursor-grab p-1 active:cursor-grabbing",
          "text-muted-foreground hover:text-foreground transition-colors",
          "hover:bg-muted/50 rounded"
        )}
        role="button"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {/* Component content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default DraggableNewComponent;
