import { cn } from "@pedia/ui/lib/utils";
import type * as React from "react";

interface MarqueeProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  gap?: number;
  pauseOnHover?: boolean;
  repeat?: number;
  reverse?: boolean;
  vertical?: boolean;
}

function Marquee(props: MarqueeProps) {
  const {
    children,
    className,
    duration = 40,
    delay = 0,
    gap = 1,
    pauseOnHover = false,
    repeat = 4,
    reverse = false,
    vertical = false,
    ...rest
  } = props;

  return (
    <div
      className={cn(
        "group flex gap-(--marquee-gap) overflow-hidden p-3",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
      style={
        {
          "--marquee-duration": `${duration}s`,
          "--marquee-delay": `${delay}s`,
          "--marquee-gap": `${gap}rem`,
        } as React.CSSProperties
      }
      {...rest}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          className={cn(
            "flex shrink-0 justify-around gap-(--marquee-gap) [animation-delay:var(--marquee-delay)]",
            {
              "animate-marquee-horizontal flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:paused": pauseOnHover,
              "direction-[reverse]": reverse,
            }
          )}
          key={i}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export { Marquee, type MarqueeProps };
