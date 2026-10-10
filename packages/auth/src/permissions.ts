import { ROLES_MAP } from "@pedia/shared/schemas/role";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

// packages/auth/src/permissions.ts (adjust path to match your repo)

// ============================================================
// Statements
// ============================================================
//
// `defaultStatements` from Better Auth gives us the admin-plugin resources:
//   user, session, impersonate
//
// We add the clinic-domain resources on top. Every resource is a list of
// actions; `ac.newRole(...)` below grants a subset per role.
//
// Keep this object in sync with `ROLES_MAP` — adding a new role there
// without adding it to `roles` below will let `ac.newRole` silently accept
// any statement, which is exactly the failure mode access control is
// supposed to prevent.

const statements = {
  ...defaultStatements,

  // ----------------------------------------------------------
  // Clinical
  // ----------------------------------------------------------
  patient: [
    "create",
    "read",
    "update",
    "delete",
    "archive",
    "merge",
    "export",
  ] as const,

  guardian: ["create", "read", "update", "delete"] as const,

  appointment: [
    "create",
    "read",
    "update",
    "delete",
    "cancel",
    "check-in",
    "reschedule",
  ] as const,

  encounter: [
    "create",
    "read",
    "update",
    "delete",
    "complete",
    "cancel",
  ] as const,

  diagnosis: ["create", "read", "update", "delete"] as const,

  vital: ["create", "read", "update", "delete"] as const,

  growth: ["create", "read", "update", "delete"] as const,

  immunization: [
    "create",
    "read",
    "update",
    "delete",
    "administer",
    "defer",
    "refuse",
  ] as const,

  // ----------------------------------------------------------
  // Prescriptions & pharmacy
  // ----------------------------------------------------------
  prescription: [
    "create",
    "read",
    "update",
    "delete",
    "fill",
    "discontinue",
    "renew",
  ] as const,

  medicine: ["create", "read", "update", "delete"] as const,

  inventory: ["read", "adjust", "receive", "dispense"] as const,

  // ----------------------------------------------------------
  // Labs
  // ----------------------------------------------------------
  labOrder: [
    "create",
    "read",
    "update",
    "delete",
    "collect",
    "result",
    "cancel",
  ] as const,

  labTest: ["create", "read", "update", "delete"] as const,

  // ----------------------------------------------------------
  // Admissions & beds
  // ----------------------------------------------------------
  admission: [
    "create",
    "read",
    "update",
    "delete",
    "discharge",
    "transfer",
  ] as const,

  bed: ["create", "read", "update", "delete", "allocate", "release"] as const,

  // ----------------------------------------------------------
  // Billing
  // ----------------------------------------------------------
  invoice: [
    "create",
    "read",
    "update",
    "delete",
    "issue",
    "void",
    "refund",
  ] as const,

  payment: ["create", "read", "update", "delete", "refund"] as const,

  expense: ["create", "read", "update", "delete"] as const,

  chargeCatalog: ["create", "read", "update", "delete"] as const,

  // ----------------------------------------------------------
  // Staff & org
  // ----------------------------------------------------------
  staff: ["create", "read", "update", "delete", "deactivate"] as const,

  doctor: ["create", "read", "update", "delete"] as const,

  department: ["create", "read", "update", "delete"] as const,

  schedule: ["create", "read", "update", "delete"] as const,

  clinicSettings: ["read", "update"] as const,

  // ----------------------------------------------------------
  // Records & documents
  // ----------------------------------------------------------
  medicalRecord: ["create", "read", "update", "delete"] as const,

  document: ["create", "read", "update", "delete"] as const,

  clinicalNote: ["create", "read", "update", "delete"] as const,

  // ----------------------------------------------------------
  // Auditing & reporting
  // ----------------------------------------------------------
  auditLog: ["read", "export"] as const,

  report: ["read", "export"] as const,

  dashboard: ["read"] as const,
} as const;

export const ac = createAccessControl(statements);

// ============================================================
// Roles
// ============================================================
//
// Principle of least privilege:
//   - admin   → everything
//   - doctor  → full clinical + prescribing + labs, read-only billing
//   - staff   → front-desk / nursing: scheduling, vitals, immunization
//               administration, dispensing, billing, no clinical edits
//   - patient → own records only (row-level scoping is enforced in the API
//               layer; this map only grants the *actions*)

