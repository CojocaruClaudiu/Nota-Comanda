// src/modules/team/AddLeaveModal.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, Chip, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotesIcon from '@mui/icons-material/Notes';
import InfoIcon from '@mui/icons-material/Info';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';

import { addLeave, type LeavePayload, type EmployeeWithStats } from '../../api/employees';
import { businessEndDate, businessDatesForLeave } from '../../utils/businessDays';
import { generateLeaveDocx } from '../../utils/leaveDocs';
import useNotistack from '../orders/hooks/useNotistack';

dayjs.locale('ro');

interface AddLeaveModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeWithStats | null;
  onLeaveAdded: () => void;
}

// Weekend helpers
const isWeekend = (d: dayjs.Dayjs) => d.day() === 0 || d.day() === 6;
const nextBusinessDay = (d: dayjs.Dayjs) => {
  let cur = d.startOf('day');
  while (isWeekend(cur)) cur = cur.add(1, 'day');
  return cur;
};
const toIsoDate = (d: Dayjs | null) => (d && d.isValid() ? d.format('YYYY-MM-DD') : '');

// Validation schema
const validationSchema = Yup.object({
  startDate: Yup.string()
    .required('Data de început este obligatorie')
    .test('is-valid-date', 'Data nu este validă', (value) => !!value && dayjs(value).isValid())
    .test('not-weekend', 'Data nu poate fi în weekend', (value) => {
      if (!value) return false;
      const d = dayjs(value);
      return d.isValid() && !isWeekend(d);
    }),
  days: Yup.number()
    .required('Numărul de zile este obligatoriu')
    .min(1, 'Trebuie să fie cel puțin o zi')
    .max(365, 'Nu poate depăși 365 de zile')
    .integer('Trebuie să fie un număr întreg'),
  note: Yup.string().max(500, 'Nota nu poate avea mai mult de 500 caractere').nullable(),
});

// Initial values
const initialValues: LeavePayload = {
  startDate: '',
  days: 1,
  note: '',
};

const TRANSITION_MS = 250;

