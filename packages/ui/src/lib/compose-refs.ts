// src/lib/compose-refs.ts
import * as React from "react";

function isEventLike(value: unknown): value is { defaultPrevented: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "defaultPrevented" in value &&
    typeof value.defaultPrevented === "boolean"
  );
}

/**
 * Compose multiple event handlers into one.
 *
 * `originalEventHandler` runs first. `ourEventHandler` runs only if
 * `checkForDefaultPrevented` is false, or if it is true and the original
 * handler did not call `event.preventDefault()`.
 */
export function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {}
): (event: E) => void {
  return function handleEvent(event: E) {
    originalEventHandler?.(event);

    if (
      !checkForDefaultPrevented ||
      !isEventLike(event) ||
      !event.defaultPrevented
    ) {
      ourEventHandler?.(event);
    }
  };
}

/**
 * A ref that may be a callback ref, an object ref, or `null` / `undefined`.
 */
export type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * A ref callback that supports React 19 cleanups.
 *
 * The function is called with the node on mount and with `null` on unmount.
 * If any composed ref returned a cleanup function, the caller must invoke
 * the returned function to release resources. React 19 does this
 * automatically; React 18 ignores the return value.
 */
export type RefCallback<T> = (instance: T | null) => (() => void) | undefined;

/**
 * Attach a value to a ref, returning whatever the ref returned.
 */
function setRef<T>(
  ref: PossibleRef<T>,
  value: T | null
): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup = ref(value);
    return typeof cleanup === "function" ? cleanup : undefined;
  }

  if (ref !== null && ref !== undefined) {
    ref.current = value;
  }

  return undefined;
}

/**
 * Compose multiple refs into one.
 */
export function composeRefs<T>(...refs: Array<PossibleRef<T>>): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => setRef(ref, node));
    const hasCleanup = cleanups.some((c) => typeof c === "function");

    if (!hasCleanup) return;

    return () => {
      for (let i = 0; i < cleanups.length; i += 1) {
        const cleanup = cleanups[i];
        if (typeof cleanup === "function") {
          cleanup();
        } else {
          setRef(refs[i], null);
        }
      }
    };
  };
}

/**
 * Compose multiple refs into a single, stable callback ref.
 *
 * Stores the latest refs in a ref object via useLayoutEffect so the
 * returned callback remains stable across renders without mutating
 * during the render phase.
 */
export function useComposedRefs<T>(
  ...refs: Array<PossibleRef<T>>
): React.RefCallback<T> {
  const refsRef = React.useRef(refs);

  React.useLayoutEffect(() => {
    refsRef.current = refs;
  });

  return React.useCallback((node: T | null) => {
    composeRefs(...refsRef.current)(node);
  }, []);
}
