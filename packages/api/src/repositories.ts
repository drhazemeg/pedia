// packages/db/src/repositories/factory.ts
//
// The repositories exported from `@pedia/db/repositories` are already
// module-level singletons — each module constructs one instance at import
// time and exports it. This file exists only to give callers a single,
// typed aggregation point.

import {
  appointmentRepository,
  encounterRepository,
  growthRepository,
  immunizationRepository,
  labRepository,
  patientRepository,
  prescriptionRepository,
  staffRepository,
  whoGrowthRepository,
} from "@pedia/db/repositories";

export const repositories = {
  appointment: appointmentRepository,
  encounter: encounterRepository,
  growth: growthRepository,
  immunization: immunizationRepository,
  lab: labRepository,
  patient: patientRepository,
  prescription: prescriptionRepository,
  staff: staffRepository,
  whoGrowth: whoGrowthRepository,
} as const;

export type Repositories = typeof repositories;

export function getRepository<K extends keyof Repositories>(
  key: K
): Repositories[K] {
  return repositories[key];
}

/**
 * @deprecated Use `repositories` directly.
 *
 * Kept temporarily so existing imports of `repoFactory.getRepository(...)`
 * and `repoFactory.getRepositories()` continue to work during the migration.
 * Delete this entire block once all callers are updated.
 */
export const repoFactory = {
  getRepository,
  getRepositories: () => repositories,
} as const;
