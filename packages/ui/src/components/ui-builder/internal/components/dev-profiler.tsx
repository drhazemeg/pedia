import type React from "react";
import type { ProfilerOnRenderCallback } from "react";
import { Profiler, useCallback } from "react";

interface DevProfilerProps {
  id: string;
  threshold: number; // Threshold in milliseconds
  children: React.ReactNode;
}

export const DevProfiler: React.FC<DevProfilerProps> = ({
  id,
  threshold,
  children,
}) => {
  const onRenderCallback: ProfilerOnRenderCallback = useCallback(
    (_id, _phase, actualDuration) => {
      if (actualDuration > threshold) {
        //
      }
    },
    [threshold]
  );

  if (process.env.NODE_ENV === "production") {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};
