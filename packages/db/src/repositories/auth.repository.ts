// packages/db/src/repositories/auth.repository.ts
//
// Persistence-only layer for auth entities. This file must NEVER import:
//   - better-auth
//   - otpauth
//   - bcryptjs / bcrypt / argon2
//   - any other crypto library
//
// Password hashing, TOTP generation/verification, password policy, and
// session-token generation live in the auth service layer (e.g.
// `@pedia/auth`). The repository's contract is: "give me rows, I'll
// give you rows."

import type { Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { escapeRegExp, queryCache } from "@pedia/db/cache";
import {
  account,
  session,
  twoFactor,
  user,
  verification,
} from "@pedia/db/schema";
import type {
  Account,
  NewAccount,
  NewSession,
  NewUser,
  NewVerification,
  Session,
  User,
  Verification,
} from "@pedia/db/schema/types";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, lte, ne, or, sql } from "drizzle-orm";

import type {
  FindAuditLogOptions,
  FindAuditLogResult,
} from "./auditLog.repository";
import { auditRepository } from "./auditLog.repository";
import { readCount } from "./base.repository";

// ============================================================
// Constants
// ============================================================

const AUTH_SESSION_PATTERN = /^auth:session:/;
const AUTH_VERIFICATION_PATTERN = /^auth:verification:/;
const AUTH_CACHE_PATTERN = /^auth:/;

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Cache helpers
// ============================================================

/**
 * Invalidate every cache entry that could contain user-scoped data.
 * Centralised so new user-write paths cannot forget a tag.
 */
function invalidateUserCaches(
  userId: string,
  email?: string,
  apiKey?: string | null
): void {
  queryCache.invalidate(`auth:user:${userId}`);
  if (email) queryCache.invalidate(`auth:user:email:${email.toLowerCase()}`);
  if (apiKey) queryCache.invalidate(`auth:user:apikey:${apiKey}`);

  queryCache.invalidateTag(`auth:user:${userId}:sessions`);
  queryCache.invalidateTag(`auth:user:${userId}:accounts`);
  queryCache.invalidateTag(`auth:user:${userId}:twofactor`);

  queryCache.invalidateTag("auth:users");
  queryCache.invalidateTag("auth:users:list");
  queryCache.invalidateTag("auth:users:count");
  queryCache.invalidateTag("auth:stats");
}

function invalidateSessionCaches(
  userId: string,
  sessionId?: string,
  token?: string
): void {
  if (sessionId) queryCache.invalidate(`auth:session:${sessionId}`);
  if (token) queryCache.invalidate(`auth:session:token:${token}`);
  queryCache.invalidateTag(`auth:user:${userId}:sessions`);
}

/**
 * Invalidate every `auth:session:${userId}:*` cache entry.
 *
 * Uses a literal prefix scan via `invalidatePrefix` (O(n) over cache keys
 * but avoids regex construction), plus a regex fallback for any key shape
 * that uses a different separator.
 */
function invalidateUserSessionPrefix(userId: string): void {
  queryCache.invalidatePrefix(`auth:session:${userId}:`);
  queryCache.invalidate(`auth:session:${userId}`);
  queryCache.invalidatePattern(
    new RegExp(`^auth:session:${escapeRegExp(userId)}(?::|$)`)
  );
}

function invalidateUserAccountPrefix(userId: string): void {
  queryCache.invalidatePrefix(`auth:account:${userId}:`);
  queryCache.invalidate(`auth:account:${userId}`);
  queryCache.invalidatePattern(
    new RegExp(`^auth:account:${escapeRegExp(userId)}(?::|$)`)
  );
}
// ============================================================
// Types
// ============================================================

type UserWithRelations = User & {
  sessions: Session[];
  accounts: Account[];
};

type SessionWithUser = Session & { user: User };
type AccountWithUser = Account & { user: User };

export type FindUserOptions = {
  includeAccounts?: boolean;
  includeSessions?: boolean;
  includeTwoFactor?: boolean;
};

export type SessionOptions = {
  limit?: number;
  offset?: number;
};

export type UserListOptions = {
  limit?: number;
  offset?: number;
  role?: User["role"];
  search?: string;
  status?: "active" | "inactive" | "suspended";
};

export type AuthStats = {
  totalUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  totalSessions: number;
  activeSessions: number;
  twoFactorEnabled: number;
  totalAccounts: number;
};

