import { useSelector } from "@tanstack/react-form";

/**
 * Minimal structural shape `useFieldValue` needs from a field.
 *
 * `store` is typed as `unknown` because:
 *   1. In this version of `@tanstack/react-form`, the store on a field is a
 *      `ReadonlyStore<FieldLikeState<...>>`. `ReadonlyStore` does not
 *      structurally expose `getState` in a way TypeScript can verify, so any
 *      concrete method-shape constraint fails the assignability check.
 *   2. `useFieldValue` never touches the store directly — it passes it to
 *      `useSelector`, which validates the store at the call boundary.
 *
 * Using `unknown` here defers all store-shape validation to `useSelector`,
 * where it belongs.
 */
interface FieldWithStore {
  store: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Runtime-checked coercion of the caller-supplied `unknown` store into the
 * exact parameter type `useSelector` expects.
 *
 * `@tanstack/react-form`'s `ReadonlyStore` is not structurally exposed, so
 * there is no type guard that can prove the shape. The runtime check below
 * confirms the store is object-like and exposes the one method `useSelector`
 * uses internally (`.getState` or `.subscribe`); only then do we hand it to
 * the library. If the store fails the check we throw a descriptive error
 * instead of silently passing a bad value.
 */
function toSelectionSource(store: unknown): Parameters<typeof useSelector>[0] {
  if (!isRecord(store)) {
    throw new TypeError(
      `useFieldValue: expected field.store to be a TanStack Store instance (object), got ${typeof store}`
    );
  }
  if (
    typeof store.subscribe !== "function" &&
    typeof store.getState !== "function"
  ) {
    throw new TypeError(
      "useFieldValue: field.store does not look like a TanStack Store " +
        "(missing subscribe/getState)"
    );
  }
  // The runtime checks above guarantee the store is a TanStack Store. The
  // assertion below is unavoidable: `ReadonlyStore`'s methods are not
  // structurally exposed, so TS cannot verify this shape without it.
  return store as Parameters<typeof useSelector>[0];
}

export function useFieldValue<T>(
  field: FieldWithStore,
  guard: (v: unknown) => v is T,
  fallback: T
): T {
  return useSelector(toSelectionSource(field.store), (s: unknown) => {
    const value = isRecord(s) ? s.value : undefined;
    return guard(value) ? value : fallback;
  });
}
