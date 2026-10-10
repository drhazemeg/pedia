// packages/api/src/index.ts

// oxlint-disable require-await -- oRPC middleware are declared async by contract.
import { ORPCError } from "@orpc/server";

import type { Context } from "./context";
import {
  requireAdmin,
  requireAuth,
  requireDoctor,
  requireStaff,
} from "./middleware";
import { o } from "./rpc";

export const publicProcedure = o;

/**
 * Re-export the oRPC instance so callers can build their own procedures
 * without importing from `./rpc` directly.
 */
export { o };

export const protectedProcedure = publicProcedure.use(requireAuth);

export class ClinicRequiredError extends ORPCError<"FORBIDDEN", unknown> {
  constructor() {
    super("FORBIDDEN", {
      message: "Clinic membership required",
    });
    this.name = "ClinicRequiredError";
  }
}

export function getClinicId(context: Context): string {
  if (!context.clinicId) throw new ClinicRequiredError();
  return context.clinicId;
}

/**
 * Admin procedure — requires the `admin` role.
 *
 * Built on the generic `requireRole` factory so the role set lives in one
 * place (`middleware/require-role.ts`) rather than being spelled out again
 * here.
 */
export const adminProcedure = protectedProcedure.use(requireAdmin);

/**
 * Doctor procedure — requires `admin` or `doctor`.
 */
export const doctorProcedure = protectedProcedure.use(requireDoctor);

/**
 * Staff procedure — requires `admin`, `doctor`, or `staff`.
 */
export const staffProcedure = protectedProcedure.use(requireStaff);

// ─────────────────────────────────────────────────────────────────────────────
// Re-export the middleware primitives
// ─────────────────────────────────────────────────────────────────────────────
//
// Routers historically imported everything from `../index`. Keeping the
// middleware surface re-exported here means the migration to `./middleware/*`
// is transparent to existing call sites, and new routers can import either
// path.

export {
  requireAdmin,
  requireAuth,
  requireAuthAndClinic,
  requireClinic,
  requireDoctor,
  requireRole,
  requireStaff,
  STAFF_ROLES,
  withErrorHandler,
} from "./middleware";
