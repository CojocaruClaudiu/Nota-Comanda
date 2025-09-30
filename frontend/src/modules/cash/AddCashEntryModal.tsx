import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, IconButton, Typography, Box, Stack, TextField, Button, CircularProgress,
  Checkbox, FormControlLabel, Autocomplete, Fade, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
dayjs.locale('ro');
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
// NoteAltIcon removed (not used)
import PersonIcon from '@mui/icons-material/Person';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import * as Yup from 'yup';
import { Formik, Form, Field } from 'formik';
import { createCashEntry } from '../../api/cash';
import useNotistack from '../orders/hooks/useNotistack';
import { api } from '../../api/axios';

export interface AddCashEntryModalProps {
  open: boolean;
  onClose: () => void;
  cashAccountId: string | undefined;
  type: 'IN' | 'OUT';
  onCreated?: (entry: any) => void;
  /** Optional override creation function; if omitted default API is used */
  onCreate?: (payload: any) => Promise<any>;
}

interface FormValues {
  effectiveAt: string;
  amount: number | '';
  type: 'IN' | 'OUT';
  employeeId?: string | null;
  notes?: string | null;
  overrideNegative?: boolean;
}

const validationSchema = Yup.object({
  effectiveAt: Yup.string().required('Data este obligatorie'),
  amount: Yup.number().typeError('Introdu o sumă').positive('Suma trebuie să fie > 0').required('Suma este obligatorie'),
  type: Yup.mixed<'IN' | 'OUT'>().oneOf(['IN', 'OUT']).required(),
  notes: Yup.string().max(500, 'Maxim 500 caractere').nullable(),
  employeeId: Yup.string().nullable(),
  overrideNegative: Yup.boolean().optional(),
});

const todayStr = () => new Date().toISOString().slice(0, 10);

function toIso(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr + 'T00:00:00Z').toISOString();
  return new Date(dateStr).toISOString();
}

