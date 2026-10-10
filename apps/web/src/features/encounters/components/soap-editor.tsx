// apps/web/src/features/encounters/components/soap-editor.tsx

import { Button } from "@pedia/ui/components/button";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useEncounter,
  useLatestVitals,
  usePatientAllergies,
  useSignEncounter,
} from "../api";
import { useSoapAutosave } from "../hooks/use-soap-autosave";
import { EMPTY_SOAP, parseSoapData, type SoapData } from "../types";
import { AssessmentSection } from "./assessment-section";
import { AutosaveIndicator } from "./autosave-indicator";
import { CollapsibleSection } from "./collapsible-section";
import { EncounterSignDialog } from "./encounter-sign-dialog";
import { ObjectiveSection } from "./objective-section";
import { PlanSection } from "./plan-section";
import { SubjectiveSection } from "./subjective-section";

export interface SoapEditorProps {
  encounterId: string;
}

/**
 * Top-level SOAP editor.
 *
 * State model:
 *
 *   1. **Derived draft.** While the user hasn't edited anything, the
 *      editor displays a value computed from the encounter and its
 *      related queries (allergies, vitals). This is a pure derivation —
 *      no effect, no initialization state — so the first render with
 *      data shows the real content instead of a "Loading…" flash.
 *
 *   2. **Overridden draft.** The first time the user makes any change,
 *      `draftOverride` is set and the derived value stops mattering.
 *      From that point on, the local draft is the source of truth for
 *      the rest of the editing session; refetches of the encounter do
 *      NOT overwrite in-progress work.
 *
 * The transition from (1) to (2) is the entire reason this isn't just
 * `useState(derivedDraft)` — the derivation has to remain live until
 * the user proves they care about a specific value.
 */
