// apps/web/src/features/encounters/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

// ============================================================================
// Queries
// ============================================================================

export const useEncounter = (id: string) =>
  useQuery(orpc.encounter.getById.queryOptions({ input: id }));

/**
 * Latest vitals for a patient. Used by the Objective section to
 * auto-populate the vitals snapshot on first load. If the encounter
 * already has a snapshot, this is only used as a fallback.
 */
export const useLatestVitals = (patientId: string) =>
  useQuery(orpc.vitals.getLatest.queryOptions({ input: patientId }));

/**
 * The patient's recorded allergies. Used to seed the Subjective section's
 * allergies list on first open. The doctor can add or remove entries
 * per-visit without touching the patient record.
 */
export const usePatientAllergies = (patientId: string) =>
  useQuery(
    orpc.patientAllergy.getByPatientId.queryOptions({
      input: { patientId },
    })
  );

// ============================================================================
// Mutations
// ============================================================================

/**
 * Autosave hook backing the SOAP editor. It writes to the same
 * `encounter.update` procedure the manual save button uses, so the server
 * never sees a distinction between "autosave" and "manual save".
 *
 * `onSuccess` deliberately does NOT invalidate `getById` — the editor
 * owns the local draft and invalidating would refetch and discard any
 * keystrokes the user made during the round-trip. Cache freshness for
 * other views (encounter list, patient detail) is handled by the update
 * mutation itself invalidating on the server side.
 */
export const useUpdateEncounter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.encounter.update.mutationOptions(),
    onSuccess: (data) => {
      // Invalidate the list and stats so other views pick up the change.
      queryClient.invalidateQueries({ queryKey: orpc.encounter.key() });
      queryClient.invalidateQueries({
        queryKey: orpc.encounter.getById.key({ input: data.id }),
      });
    },
  });
};

/**
 * Sign (finalize) an encounter. Once signed, the encounter is locked on
 * the server; the editor should switch to read-only mode after this
 * resolves.
 */
export const useSignEncounter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.encounter.sign.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orpc.encounter.key() });
      queryClient.invalidateQueries({
        queryKey: orpc.encounter.getById.key({ input: data.id }),
      });
    },
  });
};
