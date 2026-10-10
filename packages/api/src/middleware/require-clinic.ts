// packages/api/src/middleware/require-clinic.ts

// oxlint-disable require-await -- oRPC middleware are declared async by contract.
import { ORPCError } from "@orpc/server";

import { o } from "../rpc";
import { requireAuth } from "./require-auth";

/**
 * Guarantees `context.clinicId` is present, throwing `FORBIDDEN` otherwise.
 *
 * Why this is its own middleware rather than a helper: the clinic id is a
 * *precondition* for almost every domain operation, so making it part of
 * the procedure chain means handlers can destructure `context.clinicId`
 * without a guard clause. The `getClinicId` helper stays for the handful
 * of call sites that read the id outside a middleware chain (e.g. inside
 * `.handler` bodies that also accept an explicit `clinicId` input).
 *
 * The check is positive: "do we have a clinic id?" rather than "is it
 * missing?" — it fails closed if the context shape ever changes.
 */
export const requireClinic = o.middleware(async ({ context, next }) => {
  if (!context.clinicId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Clinic membership required",
    });
  }

  return next({
    context: {
      clinicId: context.clinicId,
    },
  });
});

/**
 * Convenience composer: authenticated *and* clinic-scoped.
 *
 * Most staff-facing procedures need both, so exposing the pair avoids
 * importing two middleware modules at every call site.
 */
export const requireAuthAndClinic = o.use(requireAuth).use(requireClinic);
