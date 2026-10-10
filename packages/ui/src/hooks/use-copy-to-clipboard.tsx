"use client";

import * as React from "react";

export interface UseCopyToClipboardProps {
  timeout?: number;
}

export function useCopyToClipboard({
  timeout = 2000,
}: UseCopyToClipboardProps = {}) {
  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const copyToClipboard = React.useCallback(
    async (value: string): Promise<boolean> => {
      if (!value) return false;

      // `navigator.clipboard` is absent on non-secure origins
      // (plain HTTP) and in older browsers. The DOM lib types it as
      // non-optional, so we widen it here — the runtime check is
      // real, only the type needs correcting.
      const clipboard = (
        globalThis.navigator as Navigator & {
          clipboard?: Clipboard;
        }
      ).clipboard;

      try {
        await clipboard.writeText(value);
      } catch {
        // NotAllowedError when the document isn't focused, or the
        // permission prompt is denied. Treat as failure, not a crash.
        return false;
      }

      setIsCopied(true);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        timeoutRef.current = null;
      }, timeout);

      return true;
    },
    [timeout]
  );

  return { isCopied, copyToClipboard };
}
