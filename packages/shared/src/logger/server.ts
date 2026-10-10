// packages/shared/src/logger/server.ts

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { Bindings, Level, Logger, LoggerOptions } from "pino";
import pino from "pino";

// =============================================================================
// Types
// =============================================================================

export type LogFields = Record<string, unknown>;

export interface StructuredLogger {
  debug: (message: string, fields?: LogFields) => void;
  error: (message: string, error?: Error, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
}

export interface TraceContext {
  requestId: string;
  traceId: string;
  userId?: string;
}

export interface CreateLoggerOptions {
  level?: Level;
  name: string;
  /** Pretty-print in dev. In prod, JSON lines (default). */
  pretty?: boolean;
  /** Extra redact paths appended to defaults. */
  redactPaths?: string[];
}

// =============================================================================
// Error → Log Level Mapping
// =============================================================================

export function getErrorLogLevel(
  error: unknown
): "debug" | "info" | "warn" | "error" {
  if (error instanceof Error) {
    switch (error.cause) {
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return "warn";
      case "BAD_REQUEST":
      case "NOT_FOUND":
      case "CONFLICT":
        return "info";
      default:
        break;
    }

    if (error.name === "ValidationError") return "warn";
    if (
      error.name === "DatabaseError" ||
      error.name === "PrismaClientKnownRequestError"
    ) {
      return "error";
    }
  }
  return "error";
}

// =============================================================================
// Structured Logger Facade
// =============================================================================

export function createStructuredLogger(logger: Logger): StructuredLogger {
  return {
    info: (message, fields) => logger.info({ ...fields, msg: message }),
    error: (message, error, fields) =>
      logger.error({ ...fields, err: error, msg: message }),
    warn: (message, fields) => logger.warn({ ...fields, msg: message }),
    debug: (message, fields) => logger.debug({ ...fields, msg: message }),
  };
}

// =============================================================================
// Performance Logging
// =============================================================================

export function logPerformance(
  logger: Logger,
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void {
  const durationMs = performance.now() - startTime;
  logger.info({ event: "performance", operation, durationMs, ...metadata });
  if (durationMs > 1000) {
    logger.warn({
      event: "slow_operation",
      operation,
      durationMs,
      ...metadata,
    });
  }
}

// =============================================================================
// Sensitive Data Redaction (manual, for non-pino paths)
// =============================================================================

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /secret/i,
  /credit[_-]?card/i,
  /\bssn\b/i,
  /email/i,
  /phone/i,
  /address/i,
];

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));

export function redactSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 8 || typeof data !== "object" || data === null) return data;
  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key)
      ? "[REDACTED]"
      : redactSensitiveData(value, depth + 1);
  }
  return result;
}

// =============================================================================
// Logger Factory
// =============================================================================

const DEFAULT_REDACT = [
  "password",
  "token",
  "authorization",
  "api_key",
  "secret",
  "*.email",
  "*.phone",
  "*.password",
  "*.token",
  "headers.authorization",
];

const requireCjs = createRequire(import.meta.url);

type PrettyFactory = (
  options?: Record<string, unknown>
) => NodeJS.WritableStream;

