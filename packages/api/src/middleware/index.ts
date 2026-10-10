// packages/api/src/middleware/index.ts

/**
 * Barrel for the API middleware primitives.
 *
 * Kept as an explicit re-export list (rather than `export *`) so the
 * public surface of this directory is obvious at a glance and tree-shaking
 * stays predictable.
 */
export { requireAuth } from "./require-auth";
export {
  requireAdmin,
  requireDoctor,
  requireRole,
  requireStaff,
  STAFF_ROLES,
} from "./require-role";
export { requireAuthAndClinic, requireClinic } from "./require-clinic";
export { withErrorHandler } from "./with-error-handler";