export function SoapEditor({ encounterId }: SoapEditorProps) {
  const encounterQuery = useEncounter(encounterId);
  const vitalsQuery = useLatestVitals(encounterQuery.data?.patientId ?? "");
  const allergiesQuery = usePatientAllergies(
    encounterQuery.data?.patientId ?? ""
  );
  const signMutation = useSignEncounter();

  const encounter = encounterQuery.data;

  // ─────────────────────────────────────────────────────────────────
  // Derived draft — recomputed when the queries change, but only used
  // until the user makes an edit.
  // ─────────────────────────────────────────────────────────────────
  const derivedDraft = useMemo<SoapData | null>(() => {
    if (!encounter) return null;

    const parsed = parseSoapData({
      subjectiveJson: encounter.subjectiveJson,
      objectiveJson: encounter.objectiveJson,
      assessmentJson: encounter.assessmentJson,
      planJson: encounter.planJson,
    });

    // Seed allergies from the patient record only if the encounter
    // doesn't already have any. This is a display-time merge, not a
    // write — if the user never edits the field, nothing gets persisted.
    const allergies =
      parsed.subjective.allergies.length > 0
        ? parsed.subjective.allergies
        : (allergiesQuery.data?.map((a) => a.allergen) ?? []);

    // Same for vitals: prefer the snapshot recorded on the encounter,
    // fall back to the freshest vitals row.
    const vitalsSnapshot =
      parsed.objective.vitalsSnapshot ??
      (vitalsQuery.data
        ? {
            recordedAt: vitalsQuery.data.recordedAt?.toISOString(),
            temperatureC: vitalsQuery.data.temperatureC ?? null,
            heartRateBpm: vitalsQuery.data.heartRateBpm ?? null,
            respiratoryRateBpm: vitalsQuery.data.respiratoryRateBpm ?? null,
            bloodPressureSystolic: vitalsQuery.data.systolicBp ?? null,
            bloodPressureDiastolic: vitalsQuery.data.diastolicBp ?? null,
            oxygenSaturationPercent:
              vitalsQuery.data.oxygenSaturationPercent ?? null,
            weightKg: vitalsQuery.data.weightKg ?? null,
            heightCm: vitalsQuery.data.heightCm ?? null,
            headCircumferenceCm: vitalsQuery.data.headCircumferenceCm ?? null,
          }
        : null);

    return {
      subjective: { ...parsed.subjective, allergies },
      objective: { ...parsed.objective, vitalsSnapshot },
      assessment: parsed.assessment,
      plan: parsed.plan,
    };
  }, [encounter, allergiesQuery.data, vitalsQuery.data]);

  // ─────────────────────────────────────────────────────────────────
  // Override — set on first user edit, then never cleared.
  // ─────────────────────────────────────────────────────────────────
  const [draftOverride, setDraftOverride] = useState<SoapData | null>(null);
  const draft = draftOverride ?? derivedDraft;

  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const isSigned = encounter?.status === "Signed";
  const isEditable = !isSigned && derivedDraft !== null;

  /**
   * Apply an update to the draft. Promotes the derived draft into an
   * override on first call, so subsequent server refetches can't clobber
   * the user's work.
   */
  const updateDraft = useCallback(
    (updater: (prev: SoapData) => SoapData) => {
      setDraftOverride((prev) => {
        const base = prev ?? derivedDraft ?? EMPTY_SOAP;
        return updater(base);
      });
    },
    [derivedDraft]
  );

  const autosave = useSoapAutosave({
    encounterId,
    // Until the encounter is loaded, hand the hook a stable empty draft.
    // The hook's `disabled` gate prevents any write; the `wasDisabled`
    // transition logic inside the hook resets the baseline when we go
    // from disabled to enabled, so the seeded value isn't saved back.
    data: draft ?? EMPTY_SOAP,
    disabled: !draft || isSigned,
  });

  const handleSign = useCallback(
    async (_signatureName: string) => {
      try {
        await autosave.saveNow();
        await signMutation.mutateAsync({ id: encounterId });
        toast.success("Encounter signed");
      } catch {
        toast.error("Failed to sign encounter");
        throw new Error("sign failed");
      }
    },
    [autosave, encounterId, signMutation]
  );

  const sections = useMemo(() => {
    if (!draft) return null;
    return {
      subjective: (
        <SubjectiveSection
          value={draft.subjective}
          onChange={(v) => updateDraft((prev) => ({ ...prev, subjective: v }))}
          disabled={!isEditable}
        />
      ),
      objective: (
        <ObjectiveSection
          value={draft.objective}
          onChange={(v) => updateDraft((prev) => ({ ...prev, objective: v }))}
          latestVitals={draft.objective.vitalsSnapshot}
          disabled={!isEditable}
        />
      ),
      assessment: (
        <AssessmentSection
          value={draft.assessment}
          onChange={(v) => updateDraft((prev) => ({ ...prev, assessment: v }))}
          disabled={!isEditable}
        />
      ),
      plan: (
        <PlanSection
          value={draft.plan}
          onChange={(v) => updateDraft((prev) => ({ ...prev, plan: v }))}
          patientId={encounter?.patientId ?? ""}
          encounterId={encounterId}
          disabled={!isEditable}
        />
      ),
    };
  }, [draft, encounter?.patientId, encounterId, isEditable, updateDraft]);

  if (encounterQuery.isError) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4">
        Could not load encounter. Refresh the page and try again.
      </div>
    );
  }

  if (!sections) {
    return (
      <div className="text-muted-foreground flex items-center justify-center p-12">
        Loading encounter…
      </div>
    );
  }

  const patientName =
    encounter?.patient?.firstName && encounter?.patient?.lastName
      ? `${encounter.patient.firstName} ${encounter.patient.lastName}`
      : "this patient";

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Encounter</h1>
          {encounter && (
            <p className="text-muted-foreground text-sm">
              {patientName} ·{" "}
              {new Date(encounter.encounterDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <AutosaveIndicator status={autosave.status} />
          {isSigned ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Signed
            </span>
          ) : (
            <Button onClick={() => setSignDialogOpen(true)}>Sign</Button>
          )}
        </div>
      </header>

      <div className="space-y-2">
        <CollapsibleSection title="S" subtitle="Subjective" defaultOpen>
          {sections.subjective}
        </CollapsibleSection>
        <CollapsibleSection title="O" subtitle="Objective" defaultOpen>
          {sections.objective}
        </CollapsibleSection>
        <CollapsibleSection title="A" subtitle="Assessment" defaultOpen>
          {sections.assessment}
        </CollapsibleSection>
        <CollapsibleSection title="P" subtitle="Plan" defaultOpen>
          {sections.plan}
        </CollapsibleSection>
      </div>

      <EncounterSignDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        onConfirm={handleSign}
        patientName={patientName}
      />
    </div>
  );
}