export function createLogger(
  nameOrOpts: string | CreateLoggerOptions,
  level: Level = "info"
): Logger {
  const opts: CreateLoggerOptions =
    typeof nameOrOpts === "string" ? { name: nameOrOpts, level } : nameOrOpts;

  const usePretty = opts.pretty ?? process.env.NODE_ENV !== "production";

  const base: LoggerOptions = {
    name: opts.name,
    level: opts.level ?? "info",
    redact: {
      paths: [...DEFAULT_REDACT, ...(opts.redactPaths ?? [])],
      censor: "[REDACTED]",
    },
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
      bindings: (bindings: Bindings) => {
        const safe = bindings as Record<string, unknown>;
        return {
          pid: typeof safe.pid === "number" ? safe.pid : undefined,
          host: typeof safe.hostname === "string" ? safe.hostname : undefined,
          env: process.env.NODE_ENV,
          service: opts.name,
        };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (usePretty) {
    try {
      const prettyModule = requireCjs("pino-pretty") as
        | { default?: PrettyFactory }
        | PrettyFactory;

      const prettyFactory =
        typeof prettyModule === "function"
          ? prettyModule
          : prettyModule.default;

      if (typeof prettyFactory === "function") {
        return pino(
          base,
          prettyFactory({
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          })
        );
      }
    } catch {
      // pino-pretty not installed — fall through to JSON.
    }
  }

  return pino(base);
}

// =============================================================================
// Logger Manager (singleton with per-name log levels)
// =============================================================================

export class LoggerManager {
  private static instance: LoggerManager | undefined;
  private readonly loggers = new Map<string, Logger>();
  private readonly logLevelFile: string;

  private constructor(logLevelFile = "./log-level.json") {
    this.logLevelFile = logLevelFile;
  }

  static getInstance(logLevelFile?: string): LoggerManager {
    LoggerManager.instance ??= new LoggerManager(logLevelFile);
    return LoggerManager.instance;
  }

  getLogger(name: string): Logger {
    const existing = this.loggers.get(name);
    if (existing) return existing;

    const logger = createLogger({ name, level: "info" });
    this.loggers.set(name, logger);

    void this.getLogLevel(name).then((level) => {
      logger.level = level;
    });

    return logger;
  }

  async setLogLevel(name: string, level: Level): Promise<void> {
    const activeLogger = this.loggers.get(name);
    if (activeLogger) {
      activeLogger.level = level;
    }

    const levels = await this.getAllLogLevels();
    levels[name] = level;

    const tmp = `${this.logLevelFile}.tmp`;
    await fs.mkdir(path.dirname(this.logLevelFile), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(levels, null, 2), "utf-8");
    await fs.rename(tmp, this.logLevelFile);
  }

  private async getLogLevel(name: string): Promise<Level> {
    const levels = await this.getAllLogLevels();
    return (levels[name] as Level | undefined) ?? "info";
  }

  private async getAllLogLevels(): Promise<Record<string, string>> {
    try {
      const text = await fs.readFile(this.logLevelFile, "utf-8");
      return JSON.parse(text || "{}") as Record<string, string>;
    } catch {
      return {};
    }
  }
}

// =============================================================================
// Trace Context Helpers
// =============================================================================

export const createTraceLogger = (
  logger: Logger,
  context: TraceContext
): Logger =>
  logger.child({
    traceId: context.traceId,
    requestId: context.requestId,
    userId: context.userId,
  });

export function attachTraceContext(
  req: Request,
  logger: Logger
): { logger: Logger; traceId: string } {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const requestId = crypto.randomUUID();
  return {
    logger: createTraceLogger(logger, { traceId, requestId }),
    traceId,
  };
}

// =============================================================================
// Singletons
// =============================================================================

export const loggerManager = LoggerManager.getInstance();
export const rootLogger = loggerManager.getLogger("app");

// =============================================================================
// Enhanced Facade
// =============================================================================

export const logger = {
  child: (bindings: LogFields) => rootLogger.child(bindings),
  info: (message: string | LogFields, fields?: LogFields) => {
    if (typeof message === "string") {
      rootLogger.info({ ...fields, msg: message });
    } else {
      rootLogger.info({ ...message, ...fields });
    }
  },
  error: (message: string | LogFields, error?: Error, fields?: LogFields) => {
    if (typeof message === "string") {
      rootLogger.error({ ...fields, err: error, msg: message });
    } else {
      rootLogger.error({ ...message, err: error, ...fields });
    }
  },
  warn: (message: string | LogFields, fields?: LogFields) => {
    if (typeof message === "string") {
      rootLogger.warn({ ...fields, msg: message });
    } else {
      rootLogger.warn({ ...message, ...fields });
    }
  },
  debug: (message: string | LogFields, fields?: LogFields) => {
    if (typeof message === "string") {
      rootLogger.debug({ ...fields, msg: message });
    } else {
      rootLogger.debug({ ...message, ...fields });
    }
  },
};