// ============================================================
// Repository
// ============================================================

export const authRepository = {
  // ============================================================
  // User Operations
  // ============================================================

  async findUserById(
    id: string,
    options: FindUserOptions = {}
  ): Promise<UserWithRelations | null> {
    const includeSessions = options.includeSessions ?? false;
    const includeAccounts = options.includeAccounts ?? false;
    const includeTwoFactor = options.includeTwoFactor ?? false;

    const withRelations =
      includeSessions || includeAccounts || includeTwoFactor;

    const cacheKey = withRelations
      ? `auth:user:${id}:${includeSessions ? "s" : ""}${includeAccounts ? "a" : ""}${includeTwoFactor ? "t" : ""}`
      : `auth:user:${id}`;

    const cached = queryCache.get<UserWithRelations>(cacheKey);
    if (cached) return cached;

    const result = await db.query.user.findFirst({
      where: { id },
      with: {
        sessions: includeSessions,
        accounts: includeAccounts,
        twoFactors: includeTwoFactor,
      },
    });

    if (result) {
      // `with: false` returns `false` for that relation, not an array.
      const sessions = Array.isArray(result.sessions) ? result.sessions : [];
      const accounts = Array.isArray(result.accounts) ? result.accounts : [];

      const userWithRelations: UserWithRelations = {
        ...result,
        sessions,
        accounts,
      };

      queryCache.set(cacheKey, userWithRelations, {
        ttl: CACHE_TTL,
        tags: [`auth:user:${id}`],
      });
      return userWithRelations;
    }

    return null;
  },

  async findUserByEmail(
    email: string,
    options: FindUserOptions = {}
  ): Promise<UserWithRelations | null> {
    const normalized = email.toLowerCase();
    const withRelations =
      (options.includeSessions ?? false) ||
      (options.includeAccounts ?? false) ||
      (options.includeTwoFactor ?? false);

    const cacheKey = withRelations
      ? `auth:user:email:${normalized}:${options.includeSessions ? "s" : ""}${options.includeAccounts ? "a" : ""}${options.includeTwoFactor ? "t" : ""}`
      : `auth:user:email:${normalized}`;

    const cached = queryCache.get<UserWithRelations>(cacheKey);
    if (cached) return cached;

    const result = await db.query.user.findFirst({
      where: { email: normalized },
      with: {
        sessions: options.includeSessions ?? false,
        accounts: options.includeAccounts ?? false,
        twoFactor: options.includeTwoFactor ?? false,
      },
    });

    if (result) {
      const userWithRelations: UserWithRelations = {
        ...result,
        sessions: (options.includeSessions ?? false) ? result.sessions : [],
        accounts: (options.includeAccounts ?? false) ? result.accounts : [],
      };
      queryCache.set(cacheKey, userWithRelations, {
        ttl: CACHE_TTL,
        tags: [`auth:user:${result.id}`],
      });
      return userWithRelations;
    }

    return null;
  },

  async findUserByApiKey(apiKey: string): Promise<User | null> {
    const cacheKey = `auth:user:apikey:${apiKey}`;
    const cached = queryCache.get<User>(cacheKey);
    if (cached) return cached;

    const result = await db.query.user.findFirst({ where: { apiKey } });

    if (result) {
      queryCache.set(cacheKey, result, {
        ttl: CACHE_TTL,
        tags: [`auth:user:${result.id}`],
      });
    }

    return result ?? null;
  },

  async findUsers(options: UserListOptions = {}): Promise<{
    data: User[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { limit = 50, offset = 0, search, role, status } = options;

    const cacheKey = `auth:users:list:${JSON.stringify(options)}`;
    const cached = queryCache.get<{
      data: User[];
      total: number;
      limit: number;
      offset: number;
    }>(cacheKey);
    if (cached) return cached;

    const conditions: SQL[] = [];

    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      const searchCondition = or(
        sql`${user.name} ILIKE ${pattern}`,
        sql`${user.email} ILIKE ${pattern}`
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (role) conditions.push(eq(user.role, role));

    if (status === "active") {
      conditions.push(eq(user.banned, false));
      conditions.push(eq(user.emailVerified, true));
    } else if (status === "inactive") {
      conditions.push(eq(user.emailVerified, false));
    } else if (status === "suspended") {
      conditions.push(eq(user.banned, true));
    }

    const where = conditions.length === 0 ? undefined : and(...conditions);

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(user.createdAt)),
      db.select({ count: count() }).from(user).where(where),
    ]);

    const result = {
      data: data as User[],
      total: readCount(totalResult),
      limit,
      offset,
    };

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: ["auth:users", "auth:users:list"],
    });

    return result;
  },

  async createUser(data: NewUser): Promise<User> {
    const created = await withTransaction(async (tx: Transaction) => {
      const [newUser] = await tx.insert(user).values(data).returning();
      if (!newUser) throw new Error("Failed to create user");
      return newUser;
    });

    invalidateUserCaches(created.id, created.email, created.apiKey);
    return created;
  },

  async createUserWithSession(
    userData: NewUser,
    sessionData: Omit<NewSession, "userId">
  ): Promise<{ user: User; session: Session }> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [newUser] = await tx.insert(user).values(userData).returning();
      if (!newUser) throw new Error("Failed to create user");

      const [newSession] = await tx
        .insert(session)
        .values({ ...sessionData, userId: newUser.id })
        .returning();
      if (!newSession) throw new Error("Failed to create session");

      return { user: newUser, session: newSession };
    });

    invalidateUserCaches(result.user.id, result.user.email, result.user.apiKey);
    invalidateSessionCaches(
      result.user.id,
      result.session.id,
      result.session.token
    );
    return result;
  },

  async updateUserPassword(
    userId: string,
    passwordHash: string
  ): Promise<User | null> {
    const existingUser = await this.findUserById(userId);
    if (!existingUser) return null;

    const updated = await this.setPasswordHash(userId, passwordHash);
    if (!updated) return null;

    return this.findUserById(userId);
  },

  async updateUser(
    id: string,
    data: Partial<NewUser> & {
      status?: "active" | "inactive" | "suspended";
      banReason?: string;
    }
  ): Promise<User | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const existing = await tx.query.user.findFirst({ where: { id } });
      if (!existing) return null;

      const { status, banReason, ...dbFields } = data;

      const updatePayload: Partial<NewUser> = {
        ...dbFields,
        updatedAt: new Date(),
      };
      if (status === "suspended") updatePayload.banned = true;
      if (status === "active") updatePayload.banned = false;
      if (banReason !== undefined) updatePayload.banReason = banReason;

      const [updatedUser] = await tx
        .update(user)
        .set(updatePayload)
        .where(eq(user.id, id))
        .returning();

      return updatedUser ? { previous: existing, current: updatedUser } : null;
    });

    if (!result) return null;

    // Invalidate BOTH the old and new identity keys.
    invalidateUserCaches(
      result.current.id,
      result.previous.email,
      result.previous.apiKey
    );
    if (result.current.email !== result.previous.email) {
      invalidateUserCaches(
        result.current.id,
        result.current.email,
        result.current.apiKey
      );
    } else if (result.current.apiKey !== result.previous.apiKey) {
      invalidateUserCaches(result.current.id, undefined, result.current.apiKey);
    }

    return result.current;
  },

  async verifyUserEmail(userId: string): Promise<User | null> {
    return this.updateUser(userId, { emailVerified: true });
  },

  async updateUserRole(
    userId: string,
    role: User["role"]
  ): Promise<User | null> {
    const updated = await this.updateUser(userId, { role });
    if (updated) {
      await this.deleteAllUserSessions(userId);
    }
    return updated;
  },

  async banUser(
    userId: string,
    reason: string,
    expires?: Date
  ): Promise<User | null> {
    return this.updateUser(userId, {
      banned: true,
      banReason: reason,
      banExpires: expires ?? null,
    });
  },

  async unbanUser(userId: string): Promise<User | null> {
    return this.updateUser(userId, {
      banned: false,
      banReason: "",
      banExpires: null,
    });
  },

  async suspendUser(userId: string, reason?: string): Promise<User | null> {
    return this.banUser(
      userId,
      reason ?? "User suspended by administrator",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
  },

  async activateUser(userId: string): Promise<User | null> {
    const existing = await db.query.user.findFirst({
      where: { id: userId },
    });
    if (!existing) return null;

    await this.unbanUser(userId);
    return this.verifyUserEmail(userId);
  },

  async countUsers(
    options: {
      role?: User["role"];
      banned?: boolean;
      emailVerified?: boolean;
    } = {}
  ): Promise<number> {
    const cacheKey = `auth:users:count:${JSON.stringify(options)}`;
    const cached = queryCache.get<number>(cacheKey);
    if (cached) return cached;

    const conditions: SQL[] = [];
    if (options.role) conditions.push(eq(user.role, options.role));
    if (options.banned !== undefined) {
      conditions.push(eq(user.banned, options.banned));
    }
    if (options.emailVerified !== undefined) {
      conditions.push(eq(user.emailVerified, options.emailVerified));
    }

    const where = conditions.length === 0 ? undefined : and(...conditions);

    const result = await db.select({ count: count() }).from(user).where(where);
    const value = readCount(result);

    queryCache.set(cacheKey, value, {
      ttl: CACHE_TTL,
      tags: ["auth:users:count"],
    });

    return value;
  },

  async deleteUser(id: string): Promise<boolean> {
    const existing = await withTransaction(async (tx: Transaction) => {
      const found = await tx.query.user.findFirst({ where: { id } });
      if (!found) return null;

      await tx.delete(user).where(eq(user.id, id));
      return found;
    });

    if (!existing) return false;

    invalidateUserCaches(id, existing.email, existing.apiKey);
    invalidateUserSessionPrefix(id);
    invalidateUserAccountPrefix(id);

    return true;
  },

  async bulkCreateUsers(usersData: NewUser[]): Promise<User[]> {
    if (usersData.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(user).values(usersData).returning()
    );

    queryCache.invalidateTag("auth:users");
    queryCache.invalidateTag("auth:users:count");
    queryCache.invalidateTag("auth:stats");

    return results;
  },

  async updateUserEmail(
    userId: string,
    newEmail: string
  ): Promise<User | null> {
    const normalized = newEmail.toLowerCase();

    const existingUser = await this.findUserById(userId);
    if (!existingUser) return null;

    const existingEmailUser = await this.findUserByEmail(normalized);
    if (existingEmailUser && existingEmailUser.id !== userId) {
      throw new Error("Email already in use");
    }

    const oldEmail = existingUser.email.toLowerCase();

    const updated = await this.updateUser(userId, {
      email: normalized,
      emailVerified: false,
    });

    if (updated) {
      queryCache.invalidate(`auth:user:email:${oldEmail}`);
    }

    return updated;
  },

  // ============================================================
  // Password persistence — NO hashing, NO verification
  // ============================================================

  /**
   * Read the credential account row for a user.
   *
   * The auth service pulls `password` off this row and verifies it against
   * the plaintext input using its own hasher. The repository never touches
   * the hash itself.
   */
  async findCredentialAccount(userId: string): Promise<Account | null> {
    const cacheKey = `auth:account:${userId}:credential`;
    const cached = queryCache.get<Account>(cacheKey);
    if (cached) return cached;

    const result = await db.query.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    if (!result) return null;

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: [`auth:user:${userId}:accounts`],
    });
    return result;
  },

  /**
   * Overwrite the stored password hash for a user's credential account.
   *
   * The caller is responsible for producing `passwordHash` with whatever
   * hasher the auth service uses. This method just persists it.
   */
  async setPasswordHash(
    userId: string,
    passwordHash: string
  ): Promise<boolean> {
    const rows = await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(
        and(eq(account.userId, userId), eq(account.providerId, "credential"))
      )
      .returning({ id: account.id });

    if (rows.length === 0) return false;

    queryCache.invalidate(`auth:account:${userId}:credential`);
    queryCache.invalidateTag(`auth:user:${userId}:accounts`);
    return true;
  },

  /**
   * Persist a password-reset token.
   *
   * The auth service generates the token and its expiry; the repository
   * just writes the verification row.
   */
  // #sym:createPasswordResetToken
  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<Verification> {
    const [created] = await db
      .insert(verification)
      .values({
        identifier: `password-reset:${userId}`,
        value: token,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!created) throw new Error("Failed to create password reset token");
    return created;
  },

  // ============================================================
  // Two-factor persistence — NO secret generation, NO TOTP verify
  // ============================================================

  /**
   * Persist a new 2FA configuration.
   *
   * The caller supplies `secret` (already generated by the auth service)
   * and `backupCodes` (already generated).
   */
  async generateTwoFactorSecret(
    userId: string,
    secret: string,
    backupCodes: string
  ): Promise<void> {
    await db.insert(twoFactor).values({ userId, secret, backupCodes });
    queryCache.invalidateTag(`auth:user:${userId}:twofactor`);
    queryCache.invalidateTag("auth:stats");
  },

  /** Remove a user's persisted two-factor configuration. */
  async disableTwoFactorAuth(userId: string): Promise<boolean> {
    const deleted = await db
      .delete(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .returning({ id: twoFactor.id });

    if (deleted.length > 0) {
      queryCache.invalidateTag(`auth:user:${userId}:twofactor`);
      queryCache.invalidateTag("auth:stats");
    }

    return deleted.length > 0;
  },

  /**
   * Check for a valid, unexpired two-factor token previously persisted by
   * the auth service. Cryptographic token verification belongs there.
   */
  async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    const now = new Date();
    const result = await db.query.verification.findFirst({
      where: { identifier: `two-factor:${userId}`, value: token },
    });

    return result !== undefined && result.expiresAt > now;
  },

  // ============================================================
  // Session Operations
  // ============================================================

  async findSessionById(id: string): Promise<SessionWithUser | null> {
    const cacheKey = `auth:session:${id}`;
    const cached = queryCache.get<SessionWithUser>(cacheKey);
    if (cached) return cached;

    const result = await db.query.session.findFirst({
      where: { id },
      with: { user: true },
    });

    if (!result?.user) return null;

    const sessionWithUser: SessionWithUser = {
      ...result,
      user: result.user,
    };

    queryCache.set(cacheKey, sessionWithUser, {
      ttl: CACHE_TTL,
      tags: [`auth:session:${id}`, `auth:user:${result.userId}:sessions`],
    });

    return sessionWithUser;
  },

  async findSessionByToken(token: string): Promise<SessionWithUser | null> {
    const cacheKey = `auth:session:token:${token}`;
    const cached = queryCache.get<SessionWithUser>(cacheKey);
    if (cached) return cached;

    const result = await db.query.session.findFirst({
      where: { token },
      with: { user: true },
    });

    if (!result?.user) return null;

    const sessionWithUser: SessionWithUser = {
      ...result,
      user: result.user,
    };

    queryCache.set(cacheKey, sessionWithUser, {
      ttl: CACHE_TTL,
      tags: [
        `auth:session:${result.id}`,
        `auth:user:${result.userId}:sessions`,
      ],
    });

    return sessionWithUser;
  },

  async findSessionsByUserId(
    userId: string,
    options: SessionOptions = {}
  ): Promise<Session[]> {
    const { limit = 50, offset = 0 } = options;

    const cacheKey = `auth:user:${userId}:sessions:${limit}:${offset}`;
    const cached = queryCache.get<Session[]>(cacheKey);
    if (cached) return cached;

    const result = await db.query.session.findMany({
      where: { userId },
      limit,
      offset,
      orderBy: { createdAt: "desc" },
    });

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [`auth:user:${userId}`, `auth:user:${userId}:sessions`],
    });

    return result;
  },

  async createSession(data: NewSession): Promise<Session> {
    const created = await withTransaction(async (tx: Transaction) => {
      const [newSession] = await tx.insert(session).values(data).returning();
      if (!newSession) throw new Error("Failed to create session");
      return newSession;
    });

    invalidateSessionCaches(created.userId, created.id, created.token);
    return created;
  },

  async updateSession(
    id: string,
    data: Partial<NewSession>
  ): Promise<Session | null> {
    const updated = await withTransaction(async (tx: Transaction) => {
      const [row] = await tx
        .update(session)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(session.id, id))
        .returning();
      return row ?? null;
    });

    if (updated) {
      invalidateSessionCaches(updated.userId, updated.id, updated.token);
    }

    return updated;
  },

  async deleteSession(id: string): Promise<boolean> {
    const existing = await withTransaction(async (tx: Transaction) => {
      const found = await tx.query.session.findFirst({ where: { id } });
      if (!found) return null;
      await tx.delete(session).where(eq(session.id, id));
      return found;
    });

    if (!existing) return false;

    invalidateSessionCaches(existing.userId, existing.id, existing.token);
    return true;
  },

  async logout(sessionId: string): Promise<boolean> {
    return this.deleteSession(sessionId);
  },

  async deleteAllUserSessions(userId: string): Promise<number> {
    const deletedRows = await withTransaction(async (tx: Transaction) =>
      tx
        .delete(session)
        .where(eq(session.userId, userId))
        .returning({ deletedId: session.id })
    );

    queryCache.invalidateTag(`auth:user:${userId}:sessions`);
    invalidateUserSessionPrefix(userId);

    return deletedRows.length;
  },

  /**
   * Delete every session whose `expiresAt` is in the past, **except** the
   * one the caller is currently using. The auth service passes the current
   * session id so a logout doesn't nuke the active session.
   */
  async deleteExpiredSessions(exceptSessionId?: string): Promise<number> {
    const now = new Date();

    const conditions = [lte(session.expiresAt, now)];
    if (exceptSessionId) {
      conditions.push(ne(session.id, exceptSessionId));
    }

    const deletedRows = await db
      .delete(session)
      .where(and(...conditions))
      .returning({ deletedId: session.id });

    queryCache.invalidatePattern(AUTH_SESSION_PATTERN);
    queryCache.invalidateTag("auth:session:cleanup");

    return deletedRows.length;
  },

  // ============================================================
  // Account Operations
  // ============================================================

  async findAccountByProvider(
    providerId: string,
    accountId: string
  ): Promise<AccountWithUser | null> {
    const cacheKey = `auth:account:${providerId}:${accountId}`;
    const cached = queryCache.get<AccountWithUser>(cacheKey);
    if (cached) return cached;

    const result = await db.query.account.findFirst({
      where: { providerId, accountId },
      with: { user: true },
    });

    if (!result?.user) return null;

    const accountWithUser: AccountWithUser = {
      ...result,
      user: result.user,
    };

    queryCache.set(cacheKey, accountWithUser, {
      ttl: CACHE_TTL,
      tags: [
        `auth:account:${result.id}`,
        `auth:user:${result.userId}:accounts`,
      ],
    });

    return accountWithUser;
  },

  async findAccountsByUserId(userId: string): Promise<Account[]> {
    const cacheKey = `auth:user:${userId}:accounts`;
    const cached = queryCache.get<Account[]>(cacheKey);
    if (cached) return cached;

    const result = await db.query.account.findMany({ where: { userId } });

    queryCache.set(cacheKey, result, {
      ttl: LIST_CACHE_TTL,
      tags: [`auth:user:${userId}`, `auth:user:${userId}:accounts`],
    });

    return result;
  },

  async createAccount(data: NewAccount): Promise<Account> {
    const created = await withTransaction(async (tx: Transaction) => {
      const [newAccount] = await tx.insert(account).values(data).returning();
      if (!newAccount) throw new Error("Failed to create account");
      return newAccount;
    });

    queryCache.invalidateTag(`auth:user:${created.userId}:accounts`);
    queryCache.invalidate(
      `auth:account:${created.providerId}:${created.accountId}`
    );

    return created;
  },

  async updateAccount(
    id: string,
    data: Partial<NewAccount>
  ): Promise<Account | null> {
    const updated = await withTransaction(async (tx: Transaction) => {
      const [row] = await tx
        .update(account)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(account.id, id))
        .returning();
      return row ?? null;
    });

    if (updated) {
      queryCache.invalidate(`auth:account:${id}`);
      queryCache.invalidate(
        `auth:account:${updated.providerId}:${updated.accountId}`
      );
      queryCache.invalidateTag(`auth:user:${updated.userId}:accounts`);
    }

    return updated;
  },

  async deleteAccount(id: string): Promise<boolean> {
    const existing = await withTransaction(async (tx: Transaction) => {
      const found = await tx.query.account.findFirst({ where: { id } });
      if (!found) return null;
      await tx.delete(account).where(eq(account.id, id));
      return found;
    });

    if (!existing) return false;

    queryCache.invalidate(`auth:account:${id}`);
    queryCache.invalidate(
      `auth:account:${existing.providerId}:${existing.accountId}`
    );
    queryCache.invalidateTag(`auth:user:${existing.userId}:accounts`);

    return true;
  },

  // ============================================================
  // Verification Operations
  // ============================================================

  async createVerification(data: NewVerification): Promise<Verification> {
    const [newVerification] = await db
      .insert(verification)
      .values(data)
      .returning();
    if (!newVerification) {
      throw new Error("Failed to create verification record");
    }
    return newVerification;
  },

  async findVerificationByIdentifier(
    identifier: string
  ): Promise<Verification | null> {
    const cacheKey = `auth:verification:${identifier}`;
    const cached = queryCache.get<Verification>(cacheKey);
    if (cached) return cached;

    const result = await db.query.verification.findFirst({
      where: { identifier },
    });

    if (result) {
      queryCache.set(cacheKey, result, {
        ttl: CACHE_TTL,
        tags: [`auth:verification:${identifier}`],
      });
    }

    return result ?? null;
  },
  async findVerificationByIdentifierPrefix(
    prefix: string,
    value: string
  ): Promise<Verification | null> {
    const result = await db.query.verification.findFirst({
      where: { identifier: { like: `${prefix}%` }, value },
    });
    return result ?? null;
  },

  async findPasswordResetToken(token: string): Promise<Verification | null> {
    return this.findVerificationByIdentifierPrefix("password-reset:", token);
  },
  async findVerificationByIdentifierAndValue(
    identifier: string,
    value: string
  ): Promise<Verification | null> {
    const cacheKey = `auth:verification:${identifier}:${value}`;
    const cached = queryCache.get<Verification>(cacheKey);
    if (cached) return cached;

    const result = await db.query.verification.findFirst({
      where: { identifier, value },
    });

    if (result) {
      queryCache.set(cacheKey, result, {
        ttl: CACHE_TTL,
        tags: [`auth:verification:${identifier}`],
      });
    }

    return result ?? null;
  },

  async deleteVerification(identifier: string): Promise<boolean> {
    const deletedRows = await db
      .delete(verification)
      .where(eq(verification.identifier, identifier))
      .returning({ deletedId: verification.id });

    queryCache.invalidatePattern(
      new RegExp(`^auth:verification:${escapeRegExp(identifier)}`)
    );

    return deletedRows.length > 0;
  },

  async deleteExpiredVerifications(): Promise<number> {
    const now = new Date();

    const deletedRows = await db
      .delete(verification)
      .where(lte(verification.expiresAt, now))
      .returning({ deletedId: verification.id });

    queryCache.invalidatePattern(AUTH_VERIFICATION_PATTERN);

    return deletedRows.length;
  },

  // ============================================================
  // Audit — delegate to the canonical implementation
  // ============================================================

  findAuditLogs(
    options: FindAuditLogOptions = {}
  ): Promise<FindAuditLogResult> {
    return auditRepository.findAuditLog(options);
  },

  // ============================================================
  // Stats
  // ============================================================

  /**
   * Single-pass aggregate.
   *
   * `twoFactorEnabled` counts rows in the `two_factor` table where
   * `verified = true`. The previous version referenced
   * `user.twoFactorEnabled`, which doesn't exist on the schema — the flag
   * lives on `two_factor.verified`.
   */
  async getAuthStats(): Promise<AuthStats> {
    const cacheKey = "auth:stats";
    const cached = queryCache.get<AuthStats>(cacheKey);
    if (cached) return cached;

    const now = new Date();

    const { rows } = await db.execute<{
      total_users: number;
      verified_users: number;
      banned_users: number;
      two_factor_enabled: number;
      total_sessions: number;
      active_sessions: number;
      total_accounts: number;
    }>(sql`
			SELECT
				(SELECT count(*)::int FROM ${user}) AS total_users,
				(SELECT count(*)::int FROM ${user} WHERE ${user.emailVerified} = true) AS verified_users,
				(SELECT count(*)::int FROM ${user} WHERE ${user.banned} = true) AS banned_users,
				(SELECT count(*)::int FROM ${twoFactor} WHERE ${twoFactor.verified} = true) AS two_factor_enabled,
				(SELECT count(*)::int FROM ${session}) AS total_sessions,
				(SELECT count(*)::int FROM ${session} WHERE ${session.expiresAt} >= ${now}) AS active_sessions,
				(SELECT count(*)::int FROM ${account}) AS total_accounts
		`);
    const [row] = rows;
    const result: AuthStats = {
      totalUsers: row?.total_users ?? 0,
      verifiedUsers: row?.verified_users ?? 0,
      bannedUsers: row?.banned_users ?? 0,
      twoFactorEnabled: row?.two_factor_enabled ?? 0,
      totalSessions: row?.total_sessions ?? 0,
      activeSessions: row?.active_sessions ?? 0,
      totalAccounts: row?.total_accounts ?? 0,
    };

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL,
      tags: ["auth:stats"],
    });

    return result;
  },

  // ============================================================
  // Cache
  // ============================================================

  clearCache(): void {
    queryCache.invalidatePattern(AUTH_CACHE_PATTERN);
  },
};

export type AuthRepository = typeof authRepository;
