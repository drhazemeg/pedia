// widgets/TimeSelector.tsx

import { Button } from "@pedia/ui/components/button";
import { cn } from "@pedia/ui/lib/utils";
import { Clock } from "lucide-react";
import * as React from "react";

export interface TimeSelectProps {
  availableSlots?: readonly string[];
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}

const START_MINUTES = 8 * 60;
const END_MINUTES = 18 * 60;
const STEP_MINUTES = 15;

/**
 * Shared empty-array sentinel. Reusing a single reference avoids breaking
 * referential equality on every render when the caller omits `availableSlots`.
 */
const NO_SLOTS: readonly string[] = Object.freeze([]);

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let m = START_MINUTES; m <= END_MINUTES; m += STEP_MINUTES) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const display = hours % 12 || 12;
    slots.push(
      `${String(display).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`
    );
  }
  return slots;
}

const ALL_TIME_SLOTS = buildTimeSlots();

/* ------------------------------------------------------------------ */
/* Slot button — extracted so each item can memoize its own handler    */
/* ------------------------------------------------------------------ */

interface TimeSlotButtonProps {
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: (time: string) => void;
  time: string;
}

function TimeSlotButton({
  time,
  isSelected,
  isAvailable,
  onSelect,
}: TimeSlotButtonProps) {
  const handleClick = React.useCallback(() => {
    onSelect(time);
  }, [onSelect, time]);

  return (
    <button
      className={cn(
        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm",
        isSelected && "bg-accent text-accent-foreground",
        !isAvailable && "cursor-not-allowed opacity-50",
        isAvailable && "hover:bg-accent hover:text-accent-foreground"
      )}
      disabled={!isAvailable}
      onClick={handleClick}
      type="button"
    >
      <span>{time}</span>
      {isSelected ? (
        <span className="text-muted-foreground text-xs">✓</span>
      ) : null}
      {isAvailable ? null : (
        <span className="text-muted-foreground text-xs">Booked</span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Main widget                                                         */
/* ------------------------------------------------------------------ */

export function TimeSelect({
  value,
  onChange,
  disabled,
  availableSlots = NO_SLOTS,
  className,
}: TimeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isTimeAvailable = React.useCallback(
    (time: string) => {
      if (availableSlots.length === 0) return true;
      return availableSlots.some((slot) => {
        const slotDate = new Date(slot);
        return (
          slotDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }) === time
        );
      });
    },
    [availableSlots]
  );

  const handleToggle = React.useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleSelectSlot = React.useCallback(
    (time: string) => {
      onChange(time);
      setIsOpen(false);
    },
    [onChange]
  );

  const displayValue = value || "Select time";

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
        disabled={disabled}
        onClick={handleToggle}
        type="button"
        variant="outline"
      >
        <Clock className="mr-2 size-4" />
        {displayValue}
      </Button>

      {isOpen ? (
        <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md">
          {ALL_TIME_SLOTS.map((time) => (
            <TimeSlotButton
              isAvailable={isTimeAvailable(time)}
              isSelected={value === time}
              key={time}
              onSelect={handleSelectSlot}
              time={time}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
