import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "@pedia/api/routers/index";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { auth } from "./services";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    origin: ENV.CORS_ORIGIN,
  })
);

// ── FIX 1 (require-await): auth.handler returns a Promise<Response>; Hono
// does NOT need an `async` wrapper for that. Return it directly. Hono
// accepts plain values, Promises, and Responses from handlers alike.
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  // ── FIX 2 (prefer-await-to-callbacks): `onError` is NOT the callback it
  // thinks it is. It's oRPC's middleware-style interceptor factory, which
  // REQUIRES a callback argument. The rule can't tell the difference.
  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  // ── FIX 3 (prefer-await-to-callbacks): same as above.
  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context,
    prefix: "/rpc",
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    context,
    prefix: "/api-reference",
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  // ── FIX 4 (callback-return): Hono's `next` is NOT a Node-style
  // continuation callback. It returns a Promise that must be awaited
  // (or returned) so Hono can chain middlewares correctly. Returning
  // it is the idiomatic Hono pattern and satisfies the rule.
  return next();
});

app.get("/", (c) => c.text("OK"));

export default app;
