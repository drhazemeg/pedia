// src/db/cache.ts

interface CacheEntry<T> {
  data: T;
  staleUntil?: number;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  staleWhileRevalidate?: number;
  tags?: string[];
  ttl: number;
}

/**
 * Escape a string so it can be safely interpolated into a `RegExp(...)`
 * source. Used by repositories that build patterns like
 * `new RegExp(`^appointment:patient:${id}:`)` from an ID that may contain
 * regex metacharacters.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_MAX_CACHE_SIZE = 10_000;
/** Fraction of the cache to drop when the size cap is exceeded. */
const OVERFLOW_DROP_RATIO = 0.2;

export class QueryCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly tagMap = new Map<string, Set<string>>();
  private readonly defaultTTL = 60_000;
  private readonly maxSize: number;

  // TTL by entity type. Declared as `Record<string, number>` so arbitrary
  // entity names can be looked up without a narrowing cast — the fallback
  // below covers any key not present here.
  private readonly ttlConfig: Record<string, number> = {
    patient: 30_000, // 30 seconds
    appointment: 15_000, // 15 seconds
    clinic: 60_000, // 60 seconds
    static: 300_000, // 5 minutes
  };

  constructor(maxSize = DEFAULT_MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  getTTL(entityType: string): number {
    return this.ttlConfig[entityType] ?? this.defaultTTL;
  }

  invalidatePrefix(prefix: string): void {
    // Snapshot the keys: we mutate `this.cache` inside the loop.
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        // Unregister from tagMap BEFORE deleting so the Set doesn't
        // keep a dangling reference to a key that no longer exists in
        // `cache`. Without this, `tagMap` leaks keys forever.
        this.removeFromTags(key);
        this.cache.delete(key);
      }
    }
  }

  /**
   * The cache is heterogeneous — a single `queryCache` instance holds
   * values of many different shapes under one key space. Callers promise
   * "I cached a T under this key"; there is no way to verify that at the
   * type level without parameterizing the whole cache per-instantiation.
   * The generic here is the API contract, not an accident.
   */

  get<T>(key: string): T | null {
    this.sweepIfOversized();

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();

    // Fresh data
    if (now - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    // Stale but still available for revalidation
    if (entry.staleUntil && now - entry.timestamp < entry.staleUntil) {
      // Trigger background revalidation (handled by caller)
      return entry.data;
    }

    // Expired
    this.cache.delete(key);
    this.removeFromTags(key);
    return null;
  }

  set<T>(key: string, data: T, options: Partial<CacheOptions> = {}): void {
    this.sweepIfOversized();

    const ttl = options.ttl ?? this.defaultTTL;
    const staleWhileRevalidate = options.staleWhileRevalidate ?? ttl * 0.5;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      staleUntil: Date.now() + ttl + staleWhileRevalidate,
    };

    this.cache.set(key, entry);

    // Index by tags
    if (options.tags) {
      for (const tag of options.tags) {
        let keys = this.tagMap.get(tag);
        if (!keys) {
          keys = new Set();
          this.tagMap.set(tag, keys);
        }
        keys.add(key);
      }
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.removeFromTags(key);
  }

  invalidateTag(tag: string): void {
    const keys = this.tagMap.get(tag);
    if (!keys) return;
    // Snapshot: `removeFromTags` may mutate `tagMap` while we iterate.
    for (const key of Array.from(keys)) {
      this.cache.delete(key);
    }
    this.tagMap.delete(tag);
  }

  invalidatePattern(pattern: RegExp): void {
    // Snapshot: we mutate `this.cache` inside the loop.
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        this.removeFromTags(key);
      }
    }
  }

  private removeFromTags(key: string): void {
    for (const [tag, keys] of this.tagMap) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tagMap.delete(tag);
      }
    }
  }

  /**
   * Two-pass eviction. Runs lazily on every `get` / `set` so we never
   * need a `setInterval`, and a short-lived process can't leak a timer.
   *
   *  Pass 1: drop everything past its `staleUntil` window.
   *  Pass 2: if we're STILL over `maxSize`, drop the oldest 20% by
   *          timestamp so a sustained write burst can't balloon the map.
   */
  private sweepIfOversized(): void {
    if (this.cache.size <= this.maxSize) return;

    const now = Date.now();

    // Pass 1: remove anything that has fully expired.
    for (const [key, entry] of this.cache) {
      const staleUntil = entry.staleUntil ?? entry.ttl;
      if (now - entry.timestamp > staleUntil) {
        this.cache.delete(key);
        this.removeFromTags(key);
      }
    }

    if (this.cache.size <= this.maxSize) return;

    // Pass 2: still over the cap — drop the oldest 20% by insertion
    // timestamp. Sorting is O(n log n) but only runs on overflow, which
    // is rare by construction (the cap is 10k).
    const entries = Array.from(this.cache.entries()).toSorted(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    const dropCount = Math.max(
      1,
      Math.floor(entries.length * OVERFLOW_DROP_RATIO)
    );
    for (let i = 0; i < dropCount; i += 1) {
      const entry = entries[i];
      if (!entry) continue;
      this.cache.delete(entry[0]);
      this.removeFromTags(entry[0]);
    }
  }

  clear(): void {
    this.cache.clear();
    this.tagMap.clear();
  }

  getStats(): { size: number; tagCount: number } {
    return {
      size: this.cache.size,
      tagCount: this.tagMap.size,
    };
  }
}

export const queryCache = new QueryCache();

// ============================================================
// Prepared Statement Cache
// ============================================================

export class PreparedQueryCache {
  private readonly prepared = new Map<string, unknown>();

  /**
   * See `QueryCache.get` doc comment — same caller-asserts-the-type
   * contract. The generic is the API, not an accident.
   */

  get<T>(key: string): T | undefined {
    return this.prepared.get(key) as T | undefined;
  }

  set<T>(key: string, query: T): void {
    this.prepared.set(key, query);
  }

  has(key: string): boolean {
    return this.prepared.has(key);
  }

  clear(): void {
    this.prepared.clear();
  }
}

export const preparedQueries = new PreparedQueryCache();
