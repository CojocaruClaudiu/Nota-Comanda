import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  IconButton,
  Typography,
  Box,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export type ConfirmOptions = {
  title?: string; // header title (e.g., "Confirmare Ștergere")
  bodyTitle?: string; // content heading (e.g., "Ești sigur că vrei să ...?")
  description?: React.ReactNode; // detailed description, can be JSX
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // if true, use red/danger styling
};

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }>
  = ({ children }) => {
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  resolverRef.current?.(false);
  resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
  resolverRef.current?.(true);
  resolverRef.current = null;
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  const danger = !!opts.danger;
  const headerGradient = danger
    ? 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    : 'linear-gradient(135deg, #90caf9 0%, #e3f2fd 100%)';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' } }}
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <Box sx={{ background: headerGradient, color: 'white', p: 3, position: 'relative' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {danger ? <WarningAmberIcon fontSize="large" /> : <DeleteIcon fontSize="large" />}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="600">{opts.title ?? 'Confirmare'}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {danger ? 'Această acțiune nu poate fi anulată' : 'Confirmă acțiunea'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <DeleteIcon sx={{ fontSize: 80, color: danger ? 'error.main' : 'primary.main', mb: 2, opacity: 0.7 }} />
            <Typography variant="h6" gutterBottom>
              {opts.bodyTitle ?? 'Ești sigur?'}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
              {opts.description ?? ''}
            </Typography>
            {danger && (
              <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                Această acțiune nu poate fi anulată!
              </Typography>
            )}
          </Box>
        </DialogContent>

        <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button onClick={handleClose} variant="outlined" size="large" sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 500, minWidth: 120 }}>
              {opts.cancelText ?? 'Anulează'}
            </Button>
            <Button onClick={handleConfirm} variant="contained" color={danger ? 'error' : 'primary'} size="large" sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, minWidth: 120 }}>
              {opts.confirmText ?? 'Confirmă'}
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
