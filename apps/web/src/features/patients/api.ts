// apps/web/src/features/patients/api.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

// ============================================================================
// Input types
// ============================================================================
//
// These mirror the input schemas declared on the corresponding patient
// router procedures. They are declared explicitly rather than derived from
// `AppRouterClient` because oRPC's client proxy type doesn't expose a
// clean, stable way to extract a procedure's input type — every `infer`
// on `.call`, `.handler`, or `.queryOptions` either fails outright or
// degrades to `unknown`.
//
// The `queryOptions({ input })` call in each hook is the real type check:
// if a router schema changes, the call site fails to compile and these
// interfaces get updated in lockstep. Keeping them minimal (only fields
// callers actually pass) reduces the drift surface.

interface PatientListInput {
  query?: string;
  limit?: number;
  offset?: number;
  activeStatus?: "active" | "inactive" | "resolved";
  gender?: "male" | "female";
}

interface PatientEncountersInput {
  patientId: string;
  limit?: number;
  offset?: number;
}

interface PatientPrescriptionsInput {
  patientId: string;
  status?: "active" | "filled" | "discontinued" | "cancelled";
}

interface PatientLabOrdersInput {
  patientId: string;
  status?: "cancelled" | "ordered" | "collected" | "in_progress" | "completed";
}

// ============================================================================
// Queries
// ============================================================================

export const usePatientList = (input: PatientListInput) =>
  useQuery(orpc.patient.list.queryOptions({ input }));

export const usePatient = (id: string) =>
  useQuery(orpc.patient.getById.queryOptions({ input: id }));

export const usePatientFullData = (id: string) =>
  useQuery(orpc.patient.getFullData.queryOptions({ input: id }));

export const usePatientEncounters = (input: PatientEncountersInput) =>
  useQuery(orpc.patient.getEncounters.queryOptions({ input }));

export const usePatientGrowthData = (id: string) =>
  useQuery(orpc.patient.getGrowthData.queryOptions({ input: id }));

export const usePatientImmunizations = (id: string) =>
  useQuery(orpc.patient.getImmunizations.queryOptions({ input: id }));

export const usePatientPrescriptions = (input: PatientPrescriptionsInput) =>
  useQuery(orpc.patient.getPrescriptions.queryOptions({ input }));

export const usePatientLabOrders = (input: PatientLabOrdersInput) =>
  useQuery(orpc.patient.getLabOrders.queryOptions({ input }));

// ============================================================================
// Mutations
// ============================================================================

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.patient.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.patient.key() });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.patient.update.mutationOptions(),
    onMutate: async (data) => {
      const key = orpc.patient.getById.key({ input: data.id });

      await queryClient.cancelQueries({ queryKey: key });
      const previousPatient = queryClient.getQueryData(key);

      queryClient.setQueryData(key, data);

      return { previousPatient };
    },
    onError: (_error, data, context) => {
      if (context?.previousPatient) {
        queryClient.setQueryData(
          orpc.patient.getById.key({ input: data.id }),
          context.previousPatient
        );
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orpc.patient.key() });
      queryClient.invalidateQueries({
        queryKey: orpc.patient.getById.key({ input: data.id }),
      });
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.patient.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.patient.key() });
    },
  });
};
