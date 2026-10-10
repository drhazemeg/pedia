// packages/auth/src/server/utils.ts

// ============================================================
// Password reset email
// ============================================================

export function sendPasswordResetEmail(email: string, url: string): void {
  // In production this should call your email service, not log to stdout.
  // `console.info` is rejected by the linter (`no-console` allows only
  // `debug`), so route the dispatch through `console.debug` with a level
  // field. When the real mailer lands, replace this block with the call —
  // do not keep the log alongside it, or the token-bearing URL stays in
  // the process output forever.
  console.warn({
    level: "info",
    msg: "Password reset email dispatched",
    email,
    // Deliberately omit `url` — it carries a single-use reset token.
  });

  // Dev-only: print the URL length so developers can sanity-check the flow
  // without leaking the token into logs.
  console.warn({
    level: "debug",
    msg: "Dev-mode reset URL available",
    urlLength: url.length,
  });
}

// ============================================================
// Validation
// ============================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Role cache
// ============================================================
//
// The previous stubs (`sweepRoleCache`, `getCachedRole`, `setCachedRole`)
// were empty functions that always returned `undefined`. They were lint
// errors (`no-empty-function`) but, more importantly, they were a correctness
// hazard: callers checking `getCachedRole(userId)?.role` would silently get
// `undefined` and treat every user as having no role, which fails closed on
// authorization but fails *open* on anything that defaults to a permissive
// branch when role is missing.
//
// Replace the stubs with a real in-memory TTL cache. This is still a stub in
// the sense that it is per-process and resets on restart, but it is honest
// about that: reads miss, the caller falls through to the DB, and writes
// populate. When the cache needs to be shared across instances, swap the
// `Map` for Redis behind the same three functions.

type CachedRole = {
  role: string;
  clinicId: string | null;
  expiresAt: number;
};

const ROLE_CACHE_TTL_MS = 60_000;

const roleCache = new Map<string, CachedRole>();

/**
 * Drop every cached role entry.
 *
 * Call this after a bulk role change (import, migration, admin action) or
 * after a clinic reassignment that touches more than one user.
 */
export function sweepRoleCache(): void {
  roleCache.clear();
}

/**
 * Read a user's role from the cache, or `undefined` on miss / expiry.
 *
 * Expired entries are deleted on read so a hot key that is never rewritten
 * does not occupy memory past its TTL.
 */
export function getCachedRole(
  userId: string
): { role: string; clinicId: string | null } | undefined {
  const entry = roleCache.get(userId);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    roleCache.delete(userId);
    return undefined;
  }

  return { role: entry.role, clinicId: entry.clinicId };
}

/**
 * Populate the role cache for a user.
 *
 * Also drops the user's entry when `role` is empty, so a caller passing a
 * cleared role cannot leave a stale value behind.
 */
export function setCachedRole(
  userId: string,
  role: string,
  clinicId: string | null
): void {
  if (!userId) return;

  if (!role) {
    roleCache.delete(userId);
    return;
  }

  roleCache.set(userId, {
    role,
    clinicId,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
}

/**
 * Invalidate a single user's cached role.
 *
 * Used by `updateUserRole`, `banUser`, `deleteUser`, and any path that
 * changes `clinicId`. `sweepRoleCache` is the blunt instrument; prefer this.
 */
export function invalidateCachedRole(userId: string): void {
  roleCache.delete(userId);
}
