// packages/shared/src/constants/index.ts
export * from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Project catalogue
//
// NOTE: every name here is prefixed `PROJECT_*` because `./enums` already
// exports `LOGO_*` and `SCREENSHOT_*` for the clinic domain. Bare names would
// shadow the re-exports above and silently swap the two domains' settings.
// ─────────────────────────────────────────────────────────────────────────────

export const PROJECT_STATUS = [
  "draft",
  "published",
  "rejected",
  "removed",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

/** Project-specific audit actions. The clinic domain's `AUDIT_ACTIONS` is in `./enums`. */
export const PROJECT_AUDIT_ACTIONS = [
  "project_created",
  "project_removed",
] as const;
export type ProjectAuditAction = (typeof PROJECT_AUDIT_ACTIONS)[number];

export const PROJECT_LOGO_PREFIX = "projects/logos/" as const;
export const PROJECT_LOGO_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const PROJECT_LOGO_MAX_SIZE = 3 * 1024 * 1024;

export const PROJECT_SCREENSHOT_PREFIX = "projects/screenshots/" as const;
export const PROJECT_SCREENSHOT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export const PROJECT_SCREENSHOT_MAX_SIZE = 5 * 1024 * 1024;
