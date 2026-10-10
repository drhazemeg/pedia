// packages/api/src/middleware/with-error-handler.ts

import { ORPCError } from "@orpc/server";
import { logger } from "@pedia/shared/logger/server";

/**
 * Wraps a router handler so that every thrown error is either re-thrown
 * untouched (when it is already an `ORPCError`) or converted into a clean
 * `INTERNAL_SERVER_ERROR` with the original error attached as `cause`.
 *
 * Why this exists: ~30 router files repeat the same try/catch + ORPCError
 * boilerplate. Centralising it here means:
 *   - The log shape is identical across every operation (easier to query).
 *   - The original error is always preserved as `cause` for debugging.
 *   - Handlers can be written as if they only ever throw `ORPCError`, so
 *     "domain" failures (NOT_FOUND, FORBIDDEN, …) read as first-class
 *     control flow instead of being buried inside a catch block.
 *
 * The wrapper is deliberately name-agnostic: `name` is only used for the
 * log message and the fallback error message, so callers can pass the
 * operation's dotted path (e.g. `"appointment.getById"`) without any
 * coupling to the router's structure.
 *
 * The generic parameter is the *entire* argument object oRPC passes to a
 * handler (`{ input, context, path, … }`), not just `input`. That lets
 * handlers destructure whichever pieces they need — most need `context`
 * for clinic-scoping — without an extra closure layer at each call site.
 */
export function withErrorHandler<TArgs, TOutput>(
  name: string,
  fn: (args: TArgs) => Promise<TOutput>
): (args: TArgs) => Promise<TOutput> {
  return async (args: TArgs): Promise<TOutput> => {
    try {
      return await fn(args);
    } catch (error) {
      // Domain errors already carry the right code + message. Re-throw
      // them untouched so callers see NOT_FOUND / FORBIDDEN / etc.
      if (error instanceof ORPCError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Unknown error";

      logger.error({
        msg: `${name} failed`,
        operation: name,
        error: message,
        cause: error,
      });

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `${name} failed: ${message}`,
        cause: error,
      });
    }
  };
}
