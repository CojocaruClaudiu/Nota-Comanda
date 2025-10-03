// src/modules/team/hooks/useEmployees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeWithStats,
  type EmployeePayload,
} from '../../../api/employees';
import useNotistack from '../../orders/hooks/useNotistack';

const EMPLOYEES_QUERY_KEY = ['employees'];

/**
 * Hook for fetching employees with React Query
 */
export const useEmployees = () => {
  return useQuery({
    queryKey: EMPLOYEES_QUERY_KEY,
    queryFn: getEmployees,
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 5 * 60 * 1000,         // 5 minutes (formerly cacheTime)
    retry: 2,
  });
};

/**
 * Hook for creating an employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: (data: EmployeePayload) => createEmployee(data),
    onMutate: async (newEmployee) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: EMPLOYEES_QUERY_KEY });

      // Snapshot previous value
      const previousEmployees = queryClient.getQueryData<EmployeeWithStats[]>(EMPLOYEES_QUERY_KEY);

      // Optimistically update
      if (previousEmployees) {
        queryClient.setQueryData<EmployeeWithStats[]>(EMPLOYEES_QUERY_KEY, (old) => [
          ...(old || []),
          {
            id: 'temp-' + Date.now(),
            ...newEmployee,
            entitledDays: 21,
            takenDays: 0,
            remainingDays: 21,
          } as EmployeeWithStats,
        ]);
      }

      return { previousEmployees };
    },
    onError: (error: Error, _newEmployee, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(EMPLOYEES_QUERY_KEY, context.previousEmployees);
      }
      errorNotistack(error.message || 'Nu am putut adăuga angajatul');
    },
    onSuccess: () => {
      successNotistack('Angajat adăugat cu succes');
    },
    onSettled: () => {
      // Refetch to get accurate data
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};

/**
 * Hook for updating an employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeePayload }) => updateEmployee(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: EMPLOYEES_QUERY_KEY });

      const previousEmployees = queryClient.getQueryData<EmployeeWithStats[]>(EMPLOYEES_QUERY_KEY);

      // Optimistic update
      if (previousEmployees) {
        queryClient.setQueryData<EmployeeWithStats[]>(EMPLOYEES_QUERY_KEY, (old) =>
          (old || []).map((emp) =>
            emp.id === id ? { ...emp, ...data } : emp
          )
        );
      }

      return { previousEmployees };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(EMPLOYEES_QUERY_KEY, context.previousEmployees);
      }
      errorNotistack(error.message || 'Nu am putut actualiza angajatul');
    },
    onSuccess: () => {
      successNotistack('Angajat actualizat cu succes');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};

/**
 * Hook for deleting an employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { successNotistack, errorNotistack } = useNotistack();

  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: EMPLOYEES_QUERY_KEY });

      const previousEmployees = queryClient.getQueryData<EmployeeWithStats[]>(EMPLOYEES_QUERY_KEY);

      // Optimistic delete
      if (previousEmployees) {
        queryClient.setQueryData<EmployeeWithStats[]>(
          EMPLOYEES_QUERY_KEY,
          (old) => (old || []).filter((emp) => emp.id !== id)
        );
      }

      return { previousEmployees };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(EMPLOYEES_QUERY_KEY, context.previousEmployees);
      }
      errorNotistack(error.message || 'Nu am putut șterge angajatul');
    },
    onSuccess: () => {
      successNotistack('Angajat șters cu succes');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};