export const AddCashEntryModal: React.FC<AddCashEntryModalProps> = ({
  open,
  onClose,
  cashAccountId,
  type,
  onCreated,
  onCreate,
}) => {
  const { successNotistack, errorNotistack } = useNotistack();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);

  // Lazy load employees when opening
  React.useEffect(() => {
    if (open && !employeesLoaded) {
      api.get('/employees')
        .then(r => { setEmployees((r.data as any[] || []).map(e => ({ id: e.id, name: e.name })) ); setEmployeesLoaded(true); })
        .catch(() => setEmployeesLoaded(true));
    }
  }, [open, employeesLoaded]);

  const initialValues: FormValues = useMemo(() => ({
    effectiveAt: todayStr(),
    amount: '' as any,
    type,
    employeeId: null,
    notes: '',
    overrideNegative: false,
  }), [type]);

  // gradient & icon now derived dynamically from form values (see inside render)

  // Local date picker field to avoid resetting while the user types.
  const DatePickerField: React.FC<{ value: string; onCommit: (isoDate: string) => void; error?: string | boolean; }> = ({ value, onCommit, error }) => {
    const [local, setLocal] = useState<any>(value ? dayjs(value) : null);
    // sync when external value changes (e.g., reset)
    React.useEffect(() => {
      setLocal(value ? dayjs(value) : null);
    }, [value]);

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
        <DatePicker
          value={local}
          onChange={(v: any) => setLocal(v)}
          onAccept={(v: any) => { if (v && v.isValid && v.isValid()) onCommit(v.format('YYYY-MM-DD')); }}
          onClose={() => { if (local && local.isValid && local.isValid()) onCommit(local.format('YYYY-MM-DD')); }}
          slotProps={{
            textField: {
              required: true,
              fullWidth: true,
              error: !!error,
              helperText: error || undefined,
            }
          }}
        />
      </LocalizationProvider>
    );
  };

  const handleSubmit = async (values: FormValues, helpers: any) => {
    if (!cashAccountId) return;
    try {
      setSaving(true);
      const payload = {
        cashAccountId,
        effectiveAt: toIso(values.effectiveAt),
        type: values.type,
        amount: Number(values.amount),
        notes: values.notes || null,
        employeeId: values.employeeId || null,
        overrideNegative: values.type === 'OUT' ? values.overrideNegative : undefined,
      };
      const fn = onCreate || createCashEntry;
  const created = await fn(payload);
  // If the modal used the internal API (no onCreate passed), show notifications here.
  if (!onCreate) successNotistack('Înregistrare adăugată');
  onCreated?.(created);
      helpers.resetForm();
      onClose();
    } catch (e: any) {
      // If the parent is handling creation (onCreate provided), let parent show errors; otherwise notify here.
      if (!onCreate) errorNotistack(e?.response?.data?.error || 'Eroare salvare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Formik initialValues={initialValues} enableReinitialize validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ values, setFieldValue, errors, touched, isValid, dirty }) => (
        <Dialog open={open} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }} TransitionComponent={Fade} transitionDuration={300}>
          <Form>
            {(() => { const currentGradient = values.type === 'IN' ? 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)' : 'linear-gradient(135deg, #d32f2f 0%, #9a0007 100%)';
              const currentIcon = values.type === 'IN' ? <NorthEastIcon fontSize="large" /> : <SouthWestIcon fontSize="large" />; return (
            /* Header */
            <Box sx={{ background: currentGradient, color: 'white', p: 3, position: 'relative' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', p: 1.5, display: 'flex' }}>
                  {currentIcon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {values.type === 'IN' ? 'Intrare numerar' : 'Ieșire numerar'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Completează detaliile înregistrării de casă
                  </Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => { if (!saving) onClose(); }} disabled={saving} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                <CloseIcon />
              </IconButton>
            </Box> ); })()}

            {/* Content */}
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* Type & Basics */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <AccountBalanceWalletIcon color="primary" />
                      Detalii înregistrare
                    </Typography>
                    <Stack spacing={2.5}>
                      <ToggleButtonGroup size="small" value={values.type} exclusive onChange={(_, v) => v && setFieldValue('type', v)}>
                        <ToggleButton value="IN">Intrare</ToggleButton>
                        <ToggleButton value="OUT">Ieșire</ToggleButton>
                      </ToggleButtonGroup>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Field name="effectiveAt">
                          {({ field }: any) => (
                            <DatePickerField
                              value={field.value}
                              onCommit={(iso) => setFieldValue('effectiveAt', iso)}
                              error={touched.effectiveAt && errors.effectiveAt}
                            />
                          )}
                        </Field>
                        <Field name="amount">
                          {({ field }: any) => (
                            <TextField {...field} label="Sumă (RON)" required type="number" inputProps={{ step: '0.01', min: 0 }} fullWidth error={touched.amount && !!errors.amount} helperText={touched.amount && errors.amount} />
                          )}
                        </Field>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Removed separator as requested */}

                  {/* Optional fields merged in main content, no separation */}
                  <Autocomplete
                    size="small"
                    options={employees}
                    loading={!employeesLoaded && open}
                    getOptionLabel={(o) => o.name}
                    value={employees.find(e => e.id === values.employeeId) || null}
                    onChange={(_e, v) => setFieldValue('employeeId', v?.id || null)}
                    renderInput={(params) => <TextField {...params} label="Angajat" InputProps={{ ...params.InputProps, startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} /> }} />} />
                  <Field name="notes">
                    {({ field }: any) => (
                      <TextField {...field} label="Notițe" multiline minRows={2} fullWidth error={touched.notes && !!errors.notes} helperText={touched.notes && errors.notes} />
                    )}
                  </Field>
                  {values.type === 'OUT' && (
                    <FormControlLabel control={<Checkbox checked={values.overrideNegative || false} onChange={e => setFieldValue('overrideNegative', e.target.checked)} />} label="Permite sold negativ" />
                  )}
                </Stack>
              </Box>
            </DialogContent>

            {/* Actions */}
      {(() => { const currentGradient = values.type === 'IN' ? 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)' : 'linear-gradient(135deg, #d32f2f 0%, #9a0007 100%)'; return (
      <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={() => { if (!saving) onClose(); }} disabled={saving} variant="outlined" size="large" sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}>Anulează</Button>
        <Button type="submit" disabled={!isValid || !dirty || saving || !cashAccountId} variant="contained" size="large" sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, background: currentGradient, '&:hover': { background: currentGradient } }} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : (values.type === 'IN' ? <NorthEastIcon /> : <SouthWestIcon />)}>
                  {saving ? 'Se salvează...' : 'Salvează'}
                </Button>
              </Stack>
      </Box> ); })()}
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default AddCashEntryModal;
