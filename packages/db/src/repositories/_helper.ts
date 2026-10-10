// packages/db/src/repositories/_helpers.ts
import type { SQL } from "drizzle-orm";
import { and } from "drizzle-orm";

// ============================================================
// Runtime guards
// ============================================================

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Narrow `unknown` to `Array<unknown>` without going through `any`.
 * See the note in `base.repository.ts` — `Array.isArray` narrows to `any[]`,
 * which leaks `any` into every subsequent access.
 */
export function asUnknownArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value as unknown[];
}

// ============================================================
// SQL helpers
// ============================================================

/**
 * Escape `%`, `_`, and `\` in a user-supplied LIKE pattern so a search term
 * containing wildcards cannot widen the match.
 *
 * `\` must be escaped first — escaping it alongside the wildcards would
 * double-escape the backslashes introduced by the other replacements.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Combine an array of possibly-`undefined` conditions into a single `SQL`.
 * Returns `undefined` for an empty array so callers can pass the result
 * straight to Drizzle's `.where()`.
 */
export function combineConditions(
  conditions: Array<SQL | undefined>
): SQL | undefined {
  const valid = conditions.filter((c): c is SQL => c !== undefined);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return and(...valid);
}

// ============================================================
// Cache-key helpers
// ============================================================

/**
 * Stable JSON stringify for cache keys.
 *
 * `JSON.stringify` on an object with keys inserted in different orders
 * produces different strings, so two logically identical query option bags
 * can miss each other in the cache. Sorting keys fixes that. Dates are
 * normalized to ISO strings; everything else is passed through.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val instanceof Date) return val.toISOString();
    if (isRecord(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val).toSorted()) {
        sorted[k] = val[k];
      }
      return sorted;
    }
    return val;
  });
}

/**
 * Build a namespaced cache key from a prefix, scope, and any number of
 * trailing discriminants. `undefined` discriminants collapse to `"all"` so
 * "no filter" and "filter that happens to be undefined" produce the same key.
 */
export function cacheKey(
  prefix: string,
  scope: { clinicId?: string; providerId?: string } = {},
  ...rest: unknown[]
): string {
  const parts: string[] = [
    prefix,
    scope.clinicId ?? "all",
    scope.providerId ?? "all",
  ];
  for (const r of rest) {
    parts.push(r === undefined || r === null ? "all" : stableStringify(r));
  }
  return parts.join(":");
}
const prefixes = {
  user: "USR",
  patient: "PAT",
  record: "REC",
  lab: "LAB",
  immunization: "IMM",
  encounter: "ENC",
  doctor: "DOC",
  rx: "RX",
  growth: "GRP",
  vital: "VIT",
  condition: "CON",
  allergy: "ALG",
  guardian: "GRD",
  clinic: "CLN",
  staff: "STF",
  audit: "AUD",
  appointment: "APT",
} as const;

type Prefix = keyof typeof prefixes;

type GenerateIdOptions = {
  separator?: string;
};

export function createId(
  prefixOrOptions?: Prefix | GenerateIdOptions,
  inputOptions: GenerateIdOptions = {}
) {
  // Determine if the first argument is an options object
  const isOptions = typeof prefixOrOptions === "object";

  const finalOptions = isOptions ? prefixOrOptions : inputOptions;
  const prefix = isOptions ? undefined : prefixOrOptions;

  const { separator = "_" } = finalOptions;

  const id = crypto.randomUUID();

  if (prefix && prefix in prefixes) {
    return `${prefixes[prefix]}${separator}${id}`;
  }

  return id;
}
