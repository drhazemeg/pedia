// apps/web/src/features/patients/components/patient-form.tsx

import {
  BLOOD_GROUPS,
  DELIVERY_METHODS,
  GENDERS,
  PREFERRED_LANGUAGES,
} from "@pedia/shared/constants";
import type { PatientFormValues } from "@pedia/shared/schemas/clinic/patients";
import { scrollToFirstError, useAppForm } from "@pedia/ui/form";
import { toast } from "sonner";

import { patientFormSchema } from "../schemas";
import {
  AllergyEditor,
  ConditionEditor,
  GuardianEditor,
  RepeatableSection,
  blankAllergy,
  blankCondition,
  blankGuardian,
} from "./sections";

// ============================================================================
// Option shapes
// ============================================================================

const GENDER_OPTIONS = GENDERS.map((g) => ({
  value: g,
  label: g.charAt(0).toUpperCase() + g.slice(1),
}));

const BLOOD_GROUP_OPTIONS = BLOOD_GROUPS.map((g) => ({
  value: g,
  label: g,
}));

const LANGUAGE_OPTIONS = PREFERRED_LANGUAGES.map((l) => ({
  value: l,
  label: l,
}));

const DELIVERY_METHOD_OPTIONS = DELIVERY_METHODS.map((m) => ({
  value: m,
  label: m,
}));

const ACTIVE_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resolved", label: "Resolved" },
] as const;

// ============================================================================
// Props
// ============================================================================

interface PatientFormProps {
  initialValues?: Partial<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  submitLabel?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function PatientForm({
  initialValues,
  onSubmit,
  submitLabel = "Save Patient",
}: PatientFormProps) {
  const form = useAppForm({
    defaultValues: {
      mrn: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      bloodGroup: "Unknown",
      gestationWeeksAtBirth: null,
      birthWeightKg: null,
      birthLengthCm: null,
      birthHeadCircumferenceCm: null,
      deliveryMethod: null,
      preferredLanguage: null,
      activeStatus: "active",
      contactNumber: null,
      email: null,
      notes: null,
      guardians: [],
      allergies: [],
      chronicConditions: [],
      ...initialValues,
    } satisfies PatientFormValues,
    validators: {
      onSubmit: patientFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value);
        toast.success("Patient saved successfully");
      } catch (error) {
        toast.error("Failed to save patient");
        throw error;
      }
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit().then(() => {
          // After submission, if there are errors, scroll to the first one
          // so the user sees why the save failed.
          if (!form.state.canSubmit) scrollToFirstError();
        });
      }}
    >
      {/* ── Demographics ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <form.TextField
          label="MRN"
          name="mrn"
          placeholder="Medical record number"
        />

        <form.SelectField
          label="Status"
          name="activeStatus"
          options={ACTIVE_STATUS_OPTIONS}
          placeholder="Select status"
        />

        <form.TextField label="First Name" name="firstName" />
        <form.TextField label="Last Name" name="lastName" />

        <form.DateField label="Date of Birth" name="dateOfBirth" />

        <form.SelectField
          label="Gender"
          name="gender"
          options={GENDER_OPTIONS}
          placeholder="Select gender"
        />

        <form.SelectField
          label="Blood Group"
          name="bloodGroup"
          options={BLOOD_GROUP_OPTIONS}
          placeholder="Select blood group"
        />

        <form.SelectField
          label="Preferred Language"
          name="preferredLanguage"
          options={LANGUAGE_OPTIONS}
          placeholder="Select language"
        />
      </div>

      {/* ── Birth Information ───────────────────────────────────── */}
      <div className="border-t pt-4">
        <h3 className="mb-4 text-lg font-semibold">Birth Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <form.TextField
            label="Gestation Weeks at Birth"
            name="gestationWeeksAtBirth"
            type="number"
          />
          <form.TextField
            label="Birth Weight (kg)"
            name="birthWeightKg"
            type="number"
            step="0.01"
          />
          <form.TextField
            label="Birth Length (cm)"
            name="birthLengthCm"
            type="number"
            step="0.1"
          />
          <form.TextField
            label="Head Circumference (cm)"
            name="birthHeadCircumferenceCm"
            type="number"
            step="0.1"
          />
          <form.SelectField
            label="Delivery Method"
            name="deliveryMethod"
            options={DELIVERY_METHOD_OPTIONS}
            placeholder="Select method"
          />
        </div>
      </div>

      {/* ── Contact ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <form.TextField
          label="Contact Number"
          name="contactNumber"
          type="tel"
          placeholder="Optional"
        />
        <form.TextField
          label="Email"
          name="email"
          type="email"
          placeholder="Optional"
        />
      </div>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <form.TextareaField label="Notes" name="notes" rows={3} />

      {/* ── Guardians ───────────────────────────────────────────── */}
      <form.AppField name="guardians" mode="array">
        {(field) => (
          <RepeatableSection
            title="Guardians"
            addLabel="Add Guardian"
            onAdd={() => field.pushValue(blankGuardian())}
          >
            {field.state.value.map((guardian, index) => (
              <GuardianEditor
                key={`guardian-${guardian.id ?? index}-${guardian.relationship}`}
                guardian={guardian}
                index={index}
                onChange={(next) => field.replaceValue(index, next)}
                onRemove={() => field.removeValue(index)}
              />
            ))}
          </RepeatableSection>
        )}
      </form.AppField>

      {/* ── Allergies ───────────────────────────────────────────── */}
      <form.AppField name="allergies" mode="array">
        {(field) => (
          <RepeatableSection
            title="Allergies"
            addLabel="Add Allergy"
            onAdd={() => field.pushValue(blankAllergy())}
          >
            {field.state.value.map((allergy, index) => (
              <AllergyEditor
                key={`allergy-${index}-${allergy.allergen}`}
                allergy={allergy}
                index={index}
                onChange={(next) => field.replaceValue(index, next)}
                onRemove={() => field.removeValue(index)}
              />
            ))}
          </RepeatableSection>
        )}
      </form.AppField>

      {/* ── Chronic Conditions ──────────────────────────────────── */}
      <form.AppField name="chronicConditions" mode="array">
        {(field) => (
          <RepeatableSection
            title="Chronic Conditions"
            addLabel="Add Chronic Condition"
            onAdd={() => field.pushValue(blankCondition())}
          >
            {field.state.value.map((condition, index) => (
              <ConditionEditor
                key={`condition-${index}-${condition.condition}`}
                condition={condition}
                index={index}
                onChange={(next) => field.replaceValue(index, next)}
                onRemove={() => field.removeValue(index)}
              />
            ))}
          </RepeatableSection>
        )}
      </form.AppField>

      {/* ── Submit ──────────────────────────────────────────────── */}
      <form.AppForm>
        <form.SubscribeButton label={submitLabel} />
      </form.AppForm>
    </form>
  );
}
