// src/modules/team/hooks/useLeavePolicy.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeavePolicy,
  updateLeavePolicy,
  createBlackoutPeriod,
  updateBlackoutPeriod,
  deleteBlackoutPeriod,
  createCompanyShutdown,
  updateCompanyShutdown,
  deleteCompanyShutdown,
  type LeavePolicy,
  type LeavePolicyUpdatePayload,
  type BlackoutPeriodPayload,
  type CompanyShutdownPayload,
} from '../../../api/leavePolicy';
import useNotistack from '../../orders/hooks/useNotistack';

const LEAVE_POLICY_KEY = ['leave-policy'];

export const useLeavePolicy = () => {
  return useQuery({
    queryKey: LEAVE_POLICY_KEY,
    queryFn: getLeavePolicy,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
};

export const useUpdateLeavePolicy = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LeavePolicyUpdatePayload }) =>
      updateLeavePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      successNotistack('Politica de concedii a fost actualizată cu succes');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut actualiza politica');
    },
  });
};

// Blackout Periods
export const useCreateBlackoutPeriod = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: BlackoutPeriodPayload }) =>
      createBlackoutPeriod(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      successNotistack('Perioada blackout a fost adăugată cu succes');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut adăuga perioada blackout');
    },
  });
};

export const useUpdateBlackoutPeriod = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BlackoutPeriodPayload> }) =>
      updateBlackoutPeriod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      successNotistack('Perioada blackout a fost actualizată');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut actualiza perioada blackout');
    },
  });
};

export const useDeleteBlackoutPeriod = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: (id: string) => deleteBlackoutPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      successNotistack('Perioada blackout a fost ștearsă');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut șterge perioada blackout');
    },
  });
};

// Company Shutdowns
export const useCreateCompanyShutdown = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: CompanyShutdownPayload }) =>
      createCompanyShutdown(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh employee table
      successNotistack('Închiderea firmei a fost adăugată cu succes');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut adăuga închiderea firmei');
    },
  });
};

export const useUpdateCompanyShutdown = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyShutdownPayload> }) =>
      updateCompanyShutdown(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh employee table
      successNotistack('Închiderea firmei a fost actualizată');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut actualiza închiderea firmei');
    },
  });
};

export const useDeleteCompanyShutdown = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: (id: string) => deleteCompanyShutdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Refresh employee table
      successNotistack('Închiderea firmei a fost ștearsă');
    },
    onError: (error: Error) => {
      errorNotistack(error.message || 'Nu am putut șterge închiderea firmei');
    },
  });
};
