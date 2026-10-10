// packages/api/src/rpc.ts

import { os } from "@orpc/server";

import type { Context } from "./context";

/**
 * The oRPC instance — exported here to avoid circular dependencies.
 *
 * Middleware modules need this instance, but the main index file also
 * imports from middleware. By centralizing the instance here, both can
 * import it without forming a cycle.
 */
export const o = os.$context<Context>();
