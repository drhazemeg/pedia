// apps/web/src/features/patients/components/patient-form-sections.tsx
//
// The three repeatable-list editors used by `PatientForm`. Each renders a
// single item's inputs and calls back with the updated item. The array
// wrapper (add/remove) lives in the parent form, driven by
// `form.AppField mode="array"`.

import { GUARDIAN_RELATIONSHIPS } from "@pedia/shared/constants";
import type { PatientFormValues } from "@pedia/shared/schemas/clinic/patients";
import { Button } from "@pedia/ui/components/button";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

type Guardian = PatientFormValues["guardians"][number];
type Allergy = PatientFormValues["allergies"][number];
type ChronicCondition = PatientFormValues["chronicConditions"][number];

// ─────────────────────────────────────────────────────────────────────────────
// Item header (title + delete button)
// ─────────────────────────────────────────────────────────────────────────────

interface ItemHeaderProps {
  title: string;
  onRemove: () => void;
}

function ItemHeader({ title, onRemove }: ItemHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h4 className="font-medium">{title}</h4>
      <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardians
// ─────────────────────────────────────────────────────────────────────────────

interface GuardianEditorProps {
  guardian: Guardian;
  index: number;
  onChange: (next: Guardian) => void;
  onRemove: () => void;
}

export function GuardianEditor({
  guardian,
  index,
  onChange,
  onRemove,
}: GuardianEditorProps) {
  const update = <K extends keyof Guardian>(key: K, value: Guardian[K]) =>
    onChange({ ...guardian, [key]: value });

  return (
    <div className="rounded-lg border p-4">
      <ItemHeader title={`Guardian ${index + 1}`} onRemove={onRemove} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`guardian-${index}-name`}>Name</Label>
          <Input
            id={`guardian-${index}-name`}
            value={guardian.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`guardian-${index}-relationship`}>Relationship</Label>
          <select
            id={`guardian-${index}-relationship`}
            value={guardian.relationship}
            onChange={(e) => update("relationship", e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            {GUARDIAN_RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`guardian-${index}-phone`}>Phone</Label>
          <Input
            id={`guardian-${index}-phone`}
            value={guardian.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`guardian-${index}-email`}>Email</Label>
          <Input
            id={`guardian-${index}-email`}
            type="email"
            value={guardian.email ?? ""}
            onChange={(e) => update("email", e.target.value || null)}
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={guardian.isPrimary ?? false}
              onChange={(e) => update("isPrimary", e.target.checked)}
            />
            <span className="text-sm">Primary</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={guardian.emergencyContact ?? false}
              onChange={(e) => update("emergencyContact", e.target.checked)}
            />
            <span className="text-sm">Emergency Contact</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function blankGuardian(): Guardian {
  return {
    name: "",
    relationship: GUARDIAN_RELATIONSHIPS[0],
    phone: "",
    email: null,
    isPrimary: false,
    emergencyContact: false,
    contactOrder: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Allergies
// ─────────────────────────────────────────────────────────────────────────────

interface AllergyEditorProps {
  allergy: Allergy;
  index: number;
  onChange: (next: Allergy) => void;
  onRemove: () => void;
}

export function AllergyEditor({
  allergy,
  index,
  onChange,
  onRemove,
}: AllergyEditorProps) {
  const update = <K extends keyof Allergy>(key: K, value: Allergy[K]) =>
    onChange({ ...allergy, [key]: value });

  return (
    <div className="rounded-lg border p-4">
      <ItemHeader title={`Allergy ${index + 1}`} onRemove={onRemove} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`allergy-${index}-allergen`}>Allergen</Label>
          <Input
            id={`allergy-${index}-allergen`}
            value={allergy.allergen}
            onChange={(e) => update("allergen", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`allergy-${index}-category`}>Category</Label>
          <Input
            id={`allergy-${index}-category`}
            value={allergy.category}
            onChange={(e) => update("category", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`allergy-${index}-severity`}>Severity</Label>
          <Input
            id={`allergy-${index}-severity`}
            value={allergy.severity}
            onChange={(e) => update("severity", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`allergy-${index}-reaction`}>Reaction</Label>
          <Input
            id={`allergy-${index}-reaction`}
            value={allergy.reaction}
            onChange={(e) => update("reaction", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function blankAllergy(): Allergy {
  return {
    allergen: "",
    category: "",
    severity: "",
    status: "active",
    reaction: "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chronic Conditions
// ─────────────────────────────────────────────────────────────────────────────

interface ConditionEditorProps {
  condition: ChronicCondition;
  index: number;
  onChange: (next: ChronicCondition) => void;
  onRemove: () => void;
}

export function ConditionEditor({
  condition,
  index,
  onChange,
  onRemove,
}: ConditionEditorProps) {
  const update = <K extends keyof ChronicCondition>(
    key: K,
    value: ChronicCondition[K]
  ) => onChange({ ...condition, [key]: value });

  return (
    <div className="rounded-lg border p-4">
      <ItemHeader title={`Condition ${index + 1}`} onRemove={onRemove} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`condition-${index}-condition`}>Condition</Label>
          <Input
            id={`condition-${index}-condition`}
            value={condition.condition}
            onChange={(e) => update("condition", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`condition-${index}-icdCode`}>ICD Code</Label>
          <Input
            id={`condition-${index}-icdCode`}
            value={condition.icdCode ?? ""}
            onChange={(e) => update("icdCode", e.target.value || null)}
          />
        </div>
        <div>
          <Label htmlFor={`condition-${index}-diagnosedDate`}>
            Diagnosed Date
          </Label>
          <Input
            id={`condition-${index}-diagnosedDate`}
            type="date"
            value={condition.diagnosedDate}
            onChange={(e) => update("diagnosedDate", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`condition-${index}-severity`}>Severity</Label>
          <Input
            id={`condition-${index}-severity`}
            value={condition.severity ?? ""}
            onChange={(e) => update("severity", e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}

export function blankCondition(): ChronicCondition {
  return {
    condition: "",
    icdCode: null,
    diagnosedDate: "",
    status: "active",
    severity: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section shell
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}

/**
 * The wrapper around each repeatable list: heading, items, add button.
 * Uses the library's `FormSection`-shaped layout but includes the add
 * button, which `FormSection` doesn't have.
 */
export function RepeatableSection({
  title,
  addLabel,
  onAdd,
  children,
}: SectionProps) {
  return (
    <div className="border-t pt-4">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="space-y-4">
        {children}
        <Button type="button" variant="outline" onClick={onAdd}>
          <PlusIcon className="mr-2 size-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
