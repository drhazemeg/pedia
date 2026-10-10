import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { type Database, db, eq } from "@pedia/db";
import * as schema from "@pedia/db/schema/index";
import { APIError, betterAuth } from "better-auth";
import {
  admin as adminPlugin,
  customSession,
  magicLink,
  multiSession as multiSessionPlugin,
  openAPI as openAPIPlugin,
  organization,
  twoFactor,
  username as usernamePlugin,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { ac, roles } from "./permissions";
import {
  EMAIL_REGEX,
  getCachedRole,
  setCachedRole,
  sweepRoleCache,
} from "./utils";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    // emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    logger: {
      level: process.env.NODE_ENV === "production" ? "error" : "info",
      disabled: false,
    },
    user: {
      additionalFields: {
        role: {
          type: ["doctor", "staff", "patient", "admin"],
          required: false,
          input: false,
        },
        clinicId: {
          type: "string",
          required: false,
          input: false,
        },
        apiKey: { type: "string", required: false, input: false },
        address: { type: "string", required: false, input: true },
        phone: { type: "string", required: false, input: true },
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const result = await db
            .select({ role: schema.user.role })
            .from(schema.user)
            .where(eq(schema.user.id, user.id))
            .limit(1);
          const [fullUser] = result;

          if (fullUser?.role && fullUser.role.toLowerCase() === "doctor") {
            const patientCount = await db
              .select({ count: schema.patients.id })
              .from(schema.patients)
              .where(eq(schema.patients.userId, user.id))
              .limit(1);

            if (patientCount.length > 0) {
              throw new APIError("BAD_REQUEST", {
                message: "Doctor has active patients and cannot be deleted",
              });
            }
          }
        },
      },
      changeEmail: {
        enabled: true,
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            await Promise.resolve();
            const email = user.email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(email)) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid email format",
              });
            }
            return {
              data: {
                ...user,
                email,
                name: user.name.trim() || "Unnamed User",
                role: "patient",
                isAdmin: false,
              },
            };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github"],
      },
      encryptOAuthTokens: true,
    },
    telemetry: {
      enabled: false,
    },
    rateLimit: {
      storage: "database",
      modelName: "rateLimit",
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },

    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
      database: {
        joins: true,
        generateId: "uuid",
        defaultFindManyLimit: 50,
      },
      useSecureCookies: process.env.NODE_ENV === "production",
      cookiePrefix: "auth",
      crossSubDomainCookies: {
        enabled: true,
        domain:
          process.env.NODE_ENV === "production" ? ".clinic.com" : "localhost",
      },
    },
    plugins: [
      adminPlugin({
        adminRoles: ["admin"],
        defaultRole: "patient",
        ac,
        roles,
      }),
      multiSessionPlugin(),
      openAPIPlugin(),
      usernamePlugin(),
      twoFactor(),

      customSession(async ({ user, session }) => {
        sweepRoleCache();

        let dbUser = getCachedRole(user.id);

        if (!dbUser) {
          const result = await db
            .select({
              role: schema.user.role,
            })
            .from(schema.user)
            .where(eq(schema.user.id, user.id))
            .limit(1);

          const [row] = result;

          if (row?.role) {
            dbUser = {
              role: row.role,
              clinicId: null,
            };
            setCachedRole(user.id, dbUser.role, dbUser.clinicId);
          }
        }

        const role = dbUser?.role ?? "patient";

        return {
          user: {
            ...user,
            role,
            clinicId: dbUser?.clinicId ?? null,
          },
          session,
        };
      }),
      magicLink({
        sendMagicLink: ({ email, url }) => {
          console.warn({
            msg: "Magic link dispatched",
            email,
          });

          if (process.env.NODE_ENV !== "production") {
            console.warn({
              msg: "Dev-mode magic link available",
              urlLength: url.length,
            });
          }
        },
      }),
      organization({
        ac,
        roles,
        dynamicAccessControl: {
          enabled: true,
        },
      }),

      tanstackStartCookies(),
    ],
  });
}
const auth = createAuth(
  {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "",
  },
  db
);
export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
export { auth };
export type Role = "doctor" | "staff" | "patient" | "admin";