export const AddLeaveModal: React.FC<AddLeaveModalProps> = ({ 
  open,
  onClose,
  employee,
  onLeaveAdded
}) => {
  const [saving, setSaving] = useState(false);
  const [startMsg, setStartMsg] = useState<string>('');

  // Snapshot employee to keep content stable during the close animation
  const [renderEmployee, setRenderEmployee] = useState<EmployeeWithStats | null>(null);

  const { successNotistack, errorNotistack } = useNotistack();

  // ref to call Formik reset AFTER fade-out
  const resetFormRef = useRef<null | (() => void)>(null);

  // Capture employee when opening to avoid content disappearing mid-fade
  useEffect(() => {
    if (open && employee) setRenderEmployee(employee);
  }, [open, employee]);

  const handleSubmit = async (values: LeavePayload) => {
    if (!renderEmployee) return;
    try {
      setSaving(true);

      await addLeave(renderEmployee.id, values);

      // Generate and download .docx
      await generateLeaveDocx({
        employeeName: renderEmployee.name,
        cnp: (renderEmployee as any).cnp,
        county: (renderEmployee as any).county,
        locality: (renderEmployee as any).locality,
        address: (renderEmployee as any).address,
        idSeries: (renderEmployee as any).idSeries,
        idNumber: (renderEmployee as any).idNumber,
        idIssuer: (renderEmployee as any).idIssuer,
        idIssueDateISO: (renderEmployee as any).idIssueDateISO,
        startISO: values.startDate,
        days: values.days,
        note: values.note,
        companyName: 'S.C. TOPAZ CONSTRUCT S.R.L.',
        companyCity: 'Băicoi',
      });

      onLeaveAdded();

      // Trigger close; cleanup will run in TransitionProps.onExited
      onClose();

      successNotistack('Concediu înregistrat. Am generat și descărcat cererea Word.');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut înregistra concediul';
      errorNotistack(msg);
    } finally {
      setSaving(false);
    }
  };

  // Do not reset local state here; wait for onExited to avoid flicker
  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [saving, onClose]);

  // Date change with weekend awareness
  const handleDateChange = useCallback((onChange: (value: string) => void) => (d: Dayjs | null) => {
    if (!d || !d.isValid()) {
      onChange('');
      setStartMsg('');
    } else if (isWeekend(d)) {
      const nd = nextBusinessDay(d);
      onChange(nd.format('YYYY-MM-DD'));
      setStartMsg(`Am mutat începutul pe ${nd.format('DD/MM/YYYY')} (weekend ignorat)`);
    } else {
      onChange(toIsoDate(d));
      setStartMsg('');
    }
  }, []);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ errors, touched, isValid, dirty, values, setFieldValue, resetForm }) => {
        // expose reset to onExited
        resetFormRef.current = () => resetForm();

        // preview data
        const previewEnd = useMemo(() => {
          return values.startDate && values.days
            ? businessEndDate(values.startDate, values.days)
            : null;
        }, [values.startDate, values.days]);

        const businessDaysCount = useMemo(() => {
          return values.startDate && values.days
            ? businessDatesForLeave(values.startDate, values.days).length
            : 0;
        }, [values.startDate, values.days]);

        return (
          <Dialog 
            open={open} 
            onClose={handleClose} 
            fullWidth 
            maxWidth="md"
            keepMounted
            disableScrollLock
            // These reduce focus-jank and layout shifts on close
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
            BackdropProps={{ transitionDuration: TRANSITION_MS }}
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                // GPU & paint stabilization
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                willChange: 'opacity, transform',
              }
            }}
            TransitionComponent={Fade}
            transitionDuration={TRANSITION_MS}
            TransitionProps={{
              onExited: () => {
                // cleanup only AFTER fade-out to prevent close flicker
                setStartMsg('');
                resetFormRef.current?.();
                setRenderEmployee(null);
              }
            }}
          >
            <Form>
              {/* Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  color: 'white',
                  p: 3,
                  position: 'relative'
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
                      justifyContent: 'center'
                    }}
                  >
                    <EventAvailableIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="600">
                      Adaugă Concediu Plătit
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                      {renderEmployee ? `Pentru ${renderEmployee.name}` : 'Completează informațiile concediului'}
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
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Content */}
              <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {/* Employee Info Section */}
                    {renderEmployee && (
                      <>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          <Typography variant="body2">
                            <strong>Angajat:</strong> {renderEmployee.name} •{' '}
                            <strong>Drept anual:</strong> {renderEmployee.entitledDays} zile •{' '}
                            <strong>Folosite:</strong> {renderEmployee.takenDays} zile •{' '}
                            <strong>Rămase:</strong> {renderEmployee.remainingDays} zile
                          </Typography>
                        </Alert>
                        <Divider />
                      </>
                    )}

                    {/* Leave Details Section */}
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CalendarTodayIcon color="primary" />
                        Detalii Concediu
                      </Typography>
                      <Stack spacing={2.5}>
                        <Field name="startDate">
                          {({ field }: any) => (
                            <DatePicker
                              label="Data început"
                              format="DD/MM/YYYY"
                              value={field.value ? dayjs(field.value) : null}
                              onChange={handleDateChange((value) => setFieldValue('startDate', value))}
                              shouldDisableDate={(d) => !d || isWeekend(d)}
                              slotProps={{
                                textField: {
                                  required: true,
                                  fullWidth: true,
                                  variant: 'outlined',
                                  error: touched.startDate && !!errors.startDate,
                                  helperText: (touched.startDate && errors.startDate) || startMsg || 'Weekendurile sunt dezactivate automat',
                                  InputProps: {
                                    startAdornment: <CalendarTodayIcon sx={{ color: 'action.active', mr: 1 }} />,
                                  },
                                  sx: {
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    }
                                  }
                                }
                              }}
                            />
                          )}
                        </Field>

                        <Field name="days">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Număr zile (zile lucrătoare)"
                              type="number"
                              required
                              fullWidth
                              variant="outlined"
                              inputProps={{ min: 1, max: 365, step: 1 }}
                              error={touched.days && !!errors.days}
                              helperText={touched.days && errors.days}
                              InputProps={{
                                startAdornment: <AccessTimeIcon sx={{ color: 'action.active', mr: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                        </Field>

                        <Field name="note">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Notă (opțional)"
                              placeholder="Ex: Concediu de odihnă, Concediu medical, etc."
                              multiline
                              rows={3}
                              fullWidth
                              variant="outlined"
                              error={touched.note && !!errors.note}
                              helperText={touched.note && errors.note}
                              InputProps={{
                                startAdornment: <NotesIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                        </Field>
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Preview Section */}
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <InfoIcon color="secondary" />
                        Previzualizare Concediu
                      </Typography>
                      
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip
                          label={`Se încheie pe: ${previewEnd ? dayjs(previewEnd).format('DD/MM/YYYY') : '—'}`}
                          variant="outlined"
                          color="primary"
                        />
                        {values.startDate && values.days ? (
                          <Chip
                            label={`Acoperă ${businessDaysCount} zile lucrătoare`}
                            variant="outlined"
                            color="success"
                          />
                        ) : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        * Zilele din weekend nu se contorizează. Se acumulează zilnic, pro-rata.
                        <br />
                        * Se va genera automat un document Word cu cererea de concediu.
                      </Typography>
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
                  p: 3
                }}
              >
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    onClick={handleClose}
                    disabled={saving}
                    variant="outlined"
                    size="large"
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Anulează
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isValid || !dirty || saving || !renderEmployee}
                    variant="contained"
                    size="large"
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%)',
                      }
                    }}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EventAvailableIcon />}
                  >
                    {saving ? 'Se salvează...' : 'Adaugă Concediu'}
                  </Button>
                </Stack>
              </Box>
            </Form>
          </Dialog>
        );
      }}
    </Formik>
  );
};

export default AddLeaveModal;
