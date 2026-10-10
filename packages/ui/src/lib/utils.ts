export { cn } from "cn";

export const firstElement = <DataType>(array: Array<DataType>) =>
  array[0] ?? null;

export const handleErrorWithNull = async <DataType>(
  callback: () => Promise<DataType>
) => {
  try {
    const value = await callback();

    return value;
  } catch {
    return null;
  }
};

export const handleErrorWithArray = async <DataType>(
  callback: () => Promise<Array<DataType>>
) => {
  try {
    const value = await callback();

    return value;
  } catch {
    return [] as Array<DataType>;
  }
};

export function omitMetadata<T extends { metadata?: unknown }>(value: T) {
  const { metadata: _metadata, ...rest } = value;
  return rest;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

const PARSE_BYTES_REGEX = /^(\d+(?:\.\d+)?)\s*([a-z]+)?$/;

export function parseBytes(input: string): number | null {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
  };
  const match = PARSE_BYTES_REGEX.exec(input.toLowerCase());
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1] ?? "");
  const unit = match[2] ?? "b";
  if (!units[unit]) {
    return null;
  }
  return Math.floor(value * units[unit]);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = 1000;
  const m = s * 60;
  const h = m * 60;
  const d = h * 24;

  if (ms >= d) {
    return `${Number.parseFloat((ms / d).toFixed(2))}d`;
  }
  if (ms >= h) {
    return `${Number.parseFloat((ms / h).toFixed(2))}h`;
  }
  if (ms >= m) {
    return `${Number.parseFloat((ms / m).toFixed(2))}m`;
  }
  return `${Number.parseFloat((ms / s).toFixed(2))}s`;
}

const PARSE_DURATION_REGEX = /^(\d+(?:\.\d+)?)\s*([a-z]+)?$/;

export function parseDuration(input: string): number | null {
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
  };
  const match = PARSE_DURATION_REGEX.exec(input.toLowerCase());
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1] ?? "");
  const unit = match[2] ?? "ms";
  if (!units[unit]) {
    return null;
  }
  return Math.floor(value * units[unit]);
}

const NORMALIZE_REGEX_1 = /[^a-z0-9\s]/g;
const NORMALIZE_REGEX_2 = /\s+/g;

export function normalize(s: string) {
  return String(s)
    .toLowerCase()
    .replace(NORMALIZE_REGEX_1, " ")
    .replace(NORMALIZE_REGEX_2, " ")
    .trim();
}

const STATUS_REGEX = /response code:\s*(\d+)/i;
const MESSAGE_REGEX = /response text:\s*(.*?)(?:,|\s*request id|$)/i;

export function extractError(err: string): {
  status_code: number | null;
  message: string;
} {
  const statusMatch = STATUS_REGEX.exec(err);
  const messageMatch = MESSAGE_REGEX.exec(err);

  return {
    status_code: statusMatch ? Number(statusMatch[1]) : null,
    message:
      messageMatch?.[1] ?? "An unknown error occurred. Please try again later.",
  };
}
const SNAKE_REGEX = /_([a-z0-9])/gi;

export const snakeToCamel = (str: string): string =>
  str.replace(SNAKE_REGEX, (_, g1: string) => g1.toUpperCase());
const CAMEL_REGEX = /[A-Z]/g;
export const camelToSnake = (str: string): string =>
  str.replace(CAMEL_REGEX, (letter) => `_${letter.toLowerCase()}`);

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 6;
const MAX_SLUG_RETRIES = 10;

export function generateSlug(): string {
  let result = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  for (let i = 0; i < SLUG_LENGTH; i += 1) {
    if (!randomValues)
      result += SLUG_CHARS[randomValues[i] % SLUG_CHARS.length];
  }
  return result;
}

export async function generateUniqueSlug(
  checkExists: (slug: string) => boolean | Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt += 1) {
    const slug = generateSlug();
    const exists = await checkExists(slug);
    if (!exists) {
      return slug;
    }
  }
  throw new Error("Failed to generate unique slug after maximum retries");
}

export function ring(color = "ring-primary") {
  return `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${color}`;
}

// const WHITESPACE_REGEX = /\s+/;
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function getInitial(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
// export function getInitials(name: string): string {
// 	const parts = name.trim().split(WHITESPACE_REGEX);

// 	if (parts.length === 0 ?? parts[0] === "") {
// 		return "";
// 	}

// 	if (parts.length === 1) {
// 		return parts[0]?.slice(0, 2)?.toUpperCase() ?? "";
// 	}

// 	const firstInitial = parts[0]?.[0] ?? "";
// 	const lastInitial = parts.at(-1)?.[0] ?? "";

// 	return (firstInitial + lastInitial).toUpperCase();
// }

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("en-US", {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

const SENTENCE_CASE_REGEX_1 = /_/g;
const SENTENCE_CASE_REGEX_2 = /([A-Z])/g;
const SENTENCE_CASE_REGEX_3 = /^\w/;
const SENTENCE_CASE_REGEX_4 = /\s+/g;

export function toSentenceCase(str: string) {
  return str
    .replace(SENTENCE_CASE_REGEX_1, " ")
    .replace(SENTENCE_CASE_REGEX_2, " $1")
    .toLowerCase()
    .replace(SENTENCE_CASE_REGEX_3, (c) => c.toUpperCase())
    .replace(SENTENCE_CASE_REGEX_4, " ")
    .trim();
}

export function calculateAge(dateOfBirth: string | Date): string {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return "N/A";
  }

  if (years === 0) {
    return `${months}m`;
  }
  return `${years}y ${months}m`;
}
/**
 * Uppercases the first character of a string and returns the result.
 */
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a kebab-case slug (eg. "my-example") into a Title Case string.
 */
export function slugToTitle(str: string) {
  return str
    .split("-")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Returns the last element from an array.
 */
export function last<T>(arr: Array<T>) {
  return arr.at(-1);
}

/**
 * Generates a route path by replacing token segments in an id with params.
 * The id uses dot-notation which is converted to slashes; `$param` tokens are
 * replaced from `params`, and `$*` is treated as the catch-all segment.
 */
export function generatePath(
  id: string,
  params: Record<string, string | undefined>
) {
  let result = id.replace("routes", "").replaceAll(".", "/");
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`$${key}`, value ?? "");
  });
  result = result.replace("$", params["*"] ?? "");

  return result;
}

