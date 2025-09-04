// src/hooks/useNotistack.ts (or ../orders/hooks/useNotistack if that’s your path)
import { useCallback } from 'react';
import { useSnackbar, type SnackbarMessage, type OptionsObject } from 'notistack';

function extractMessage(input: unknown): string {
  if (!input) return 'A apărut o eroare';
  if (typeof input === 'string') {
    const s = input.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const obj = JSON.parse(s);
        return obj?.error ?? obj?.message ?? s;
      } catch {
        return s;
      }
    }
    return s;
  }
  if (input instanceof Error) return input.message || 'A apărut o eroare';
  if (typeof input === 'object') {
    // try common shapes
    // @ts-expect-error - best-effort
    return input.error || input.message || 'A apărut o eroare';
  }
  return String(input);
}

const useNotistack = () => {
  const { enqueueSnackbar } = useSnackbar();

  const infoNotistack = useCallback((message: SnackbarMessage, opts: OptionsObject = {}) => {
    enqueueSnackbar(extractMessage(message), { variant: 'warning', ...opts });
  }, [enqueueSnackbar]);

  const successNotistack = useCallback((message: SnackbarMessage, opts: OptionsObject = {}) => {
    enqueueSnackbar(extractMessage(message), { variant: 'success', ...opts });
  }, [enqueueSnackbar]);

  const errorNotistack = useCallback((data: unknown, opts: OptionsObject = {}) => {
    enqueueSnackbar(extractMessage(data), { variant: 'error', ...opts });
  }, [enqueueSnackbar]);

  return { infoNotistack, errorNotistack, successNotistack };
};

export default useNotistack;
