import { useCallback, useRef } from "react";

/**
 * Throttle a callback so it runs at most once per `delay` milliseconds.
 *
 * The generic constraint `(...args: never[]) => unknown` is the portable
 * form for "any function" — `any[]` triggers `typescript/no-explicit-any`,
 * and `unknown[]` would refuse to accept callbacks with specific argument
 * types. `never[]` is the bottom of the argument-type lattice, so it
 * accepts any function signature while staying `any`-free.
 */
export function useThrottle<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef(0);
  // `ReturnType<typeof setTimeout>` resolves to `number` in the DOM and
  // to `NodeJS.Timeout` in Node. Using it keeps this hook portable without
  // pulling `@types/node` into a browser package.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const handler = () => {
        const now = Date.now();

        if (lastRan.current === 0 || now - lastRan.current >= delay) {
          callback(...args);
          lastRan.current = now;
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(
            () => {
              callback(...args);
              lastRan.current = Date.now();
            },
            delay - (now - lastRan.current)
          );
        }
      };

      handler();
    },
    [callback, delay]
  );
}