/**
 * Generates a date-based seed string (YYYY-MM-DD) that is stable between
 * SSR and hydration for the same day. Useful for deterministic shuffling.
 */
export function getDateSeed(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Simple hash function for deterministic shuffling
 * Uses a better mixing algorithm to avoid collisions
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
    // Additional mixing
    hash += hash << 10;
    hash ^= hash >> 6;
  }
  // Final mixing
  hash += hash << 3;
  hash ^= hash >> 11;
  hash += hash << 15;
  return hash | 0;
}

/**
 * Shuffles an array deterministically based on a seed string. The same seed
 * will produce the same shuffle order, making it stable between SSR and hydration.
 *
 * @param arr Array to shuffle
 * @param seed Seed string for deterministic shuffling
 * @param keyAccessor Function to extract a key from each item to use in hashing
 * @returns Shuffled array (shallow copy)
 */
export function shuffleWithSeed<T>(
  arr: Array<T>,
  seed: string,
  keyAccessor: (item: T) => string
): Array<T> {
  return [...arr].toSorted((a, b) => {
    const hashA = hashString(keyAccessor(a) + seed);
    const hashB = hashString(keyAccessor(b) + seed);
    return hashA - hashB;
  });
}

/**
 * Returns a shallow-copied array with items shuffled.
 */
export function shuffle<T>(arr: Array<T>): Array<T> {
  const result = arr.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }

  return result;
}
/**
 * Returns a single random element from an array. Accepts an optional
 * `random` function for deterministic tests.
 */
export function sample<T>(arr: Array<T>, random = Math.random()): T {
  return arr[Math.floor(random * arr.length)] as T;
}

/**
 * Sorts an array by a computed value. Undefined values are ordered last and
 * numeric strings are coerced to numbers for intuitive sorting.
 */
function toComparable(value: unknown): number | string | boolean | null {
  if (value === null) return null;
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
}

export function sortBy<T>(
  arr: ReadonlyArray<T>,
  accessor: (d: T) => unknown = (d) => d
): Array<T> {
  return arr
    .map((d, i) => [d, i] as const)
    .toSorted(([a, ai], [b, bi]) => {
      const av = toComparable(accessor(a));
      const bv = toComparable(accessor(b));

      if (av === null) {
        if (bv === null) return ai - bi;
        return 1;
      }
      if (bv === null) return -1;

      const aNum =
        typeof av === "string" && isNumericString(av) ? Number(av) : av;
      const bNum =
        typeof bv === "string" && isNumericString(bv) ? Number(bv) : bv;

      return aNum === bNum ? ai - bi : aNum > bNum ? 1 : -1;
    })
    .map(([d]) => d);
}
/**
 * Returns true if the string fully represents a number (no extra characters).
 */
export function isNumericString(str: unknown): boolean {
  if (typeof str !== "string") {
    return false;
  }
  return !(Number.isNaN(str) || Number.isNaN(Number.parseFloat(str)));
}
/**
 * A utility function from Router, to sort an array of objects by multiple accessors.
 *
 * @param arr Unsorted array
 * @param accessors Callbacks to access the values to sort by
 * @returns Sorted array
 */
export function multiSortBy<T>(
  arr: ReadonlyArray<T>,
  accessors: ReadonlyArray<(item: T) => unknown> = [(d) => d]
): Array<T> {
  return arr
    .map((d, i) => [d, i] as const)
    .toSorted(([a, ai], [b, bi]) => {
      for (const accessor of accessors) {
        const ao = toComparable(accessor(a));
        const bo = toComparable(accessor(b));

        if (ao === null) {
          if (bo === null) continue;
          return 1;
        }
        if (bo === null) return -1;
        if (ao === bo) continue;
        return ao > bo ? 1 : -1;
      }
      return ai - bi;
    })
    .map(([d]) => d);
}
/**
 * A utility function from Router, to remove leading slash from a path.
 *
 * @param path Candidate path to remove leading slash
 * @returns Path without leading slash
 */
export function removeLeadingSlash(path: string): string {
  return path.replace(/^\//, "");
}

/**
 * Measures and logs the execution time of the provided function and returns
 * its result. Works with both sync and async functions.
 */
export async function logTime<T>(
  _lable: string,
  fn: () => T
): Promise<Awaited<T>> {
  const result = await fn();

  return result;
}

export const THEME_COLORS = {
  light: "#eeebd4",
  dark: "#111111",
} as const;

export type ThemeColor = keyof typeof THEME_COLORS;