export const roles = {
  // ----------------------------------------------------------
  // Admin — full control
  // ----------------------------------------------------------
  [ROLES_MAP.ADMIN]: ac.newRole({
    ...adminAc.statements,

    patient: [
      "create",
      "read",
      "update",
      "delete",
      "archive",
      "merge",
      "export",
    ],
    guardian: ["create", "read", "update", "delete"],

    appointment: [
      "create",
      "read",
      "update",
      "delete",
      "cancel",
      "check-in",
      "reschedule",
    ],
    encounter: ["create", "read", "update", "delete", "complete", "cancel"],
    diagnosis: ["create", "read", "update", "delete"],
    vital: ["create", "read", "update", "delete"],
    growth: ["create", "read", "update", "delete"],
    immunization: [
      "create",
      "read",
      "update",
      "delete",
      "administer",
      "defer",
      "refuse",
    ],

    prescription: [
      "create",
      "read",
      "update",
      "delete",
      "fill",
      "discontinue",
      "renew",
    ],
    medicine: ["create", "read", "update", "delete"],
    inventory: ["read", "adjust", "receive", "dispense"],

    labOrder: [
      "create",
      "read",
      "update",
      "delete",
      "collect",
      "result",
      "cancel",
    ],
    labTest: ["create", "read", "update", "delete"],

    admission: ["create", "read", "update", "delete", "discharge", "transfer"],
    bed: ["create", "read", "update", "delete", "allocate", "release"],

    invoice: ["create", "read", "update", "delete", "issue", "void", "refund"],
    payment: ["create", "read", "update", "delete", "refund"],
    expense: ["create", "read", "update", "delete"],
    chargeCatalog: ["create", "read", "update", "delete"],

    staff: ["create", "read", "update", "delete", "deactivate"],
    doctor: ["create", "read", "update", "delete"],
    department: ["create", "read", "update", "delete"],
    schedule: ["create", "read", "update", "delete"],
    clinicSettings: ["read", "update"],

    medicalRecord: ["create", "read", "update", "delete"],
    document: ["create", "read", "update", "delete"],
    clinicalNote: ["create", "read", "update", "delete"],

    auditLog: ["read", "export"],
    report: ["read", "export"],
    dashboard: ["read"],
  }),

  // ----------------------------------------------------------
  // Doctor — full clinical, read-only billing
  // ----------------------------------------------------------
  [ROLES_MAP.DOCTOR]: ac.newRole({
    ...userAc.statements,

    patient: ["create", "read", "update", "archive", "export"],
    guardian: ["create", "read", "update"],

    appointment: [
      "create",
      "read",
      "update",
      "cancel",
      "check-in",
      "reschedule",
    ],
    encounter: ["create", "read", "update", "complete", "cancel"],
    diagnosis: ["create", "read", "update", "delete"],
    vital: ["create", "read", "update"],
    growth: ["create", "read", "update"],
    immunization: ["create", "read", "update", "administer", "defer", "refuse"],

    prescription: ["create", "read", "update", "fill", "discontinue", "renew"],
    medicine: ["read"],
    inventory: ["read"],

    labOrder: ["create", "read", "update", "collect", "result", "cancel"],
    labTest: ["read"],

    admission: ["create", "read", "update", "discharge", "transfer"],
    bed: ["read", "allocate", "release"],

    invoice: ["read"],
    payment: ["read"],
    chargeCatalog: ["read"],

    staff: ["read"],
    doctor: ["read"],
    department: ["read"],
    schedule: ["read", "update"],
    clinicSettings: ["read"],

    medicalRecord: ["create", "read", "update"],
    document: ["create", "read", "update"],
    clinicalNote: ["create", "read", "update"],

    report: ["read", "export"],
    dashboard: ["read"],
  }),

  // ----------------------------------------------------------
  // Staff — front desk / nursing: scheduling, vitals, dispensing,
  // billing. No clinical notes, no prescribing, no diagnoses.
  // ----------------------------------------------------------
  [ROLES_MAP.STAFF]: ac.newRole({
    ...userAc.statements,

    patient: ["create", "read", "update"],
    guardian: ["create", "read", "update"],

    appointment: [
      "create",
      "read",
      "update",
      "cancel",
      "check-in",
      "reschedule",
    ],
    encounter: ["read", "create"],
    vital: ["create", "read", "update"],
    growth: ["create", "read", "update"],
    immunization: ["read", "create", "administer", "defer", "refuse"],

    prescription: ["read", "fill"],
    medicine: ["read"],
    inventory: ["read", "adjust", "receive", "dispense"],

    labOrder: ["read", "create", "collect"],
    labTest: ["read"],

    admission: ["read", "create"],
    bed: ["read", "allocate", "release"],

    invoice: ["create", "read", "update", "issue"],
    payment: ["create", "read"],
    chargeCatalog: ["read"],

    staff: ["read"],
    doctor: ["read"],
    department: ["read"],
    schedule: ["read"],
    clinicSettings: ["read"],

    medicalRecord: ["create", "read"],
    document: ["create", "read"],

    dashboard: ["read"],
  }),

  // ----------------------------------------------------------
  // Patient — read-only access to their own data. Row-level scoping
  // (e.g. "this patient may only read rows where patientId = self")
  // is enforced in the API layer; this map grants only the actions.
  // ----------------------------------------------------------
  [ROLES_MAP.PATIENT]: ac.newRole({
    ...userAc.statements,

    patient: ["read"],
    guardian: ["read"],

    appointment: ["read", "cancel", "reschedule"],
    encounter: ["read"],
    diagnosis: ["read"],
    vital: ["read"],
    growth: ["read"],
    immunization: ["read"],

    prescription: ["read"],
    medicine: ["read"],

    labOrder: ["read"],
    labTest: ["read"],

    admission: ["read"],
    bed: ["read"],

    invoice: ["read"],
    payment: ["read"],

    doctor: ["read"],
    department: ["read"],
    schedule: ["read"],
    clinicSettings: ["read"],

    medicalRecord: ["read"],
    document: ["read"],

    dashboard: ["read"],
  }),
};
