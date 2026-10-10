/* oxlint-disable react-hooks-js/incompatible-library */
"use no memo";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

type UseDataTableRowVirtualizerOptions = {
  count: number;
  scrollElementRef: RefObject<HTMLDivElement | null>;
  estimateSize: number;
};

export function useDataTableRowVirtualizer({
  count,
  scrollElementRef,
  estimateSize,
}: UseDataTableRowVirtualizerOptions) {
  return useVirtualizer({
    count,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });
}
