// src/utils/data-extract.ts

import { useMemo } from "react";

// ─── Public types ───────────────────────────────────────────────────────────

export interface SafeResult<T> {
  data?: T | { data?: T } | null;
  error?: Error | null;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
}

export interface ExtractOptions {
  /**
   * When `true` (default) an empty array is returned for missing/unrecognised
   * data shapes. When `false`, `null` is returned instead, letting the caller
   * distinguish "no data yet" from "server confirmed zero results".
   */
  fallbackToEmptyArray?: boolean;
  warnOnUnexpected?: boolean;
}

// ─── Runtime guards ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * A `{ data: ... }` envelope. Note this is a *shape* check only — it does not
 * verify that `data` is populated.
 */
function isEnvelope(v: unknown): v is { data?: unknown } {
  return isRecord(v) && "data" in v;
}

/**
 * Return `true` iff `v` is a plain object carrying a non-null `id` field.
 */
function isEntity(v: unknown): v is Record<string, unknown> & { id: unknown } {
  return isRecord(v) && "id" in v && v.id !== undefined && v.id !== null;
}

/** Return `true` iff `v` is neither `null` nor `undefined`. */
function isPresent<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

/**
 * Walk a shallow envelope chain and return the first array found.
 */
function findArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isEnvelope(value)) return null;

  const first = value.data;
  if (Array.isArray(first)) return first;

  if (isEnvelope(first)) {
    const second = first.data;
    if (Array.isArray(second)) return second;
  }

  return null;
}

// ─── extractData ────────────────────────────────────────────────────────────

export function extractData<T>(
  result: SafeResult<T> | T | null | undefined,
  options: ExtractOptions = {}
): T[] | null {
  const { fallbackToEmptyArray = true, warnOnUnexpected = false } = options;
  const fallback: T[] | null = fallbackToEmptyArray ? [] : null;

  if (!isPresent(result)) return fallback;

  if (Array.isArray(result)) {
    return result as T[];
  }

  const array = findArray(result);
  if (array) {
    return array as T[];
  }

  if (isEntity(result)) {
    return [result as T];
  }

  if (warnOnUnexpected) {
    console.warn("extractData: Unexpected data structure", result);
  }

  return fallback;
}

// ─── extractSingle ──────────────────────────────────────────────────────────

export function extractSingle<T>(
  result: SafeResult<T> | T | null | undefined
): T | null {
  if (!isPresent(result)) return null;

  if (Array.isArray(result)) {
    if (result.length === 0) return null;

    return result[0] as T;
  }

  let current: unknown = result;
  for (let depth = 0; depth < 2 && isEnvelope(current); depth += 1) {
    const inner = current.data;
    if (!isPresent(inner)) return null;

    if (Array.isArray(inner)) {
      if (inner.length === 0) return null;

      return inner[0] as T;
    }

    current = inner;
  }

  return current as T;
}

// ─── React hooks ────────────────────────────────────────────────────────────

export interface ExtractDataResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export interface ExtractSingleResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

function readStatus(result: SafeResult<unknown> | null | undefined): {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
} {
  return {
    isLoading: result?.isLoading ?? false,
    isError: isPresent(result?.error),
    error: result?.error ?? null,
    isSuccess: result?.isSuccess ?? false,
  };
}

/**
 * Extract an array from a query result and memoize it.
 *
 * ⚠️  `options` is included in the dependency array. Passing a fresh object
 * literal on every render (`useExtractData(r, { warnOnUnexpected: true })`)
 * will recompute the memo on every render. Prefer `useExtractDataStable`,
 * which takes primitives, or hoist the options object.
 */
export function useExtractData<T>(
  result: SafeResult<T> | null | undefined,
  options: ExtractOptions = {}
): ExtractDataResult<T> {
  const status = readStatus(result);

  const data = useMemo(
    () => extractData<T>(result, options) ?? [],
    [result, options]
  );

  return { ...status, data };
}

/**
 * Memo-stable variant of `useExtractData`. Accepts the two option flags as
 * primitives so callers don't have to hoist an options object.
 */
export function useExtractDataStable<T>(
  result: SafeResult<T> | null | undefined,
  fallbackToEmptyArray = true,
  warnOnUnexpected = false
): ExtractDataResult<T> {
  const status = readStatus(result);

  const data = useMemo(
    () =>
      extractData<T>(result, {
        fallbackToEmptyArray,
        warnOnUnexpected,
      }) ?? [],
    [result, fallbackToEmptyArray, warnOnUnexpected]
  );

  return { ...status, data };
}

export function useExtractSingle<T>(
  result: SafeResult<T> | null | undefined
): ExtractSingleResult<T> {
  const status = readStatus(result);

  const data = useMemo(() => extractSingle<T>(result), [result]);

  return { ...status, data };
}

// ─── extractPaginatedData ───────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface PaginatedShape<T> {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
}

function isPaginatedShape<T>(v: unknown): v is PaginatedShape<T> {
  if (!isRecord(v)) return false;
  const hasData = "data" in v && Array.isArray(v.data);
  const hasPaginationKeys = "total" in v || "page" in v || "limit" in v;
  return hasData || hasPaginationKeys;
}

export function extractPaginatedData<T>(
  result: SafeResult<PaginatedShape<T>> | null | undefined
): PaginatedResult<T> {
  const empty: PaginatedResult<T> = { data: [], total: 0, page: 0, limit: 0 };

  if (!isPresent(result) || typeof result !== "object") return empty;

  let shape: PaginatedShape<T> | null = null;

  if (isPaginatedShape<T>(result)) {
    shape = result;
  } else if (isEnvelope(result) && isPaginatedShape<T>(result.data)) {
    shape = result.data;
  }

  if (!shape) return empty;

  return {
    data: Array.isArray(shape.data) ? shape.data : [],
    total: typeof shape.total === "number" ? shape.total : 0,
    page: typeof shape.page === "number" ? shape.page : 0,
    limit: typeof shape.limit === "number" ? shape.limit : 0,
  };
}

export function useExtractPaginatedData<T>(
  result: SafeResult<PaginatedShape<T>> | null | undefined
): PaginatedResult<T> {
  return useMemo(() => extractPaginatedData<T>(result), [result]);
}

// ─── isSafeResult ───────────────────────────────────────────────────────────

export function isSafeResult<T>(value: unknown): value is SafeResult<T> {
  if (!isRecord(value)) return false;

  const hasData = "data" in value;
  const hasLoading =
    "isLoading" in value && typeof value.isLoading === "boolean";
  const hasErrorFlag = "isError" in value && typeof value.isError === "boolean";
  const hasError =
    "error" in value && (value.error === null || value.error instanceof Error);
  const hasSuccess =
    "isSuccess" in value && typeof value.isSuccess === "boolean";

  return hasData || hasLoading || hasErrorFlag || hasError || hasSuccess;
}

// ─── getNestedData ──────────────────────────────────────────────────────────

export function getNestedData(
  obj: unknown,
  path: Array<string | number>
): unknown {
  let current: unknown = obj;

  for (const key of path) {
    if (Array.isArray(current)) {
      if (typeof key !== "number") return undefined;
      current = current[key];
      continue;
    }

    if (!isRecord(current)) return undefined;

    current = current[String(key)];
  }

  return current;
}
