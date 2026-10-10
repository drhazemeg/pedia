// packages/tanstack/src/query/config.ts

/**
 * Global staleTime configuration for all queries
 * These values ensure consistent data freshness across the application
 */
export const STALE_TIMES = {
  /**
   * Default stale time for most data (30 seconds)
   * - Patient lists, appointments, encounters, prescriptions, labs, vitals
   * - Fast-changing clinical data that needs reasonable freshness
   */
  DEFAULT: 30_000, // 30 seconds

  /**
   * Extended stale time for detailed data (1 minute)
   * - Patient details, encounter details, prescription details
   * - Data that changes less frequently but still needs updates
   */
  DETAIL: 60_000, // 1 minute

  /**
   * Long stale time for static/reference data (5 minutes)
   * - Staff lists, clinic data, reference data
   * - Data that changes rarely
   */
  REFERENCE: 5 * 60_000, // 5 minutes

  /**
   * Very long stale time for WHO/CDC reference data (7 days)
   * - Growth percentiles, WHO curves, immunization schedules
   * - Static medical reference data that almost never changes
   */
  STATIC_REFERENCE: 7 * 24 * 60 * 60_000, // 7 days

  /**
   * Short stale time for time-sensitive data (15 seconds)
   * - Appointment availability, scheduling conflicts, real-time data
   * - Data that needs to be very fresh
   */
  REAL_TIME: 15_000, // 15 seconds

  /**
   * Very short stale time for critical updates (5 seconds)
   * - Dashboard stats, today's schedule, active counts
   * - High-priority data that needs immediate reflection
   */
  CRITICAL: 5000, // 5 seconds

  /**
   * "Never" stale - but we handle this via infinite staleTime
   * Use for static data that should never auto-refresh
   */
  NEVER: Number.POSITIVE_INFINITY,
} as const;

/**
 * Global GC (Garbage Collection) time defaults
 */
export const GC_TIMES = {
  DEFAULT: 60_000, // 1 minute
  DETAIL: 120_000, // 2 minutes
  REFERENCE: 30 * 60_000, // 30 minutes
  STATIC_REFERENCE: 30 * 24 * 60 * 60_000, // 30 days
} as const;

/**
 * Query configuration helper to ensure consistent stale times
 */
export const createQueryConfig = (
  options: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
    retry?: number | boolean;
    retryDelay?: number | ((attemptIndex: number) => number);
  } = {}
) => ({
  staleTime: options.staleTime ?? STALE_TIMES.DEFAULT,
  gcTime: options.gcTime ?? GC_TIMES.DEFAULT,
  enabled: options.enabled ?? true,
  retry: options.retry ?? 3,
  retryDelay:
    options.retryDelay ??
    ((attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30_000)),
  ...options,
});

/**
 * Type for creating consistent query options
 */
export type QueryConfigOptions = Partial<{
  staleTime: number;
  gcTime: number;
  enabled: boolean;
  retry: number | boolean;
  retryDelay: number | ((attemptIndex: number) => number);
}>;
