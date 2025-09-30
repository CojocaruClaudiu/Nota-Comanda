import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, MenuItem, Autocomplete
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import PaidIcon from '@mui/icons-material/Paid';
import PersonIcon from '@mui/icons-material/Person';
import NotesIcon from '@mui/icons-material/Notes';

import useNotistack from '../orders/hooks/useNotistack';
import { api } from '../../api/axios';
import { updateCashEntry } from '../../api/cash'; // make sure this exists in your API layer

// Types you likely already have in your project
export interface CashEntry {
  id: string;
  effectiveAt: string; // ISO
  type: 'IN' | 'OUT';
  amount: number;
  employee?: { id: string; name: string } | null;
  notes?: string | null;
}

export interface CashEntryPayload {
  effectiveAt: string;         // ISO
  type: 'IN' | 'OUT';
  amount: number;
  employeeId?: string | null;
  notes?: string | null;
}

interface EditCashEntryModalProps {
  open: boolean;
  entry: CashEntry | null;
  onClose: () => void;
  onUpdated: (entry: CashEntry) => void;
}

/** Validation */
const schema = Yup.object({
  effectiveAt: Yup.string()
    .required('Data este obligatorie'),
  type: Yup.mixed<'IN' | 'OUT'>()
    .oneOf(['IN', 'OUT'], 'Tip invalid')
    .required('Tipul este obligatoriu'),
  amount: Yup.number()
    .typeError('Introduceți o sumă validă')
    .moreThan(0, 'Suma trebuie să fie > 0')
    .required('Suma este obligatorie'),
  employeeId: Yup.string().nullable(),
  notes: Yup.string().max(500, 'Maxim 500 caractere').nullable(),
});

const toIso = (dateStr: string) => {
  if (!dateStr) return '';
  // Accept YYYY-MM-DD and convert to midnight UTC ISO to avoid TZ surprises
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr + 'T00:00:00Z').toISOString();
  return new Date(dateStr).toISOString();
};

const fromIsoToYyyyMmDd = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const EditCashEntryModal: React.FC<EditCashEntryModalProps> = ({
  open,
  entry,
  onClose,
  onUpdated,
}) => {
  const { successNotistack, errorNotistack } = useNotistack();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Load employees (same endpoint you already use elsewhere)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setEmpLoading(true);
        const { data } = await api.get('/employees');
        if (mounted) setEmployees(data || []);
      } catch {
        // ignore silently; Autocomplete will just be empty
      } finally {
        if (mounted) setEmpLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const initialValues = useMemo(() => {
    if (!entry) {
      return {
        effectiveAt: '',
        type: 'IN' as 'IN' | 'OUT',
        amount: 0,
        employeeId: null as string | null,
        notes: '',
      };
    }
    return {
      effectiveAt: fromIsoToYyyyMmDd(entry.effectiveAt),
      type: entry.type,
      amount: entry.amount ?? 0,
      employeeId: entry.employee?.id ?? null,
      notes: entry.notes ?? '',
    };
  }, [entry]);

  const handleSubmit = async (values: Yup.InferType<typeof schema>) => {
    if (!entry) return;
    try {
      setSaving(true);
      const payload: CashEntryPayload = {
        effectiveAt: toIso(values.effectiveAt),
        type: values.type,
        amount: Number(values.amount),
        employeeId: values.employeeId || null,
        notes: values.notes || null,
      };
      const updated = await updateCashEntry(entry.id, payload);
      onUpdated(updated);
      successNotistack('Înregistrarea a fost actualizată cu succes!');
      onClose();
    } catch (e: any) {
      errorNotistack(e?.response?.data?.error || e?.message || 'Nu am putut actualiza înregistrarea');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={schema}
      onSubmit={handleSubmit}
      enableReinitialize
      key={entry?.id || 'none'}
    >
      {({ errors, touched, values, setFieldValue, isValid, dirty }) => (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            },
          }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form>
            {/* Header — same gradient & icon language */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EditIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">
                    Editează Înregistrare Casă
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Modifică detaliile pentru înregistrarea din {entry ? new Date(entry.effectiveAt).toLocaleDateString('ro-RO') : '—'}
                  </Typography>
                </Box>
              </Stack>

              <IconButton
                onClick={handleClose}
                disabled={saving}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Content */}
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* Required */}
                  <Box>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                    >
                      <SwapVertIcon color="primary" />
                      Informații Obligatorii
                    </Typography>
                    <Stack spacing={2.5}>
                      {/* Date */}
                      <Field name="effectiveAt">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Data"
                            type="date"
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            error={touched.effectiveAt && !!errors.effectiveAt}
                            helperText={touched.effectiveAt && errors.effectiveAt}
                            InputProps={{
                              startAdornment: <EventIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      </Field>

                      {/* Type */}
                      <Field name="type">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            select
                            label="Tip"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.type && !!errors.type}
                            helperText={touched.type && (errors.type as any)}
                            InputProps={{
                              startAdornment: <SwapVertIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          >
                            <MenuItem value="IN">Intrare</MenuItem>
                            <MenuItem value="OUT">Ieșire</MenuItem>
                          </TextField>
                        )}
                      </Field>

                      {/* Amount */}
                      <Field name="amount">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Sumă (RON)"
                            type="number"
                            required
                            fullWidth
                            variant="outlined"
                            inputProps={{ step: '0.01', min: '0.01' }}
                            error={touched.amount && !!errors.amount}
                            helperText={touched.amount && errors.amount}
                            InputProps={{
                              startAdornment: <PaidIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange({
                                target: { name: field.name, value: val === '' ? '' : Number(val) },
                              });
                            }}
                          />
                        )}
                      </Field>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Optional */}
                  <Box>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                    >
                      <PersonIcon color="secondary" />
                      Detalii Opționale
                    </Typography>

                    <Stack spacing={2.5}>
                      {/* Employee (Autocomplete) */}
                      <Autocomplete
                        options={employees}
                        loading={empLoading}
                        getOptionLabel={(o) => o.name}
                        value={employees.find((e) => e.id === values.employeeId) || null}
                        onChange={(_e, val) => setFieldValue('employeeId', val?.id || null)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Angajat"
                            fullWidth
                            variant="outlined"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <PersonIcon sx={{ color: 'action.active', mr: 1 }} />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      />

                      {/* Notes */}
                      <Field name="notes">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Notițe"
                            placeholder="Detalii despre înregistrare"
                            fullWidth
                            multiline
                            minRows={2}
                            variant="outlined"
                            error={touched.notes && !!errors.notes}
                            helperText={touched.notes && (errors.notes as any)}
                            InputProps={{
                              startAdornment: <NotesIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      </Field>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </DialogContent>

            {/* Actions */}
            <Box
              sx={{
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderColor: 'divider',
                p: 3,
              }}
            >
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={handleClose}
                  disabled={saving}
                  variant="outlined"
                  size="large"
                  sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || !dirty || saving}
                  variant="contained"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e084ea 0%, #e4495a 100%)',
                    },
                  }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {saving ? 'Se salvează...' : 'Salvează modificările'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default EditCashEntryModal;
