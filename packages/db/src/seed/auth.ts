// packages/db/src/seed/auth.ts
//
// Seeds the synthetic user pool consumed by later phases.
//
// This file must NOT import from `@pedia/auth` or any crypto library.
// The DB package's contract is "write rows"; credentials, password
// hashes, session tokens, and `account` rows are the auth domain's
// responsibility. A caller who needs login-capable users should compose
// this seeder with an auth-domain seeder.
//
// The pool contains four roles, sized to match what the clinic phases
// downstream actually need:
//
//   - 1 admin  — the actor for audit logs and any "createdBy" FK.
//   - 15 doctors — the pool `seedStaffAndDoctors` slices to build
//                  `staff` + `doctors` rows.
//   - 4 staff — front-desk / nursing users for the non-doctor staff pool.

import { faker } from "@faker-js/faker";

import { db } from "..";
import { user } from "../schema";
import { seedLogger } from "./helper";

// ─────────────────────────────────────────────────────────────
// Pool sizing
// ─────────────────────────────────────────────────────────────

export const USER_POOL = {
  admins: 1,
  doctors: 15,
  staff: 4,
  patients: 30,
} as const;

export type UserPoolCounts = typeof USER_POOL;

// ─────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────

type UserInsert = typeof user.$inferInsert;

interface UserFixtureInput {
  role: NonNullable<UserInsert["role"]>;
  emailDomain: string;
}

/**
 * Build one user row. The `id` is a real uuid so downstream FKs
 * (`patients.userId`, `staff.userId`, `audit_log.actorId`) can reference
 * it without a second round-trip.
 */
function buildUser({ role, emailDomain }: UserFixtureInput): UserInsert {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const slug = faker.helpers.slugify(`${firstName}.${lastName}`).toLowerCase();
  // Suffix keeps the pool collision-free even when faker repeats a name.
  const suffix = faker.string.alphanumeric(6).toLowerCase();
  const name = `${firstName} ${lastName}`;

  return {
    id: faker.string.uuid(),
    name,
    email: `${slug}.${suffix}@${emailDomain}`.toLowerCase(),
    emailVerified: true,
    role,
    banned: false,
    displayUsername: name,
    createdAt: new Date(),
  };
}

function buildPool(): {
  admins: UserInsert[];
  doctors: UserInsert[];
  staff: UserInsert[];
  patients: UserInsert[];
} {
  const emailDomain = "sunrise-seed.test";

  return {
    admins: Array.from({ length: USER_POOL.admins }, () =>
      buildUser({ role: "admin", emailDomain })
    ),
    doctors: Array.from({ length: USER_POOL.doctors }, () =>
      buildUser({ role: "doctor", emailDomain })
    ),
    staff: Array.from({ length: USER_POOL.staff }, () =>
      buildUser({ role: "staff", emailDomain })
    ),
    patients: Array.from({ length: USER_POOL.patients }, () =>
      buildUser({ role: "patient", emailDomain })
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// Seeder
// ─────────────────────────────────────────────────────────────

export interface SeedAuthOptions {
  /**
   * An already-created admin user. When provided, the seeder skips
   * creating a new admin and returns this row as `adminUser`.
   *
   * The caller is responsible for ensuring `admin` is actually in the
   * database — this seeder does not verify.
   */
  admin?: typeof user.$inferSelect;
}

export interface SeedAuthResult {
  adminUser: typeof user.$inferSelect;
  users: Array<typeof user.$inferSelect>;
  /** Users partitioned by role, for callers that want to slice directly. */
  byRole: {
    admins: Array<typeof user.$inferSelect>;
    doctors: Array<typeof user.$inferSelect>;
    staff: Array<typeof user.$inferSelect>;
    patients: Array<typeof user.$inferSelect>;
  };
}

export async function seedAuth(
  options: SeedAuthOptions = {}
): Promise<SeedAuthResult> {
  const logger = seedLogger("seed_auth");

  const pool = buildPool();
  const { admin: providedAdmin } = options;

  // ─── Admin ──────────────────────────────────────────────────
  //
  // If the caller supplied an admin (typically the real bootstrap admin
  // created by `admin.ts` / `fresh.ts`), use it and do NOT insert a
  // duplicate. Otherwise, insert the synthetic admin from the pool.
  let adminUser: typeof user.$inferSelect;

  if (providedAdmin) {
    adminUser = providedAdmin;
  } else {
    const [insertedAdmin] = await db
      .insert(user)
      .values(pool.admins)
      .returning();
    if (!insertedAdmin) {
      throw new Error("seedAuth: failed to insert synthetic admin");
    }
    adminUser = insertedAdmin;
  }

  // ─── Doctors / staff / patients ─────────────────────────────
  const inserted = await db
    .insert(user)
    .values([...pool.doctors, ...pool.staff, ...pool.patients])
    .returning();

  // The insert returns rows in the same order as the input array, so we
  // can slice by the known pool sizes instead of re-querying by email.
  const doctorCount = pool.doctors.length;
  const staffCount = pool.staff.length;

  const doctors = inserted.slice(0, doctorCount);
  const staff = inserted.slice(doctorCount, doctorCount + staffCount);
  const patients = inserted.slice(doctorCount + staffCount);

  logger.set({
    event: "seed_auth_ok",
    counts: {
      admins: 1,
      doctors: doctors.length,
      staff: staff.length,
      patients: patients.length,
    },
  });
  logger.emit();

  return {
    adminUser,
    users: inserted,
    byRole: {
      admins: [adminUser],
      doctors,
      staff,
      patients,
    },
  };
}
