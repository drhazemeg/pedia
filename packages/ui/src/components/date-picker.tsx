"use client";

import { Button } from "@pedia/ui/components/button";
import { Calendar } from "@pedia/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pedia/ui/components/popover";
import { cn } from "@pedia/ui/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { forwardRef } from "react";

export const DatePicker = forwardRef<
  HTMLDivElement,
  {
    date?: Date;
    setDate: (date?: Date) => void;
  }
>(({ date, setDate }, ref) => {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "w-full justify-start text-start font-normal",
              !date && "text-muted-foreground"
            )}
            variant="outline"
          />
        }
      >
        <CalendarIcon className="me-2 h-4 w-4" />
        {date ? format(date, "PPP") : <span>Pick a date</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" ref={ref}>
        <Calendar mode="single" onSelect={setDate} selected={date} />
      </PopoverContent>
    </Popover>
  );
});

DatePicker.displayName = "DatePicker";
