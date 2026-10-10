// src/logger/client.ts
/**
 * Browser-safe structured logger.
 * Zero runtime deps on pino (which is Node-only) — sends logs to a
 * drain endpoint via fetch / sendBeacon, and mirrors to console in dev.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface ClientLoggerOptions {
  /** Extra static context (app version, env, etc.). */
  context?: LogFields;
  /** Endpoint that accepts batched JSON logs. */
  endpoint?: string;
  /** Flush interval in ms. */
  flushIntervalMs?: number;
  /** Minimum level to emit. Defaults to "info" in prod, "debug" in dev. */
  level?: LogLevel;
  /** Max batch size before forced flush. */
  maxBatchSize?: number;
  /** Called if the drain fails — useful for observability hooks. */
  onError?: (err: unknown) => void;
  /** Service name attached to every record. */
  service?: string;
}

interface LogRecord {
  level: LogLevel;
  msg: string;
  service?: string;
  time: number;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isBrowser = (): boolean =>
  typeof globalThis.window !== "undefined" && typeof document !== "undefined";

const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
};

export class ClientLogger {
  private buffer: LogRecord[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly level: LogLevel;
  private readonly endpoint: string | undefined;
  private readonly maxBatchSize: number;
  private readonly service: string | undefined;
  private readonly context: LogFields;
  private readonly onError: (err: unknown) => void;

  constructor(options: ClientLoggerOptions = {}) {
    this.endpoint = options.endpoint;
    this.level = options.level ?? (isDev() ? "debug" : "info");
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.service = options.service;
    this.context = options.context ?? {};

    // Fixed: Replaced empty function with explicit fallback error capture
    this.onError =
      options.onError ??
      ((err) => {
        console.error("[ClientLogger] Failed to drain logs:", err);
      });

    const interval = options.flushIntervalMs ?? 5000;
    if (this.endpoint && isBrowser() && interval > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, interval);

      // Flush on tab hide / unload (best effort).
      globalThis.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.flush(true);
      });
      window.addEventListener("pagehide", () => void this.flush(true));
    }
  }

  debug(msg: string, fields?: LogFields): void {
    this.write("debug", msg, fields);
  }
  info(msg: string, fields?: LogFields): void {
    this.write("info", msg, fields);
  }
  warn(msg: string, fields?: LogFields): void {
    this.write("warn", msg, fields);
  }
  error(msg: string, error?: Error, fields?: LogFields): void {
    const err = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;
    this.write("error", msg, { ...fields, err });
  }

  child(bindings: LogFields): ClientLogger {
    const child = new ClientLogger({
      endpoint: this.endpoint,
      level: this.level,
      maxBatchSize: this.maxBatchSize,
      service: this.service,
      context: { ...this.context, ...bindings },
      onError: this.onError,
      flushIntervalMs: 0, // share parent's timer
    });

    const explicitChild = child;
    explicitChild.buffer = this.buffer;
    explicitChild.timer = this.timer;

    return child;
  }

  private write(level: LogLevel, msg: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;

    const record: LogRecord = {
      level,
      time: Date.now(),
      ...(this.service ? { service: this.service } : {}),
      ...this.context,
      ...fields,
      msg,
    };

    if (isDev()) {
      const method =
        level === "debug"
          ? "debug"
          : level === "info"
            ? "info"
            : level === "warn"
              ? "warn"
              : "error";

      console[method](`[${record.service ?? "app"}] ${msg}`, fields ?? "");
    }

    if (!this.endpoint) return;

    this.buffer.push(record);
    if (this.buffer.length >= this.maxBatchSize) void this.flush();
  }

  async flush(useBeacon = false): Promise<void> {
    if (!this.endpoint || this.buffer.length === 0) return;

    const batch = this.buffer;
    this.buffer = [];
    const payload = JSON.stringify({ logs: batch });

    try {
      if (
        useBeacon &&
        isBrowser() &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([payload], { type: "application/json" });
        // sendBeacon returns boolean; ignore — best effort only.
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }

      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      });
      if (!res.ok) {
        throw new Error(`Log drain failed: ${res.status}`);
      }
    } catch (err) {
      this.onError(err);
      // Put the batch back so we don't lose logs on transient failure.
      // Guard against unbounded growth.
      if (this.buffer.length < this.maxBatchSize * 4) {
        this.buffer.unshift(...batch);
      }
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.buffer = [];
  }
}

export const createClientLogger = (opts?: ClientLoggerOptions): ClientLogger =>
  new ClientLogger(opts);
