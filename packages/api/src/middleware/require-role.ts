// packages/api/src/middleware/require-role.ts

// oxlint-disable require-await -- oRPC middleware are declared async by contract.
import { ORPCError } from "@orpc/server";
import type { Role } from "@pedia/db/schema/enums";

import { o } from "../rpc";

/**
 * Builds a middleware that admits only the listed roles.
 *
 * Why a factory instead of three hand-written guards: the previous
 * `adminProcedure` / `doctorProcedure` / `staffProcedure` each repeated the
 * same `session?.user?.role !== …` check with slightly different shapes.
 * A single factory makes the role sets explicit at the call site and
 * guarantees identical error codes/messages for every guard.
 *
 * The allowed set is captured once at factory time (not per-request), so
 * the runtime check is a single `Set.has` lookup — cheap enough to sit in
 * front of every handler.
 */
export const requireRole = (...roles: Role[]) =>
  o.middleware(async ({ context, next }) => {
    const role = context.session?.user?.role;

    if (!role || !roles.includes(role as Role)) {
      throw new ORPCError("FORBIDDEN", {
        message: `Requires one of: ${roles.join(", ")}`,
      });
    }

    return next();
  });

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built guards used by the router layer
// ─────────────────────────────────────────────────────────────────────────────

/** Admits `admin` only. */
export const requireAdmin = requireRole("admin");

/** Admits `admin` or `doctor`. */
export const requireDoctor = requireRole("admin", "doctor");

/** Admits `admin`, `doctor`, or `staff`. */
export const requireStaff = requireRole("admin", "doctor", "staff");

/** The full set of authenticated roles — useful for audit endpoints. */
export const STAFF_ROLES = [
  "admin",
  "doctor",
  "staff",
] as const satisfies readonly Role[];
