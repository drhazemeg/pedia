// packages/api/src/middleware/require-auth.ts

// oxlint-disable require-await -- oRPC middleware are declared async by contract.
import { ORPCError } from "@orpc/server";

import { o } from "../rpc";

/**
 * Rejects the request unless a session with a user is present.
 *
 * Extracted from `index.ts` so the auth gate lives next to the other
 * middleware primitives. The narrowed context type (`session` is non-null)
 * is what lets downstream procedures read `context.session.user` without
 * a non-null assertion.
 */
export const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});
