// apps/web/src/features/encounters/hooks/use-soap-autosave.ts

import { useCallback, useEffect, useRef, useState } from "react";

import { useUpdateEncounter } from "../api";
import { toJsonRecord, type SoapData } from "../types";

export type AutosaveStatus =
  | "idle" // nothing to save
  | "pending" // dirty, waiting for debounce
  | "saving" // request in flight
  | "saved" // last save succeeded, no changes since
  | "error"; // last save failed, changes still dirty

export interface UseSoapAutosaveOptions {
  encounterId: string;
  /** The current draft. The hook diffs this against the last-saved value. */
  data: SoapData;
  /** When true, autosave is disabled (e.g. encounter is signed). */
  disabled?: boolean;
  /** Debounce window in ms. Defaults to 2000 per the feature spec. */
  debounceMs?: number;
}

export interface UseSoapAutosaveResult {
  status: AutosaveStatus;
  /** Force an immediate save, skipping the debounce. */
  saveNow: () => Promise<void>;
}

/**
 * Build the payload `encounter.update` expects from a SOAP draft.
 *
 * Extracted because the same shape is constructed in two places (`save`
 * and the unmount-flush effect) and the `toJsonRecord` widening would
 * otherwise be duplicated four times per site.
 */
function buildPayload(encounterId: string, draft: SoapData) {
  return {
    id: encounterId,
    subjectiveJson: toJsonRecord(draft.subjective),
    objectiveJson: toJsonRecord(draft.objective),
    assessmentJson: toJsonRecord(draft.assessment),
    planJson: toJsonRecord(draft.plan),
  };
}

/**
 * Autosave the SOAP draft to `encounter.update` after a quiet period.
 *
 * Behavior:
 *   - Every change to `data` resets the debounce timer.
 *   - When the timer fires, if the draft differs from what was last
 *     successfully written, a save is issued.
 *   - While a save is in flight, further changes queue: the timer
 *     restarts, and the next save sends whatever the draft looks like
 *     when it fires. This coalesces bursts of edits into at most one
 *     request per debounce window.
 *   - A failed save leaves `status === "error"` and preserves the dirty
 *     flag, so the next edit will retry. There is no exponential backoff
 *     — the debounce itself is the backoff.
 *
 * Why diff-based rather than always-save: an encounter with no changes
 * (e.g. the doctor just opened it) shouldn't generate a write. It also
 * means a transient refetch that produces an identical draft won't
 * trigger a save.
 */
export function useSoapAutosave({
  encounterId,
  data,
  disabled = false,
  debounceMs = 2000,
}: UseSoapAutosaveOptions): UseSoapAutosaveResult {
  const updateMutation = useUpdateEncounter();

  const [status, setStatus] = useState<AutosaveStatus>("idle");

  // The JSON we last successfully wrote. Kept in a ref so changes don't
  // re-trigger the effect that schedules the debounce.
  const lastSavedRef = useRef<string>(JSON.stringify(data));

  // Ref for the current draft — read by `saveNow` and by the debounce
  // timer, both of which fire outside the render cycle and would
  // otherwise capture a stale value.
  const draftRef = useRef(data);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guards against setState-after-unmount. React 18 warns about this in
  // dev; the ref makes the intent explicit and works in StrictMode.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep draftRef.current in sync with the data prop.
  useEffect(() => {
    draftRef.current = data;
  }, [data]);

  // `mutateAsync` is stable across renders (React Query guarantees this
  // for the mutation function itself), but the mutation *object* is not.
  // Capture just the function we need so the effect's dependency array
  // doesn't re-run on every render.
  const mutateAsyncRef = useRef(updateMutation.mutateAsync);
  useEffect(() => {
    mutateAsyncRef.current = updateMutation.mutateAsync;
  }, [updateMutation.mutateAsync]);

  const save = useCallback(
    async (options: { force?: boolean } = {}): Promise<void> => {
      if (disabled) return;

      const currentJson = JSON.stringify(draftRef.current);
      if (!options.force && currentJson === lastSavedRef.current) {
        // Nothing to write. Reset status to idle only if we weren't in an
        // error state — an error means the last write failed and this
        // "no-op" save is really "there are still unsaved changes".
        setStatus((prev) => (prev === "error" ? "error" : "idle"));
        return;
      }

      setStatus("saving");
      try {
        const payload = draftRef.current;
        await mutateAsyncRef.current(buildPayload(encounterId, payload));
        // Only mark clean if nothing changed while the request was in
        // flight. If the draft moved on, leave lastSaved at the older
        // value and let the next debounce fire.
        const afterJson = JSON.stringify(draftRef.current);
        if (afterJson === currentJson) {
          lastSavedRef.current = currentJson;
          if (mountedRef.current) setStatus("saved");
        } else if (mountedRef.current) {
          setStatus("pending");
        }
      } catch {
        if (mountedRef.current) setStatus("error");
      }
    },
    [disabled, encounterId]
  );

  // Debounce: whenever `data` or `disabled` changes, clear the old timer
  // and start a new one. The cleanup runs on every dependency change, so
  // rapid edits naturally coalesce.
  useEffect(() => {
    if (disabled) return;

    // Mark dirty immediately so the indicator doesn't lag the timer.
    const currentJson = JSON.stringify(data);
    if (currentJson !== lastSavedRef.current) {
      setStatus((prev) => (prev === "saving" ? prev : "pending"));
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, disabled, debounceMs, save]);

  // Flush on unmount so a navigation away doesn't lose the last edit.
  // Best-effort: if the request fails, we can't do anything about it
  // after the component is gone, but at least we tried.
  useEffect(() => {
    return () => {
      const currentJson = JSON.stringify(draftRef.current);
      if (currentJson !== lastSavedRef.current && !disabled) {
        void mutateAsyncRef.current(
          buildPayload(encounterId, draftRef.current)
        );
      }
    };
  }, [disabled, encounterId]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await save({ force: true });
  }, [save]);

  return { status, saveNow };
}
