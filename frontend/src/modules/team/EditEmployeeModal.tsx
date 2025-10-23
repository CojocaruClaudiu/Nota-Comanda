// src/modules/team/EditEmployeeModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, Collapse, InputAdornment, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import { updateEmployee, type EmployeeWithStats, type EmployeePayload, type Employee } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';

interface EditEmployeeModalProps {
  open: boolean;
  employee: EmployeeWithStats | null;
  onClose: () => void;
  onEmployeeUpdated: (employee: Employee) => void;
}

// Validation schema
const validationSchema = Yup.object({
  name: Yup.string()
    .required('Numele este obligatoriu')
    .min(2, 'Numele trebuie să aibă cel puțin 2 caractere')
    .max(100, 'Numele nu poate avea mai mult de 100 caractere')
    .matches(/^[a-zA-ZăâîșțĂÎȘȚ\s\-\.]+$/, 'Numele poate conține doar litere, spații, cratime și puncte'),
  hiredAt: Yup.string()
    .required('Data angajării este obligatorie'),
  cnp: Yup.string()
    .matches(/^[0-9]{13}$/, 'CNP-ul trebuie să aibă exact 13 cifre')
    .nullable(),
  phone: Yup.string()
    .matches(/^(\+40|0)7\d{8}$/, 'Numărul de telefon trebuie să fie valid (ex: 0722123456)')
    .nullable(),
  idSeries: Yup.string()
    .matches(/^[A-Z]{2,3}$/, 'Seria CI trebuie să aibă 2-3 litere mari')
    .nullable(),
  idNumber: Yup.string()
    .matches(/^\d{6}$/, 'Numărul CI trebuie să aibă exact 6 cifre')
    .nullable(),
  birthDate: Yup.string().nullable(),
  idIssueDateISO: Yup.string().nullable(),
});

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  open,
  employee,
  onClose,
  onEmployeeUpdated
}) => {
  const [updating, setUpdating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Get initial values based on employee
  const getInitialValues = (): EmployeePayload & { qualificationsText: string } => {
    if (employee) {
      return {
        name: employee.name,
        hiredAt: employee.hiredAt,
        cnp: employee.cnp ?? '',
        birthDate: employee.birthDate ?? '',
        phone: employee.phone ?? '',
        qualifications: employee.qualifications ?? [],
        qualificationsText: (employee.qualifications ?? []).join(', '),
        idSeries: employee.idSeries ?? '',
        idNumber: employee.idNumber ?? '',
        idIssuer: employee.idIssuer ?? '',
        idIssueDateISO: employee.idIssueDateISO ?? '',
        county: employee.county ?? '',
        locality: employee.locality ?? '',
        address: employee.address ?? '',
      };
    }
    return {
      name: '',
      hiredAt: '',
      cnp: '',
      birthDate: '',
      phone: '',
      qualifications: [],
      qualificationsText: '',
      idSeries: '',
      idNumber: '',
      idIssuer: '',
      idIssueDateISO: '',
      county: '',
      locality: '',
      address: '',
    };
  };

  const handleSubmit = async (values: any) => {
    if (!employee) return;

    try {
      setUpdating(true);

      // Parse qualifications from text
      const qualifications = values.qualificationsText
        .split(',')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0);

      const payload: EmployeePayload = {
        name: values.name.trim(),
        hiredAt: values.hiredAt,
        cnp: values.cnp || undefined,
        birthDate: values.birthDate || undefined,
        phone: values.phone || undefined,
        qualifications: qualifications.length > 0 ? qualifications : undefined,
        idSeries: values.idSeries || undefined,
        idNumber: values.idNumber || undefined,
        idIssuer: values.idIssuer || undefined,
        idIssueDateISO: values.idIssueDateISO || undefined,
        county: values.county || undefined,
        locality: values.locality || undefined,
        address: values.address || undefined,
      };

      const updated = await updateEmployee(employee.id, payload);
      onEmployeeUpdated(updated);
      handleClose();
      successNotistack('Angajatul a fost actualizat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut actualiza angajatul';
      errorNotistack(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (updating) return;
    setShowAdvanced(false);
    onClose();
  };

  // Utility functions
  const ageFromBirth = (birthDate?: string | null): number | null => {
    if (!birthDate) return null;
    return dayjs().diff(dayjs(birthDate), 'year');
    };
  const tenureParts = (hiredAt?: string) => {
    if (!hiredAt) return { years: 0, months: 0 };
    const hired = dayjs(hiredAt);
    const now = dayjs();
    const years = now.diff(hired, 'year');
    const months = now.diff(hired.add(years, 'year'), 'month');
    return { years, months };
  };
  const formatTenureRo = ({ years, months }: { years: number; months: number }): string => {
    if (years === 0 && months === 0) return 'nou angajat';
    if (years === 0) return `${months} luni`;
    if (months === 0) return `${years} ani`;
    return `${years} ani, ${months} luni`;
  };

  return (
    <Formik
      initialValues={getInitialValues()}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      key={employee?.id || 'none'} // Reset form when employee changes
    >
      {({ errors, touched, isValid, dirty, values, setFieldValue }) => (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
          fullScreen={fullScreen}
          scroll="paper"
          // Prevent body scrollbar from being removed (stops layout jump)
          disableScrollLock
          keepMounted
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: { xs: '100dvh', md: '90vh' },
            }
          }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form style={{ display: 'contents' }}>
            {/* Header (sticky) */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                p: { xs: 2, md: 3 },
                position: 'sticky',
                top: 0,
                zIndex: 1,
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
                  <EditIcon fontSize="large" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant={fullScreen ? 'h6' : 'h5'} fontWeight="600" noWrap>
                    Editează Angajat
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }} noWrap>
                    Modifică informațiile angajatului: {employee?.name}
                  </Typography>
                </Box>
              </Stack>

              <IconButton
                onClick={handleClose}
                disabled={updating}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
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

            {/* Content (scrolls) */}
            <DialogContent sx={{ p: 0, flex: 1, overflow: 'auto' }}>
              <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={3}>
                  {/* Required Fields Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PersonIcon color="primary" />
                      Informații Obligatorii
                    </Typography>

                    <Stack spacing={2.5}>
                      <Field name="name">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Nume Complet"
                            placeholder="Ex: Popescu Ion Andrei"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.name && !!errors.name}
                            helperText={touched.name && errors.name}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon sx={{ color: 'action.active' }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      </Field>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Field name="cnp">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="CNP"
                              placeholder="1234567890123"
                              fullWidth
                              variant="outlined"
                              inputProps={{ maxLength: 13, inputMode: 'numeric' }}
                              error={touched.cnp && !!errors.cnp}
                              helperText={touched.cnp && errors.cnp}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <BadgeIcon sx={{ color: 'action.active' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>

                        <Field name="phone">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Telefon"
                              placeholder="Ex: 0722123456"
                              fullWidth
                              variant="outlined"
                              error={touched.phone && !!errors.phone}
                              helperText={touched.phone && errors.phone}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PhoneIcon sx={{ color: 'action.active' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <DatePicker
                          label="Data Angajării"
                          format="DD/MM/YYYY"
                          value={values.hiredAt ? dayjs(values.hiredAt) : null}
                          onChange={(date) => setFieldValue('hiredAt', date?.format('YYYY-MM-DD') || '')}
                          slotProps={{
                            textField: {
                              required: true,
                              fullWidth: true,
                              error: touched.hiredAt && !!errors.hiredAt,
                              helperText: touched.hiredAt && errors.hiredAt,
                              InputProps: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <WorkIcon sx={{ color: 'action.active' }} />
                                  </InputAdornment>
                                ),
                              },
                              sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                            }
                          }}
                        />

                        <DatePicker
                          label="Data Nașterii"
                          format="DD/MM/YYYY"
                          value={values.birthDate ? dayjs(values.birthDate) : null}
                          onChange={(date) => setFieldValue('birthDate', date?.format('YYYY-MM-DD') || '')}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: touched.birthDate && !!errors.birthDate,
                              helperText: (touched.birthDate && errors.birthDate) || 'Opțional',
                              InputProps: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PersonIcon sx={{ color: 'action.active' }} />
                                  </InputAdornment>
                                ),
                              },
                              sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                            }
                          }}
                        />
                      </Stack>

                      <Field name="qualificationsText">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Calificări"
                            placeholder="Ex: Șofer categoria B, Stivuitorist, Mecanic auto"
                            fullWidth
                            multiline
                            rows={2}
                            variant="outlined"
                            helperText="Separate prin virgulă (opțional)"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start" sx={{ alignSelf: 'flex-start' }}>
                                  <WorkIcon sx={{ color: 'action.active', mt: 1 }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      </Field>

                      {/* Live preview */}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Previzualizare
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Box component="span" sx={{
                            fontSize: '0.75rem',
                            bgcolor: 'primary.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}>
                            Vârsta: {ageFromBirth(values.birthDate) ?? '—'}
                          </Box>
                          <Box component="span" sx={{
                            fontSize: '0.75rem',
                            bgcolor: 'secondary.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}>
                            Vechime: {formatTenureRo(tenureParts(values.hiredAt))}
                          </Box>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Buletin Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <ContactMailIcon color="secondary" />
                      Buletin (Carte de Identitate)
                    </Typography>

                    {/* Advanced section toggle */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Button
                        size="small"
                        startIcon={
                          <ExpandMoreIcon
                            sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                          />
                        }
                        onClick={() => setShowAdvanced(s => !s)}
                        sx={{ textTransform: 'none', fontWeight: 500 }}
                      >
                        {showAdvanced ? 'Ascunde' : 'Arată'}
                      </Button>
                      <Typography variant="caption" color="text.secondary">(opțional)</Typography>
                    </Stack>

                    <Collapse in={showAdvanced} unmountOnExit>
                      {/* CI "Card" look */}
                      <Box
                        sx={{
                          position: 'relative',
                          borderRadius: 2,
                          p: { xs: 2, md: 3 },
                          border: '1px solid',
                          borderColor: 'divider',
                          background: 'linear-gradient(135deg, #eef6ff 0%, #ffffff 60%)',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background:
                              'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,112,243,0.05) 12px, rgba(0,112,243,0.05) 24px)',
                          },
                        }}
                      >
                        {/* top flag/bar */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 6,
                            background:
                              'linear-gradient(90deg, #002b7f 0 33%, #fcd116 33% 66%, #ce1126 66% 100%)',
                          }}
                        />

                        <Box
                          sx={{
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '140px 1fr' },
                            gap: 2.5,
                          }}
                        >
                          {/* Photo placeholder */}
                          <Box
                            sx={{
                              border: '1px dashed',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              aspectRatio: '4 / 5',
                              minHeight: 180,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              color: 'text.secondary',
                              bgcolor: 'rgba(255,255,255,0.6)',
                            }}
                          >
                            FOTO
                          </Box>

                          {/* Fields laid out like a card */}
                          <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <Field name="idSeries">
                                {({ field }: any) => (
                                  <TextField
                                    {...field}
                                    onChange={(e) => {
                                      const v = (e.target.value || '').toUpperCase();
                                      e.target.value = v;
                                      field.onChange(e);
                                    }}
                                    label="Serie"
                                    placeholder="AB"
                                    inputProps={{ maxLength: 3, style: { letterSpacing: '2px' } }}
                                    error={touched.idSeries && !!errors.idSeries}
                                    helperText={touched.idSeries && errors.idSeries}
                                    sx={{ width: { xs: '100%', sm: 120 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                  />
                                )}
                              </Field>
                              <Field name="idNumber">
                                {({ field }: any) => (
                                  <TextField
                                    {...field}
                                    label="Număr"
                                    placeholder="123456"
                                    inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                                    error={touched.idNumber && !!errors.idNumber}
                                    helperText={touched.idNumber && errors.idNumber}
                                    sx={{ width: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                  />
                                )}
                              </Field>
                              <DatePicker
                                label="Data Eliberării"
                                format="DD/MM/YYYY"
                                value={values.idIssueDateISO ? dayjs(values.idIssueDateISO) : null}
                                onChange={(date) =>
                                  setFieldValue('idIssueDateISO', date?.format('YYYY-MM-DD') || '')
                                }
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    error: touched.idIssueDateISO && !!errors.idIssueDateISO,
                                    helperText: touched.idIssueDateISO && errors.idIssueDateISO,
                                    sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } },
                                  },
                                }}
                              />
                            </Stack>

                            <Field name="idIssuer">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Emitent"
                                  placeholder="SPCLEP București"
                                  fullWidth
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <Field name="county">
                                {({ field }: any) => (
                                  <TextField
                                    {...field}
                                    label="Județ"
                                    placeholder="Prahova"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                  />
                                )}
                              </Field>
                              <Field name="locality">
                                {({ field }: any) => (
                                  <TextField
                                    {...field}
                                    label="Localitate"
                                    placeholder="Băicoi"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                  />
                                )}
                              </Field>
                            </Stack>

                            <Field name="address">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Adresă (domiciliu)"
                                  placeholder="Str. Exemplar nr. 10, bl. A, sc. 1, et. 3, ap. 12"
                                  fullWidth
                                  multiline
                                  rows={2}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                          </Stack>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                </Stack>
              </Box>
            </DialogContent>
            
            {/* Actions (sticky) */}
            <Box
              sx={{
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderColor: 'divider',
                p: { xs: 2, md: 3 },
                position: 'sticky',
                bottom: 0,
                zIndex: 1,
              }}
            >
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  onClick={handleClose}
                  disabled={updating}
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
                  disabled={!isValid || !dirty || updating}
                  variant="contained"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }}
                  startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {updating ? 'Se actualizează...' : 'Actualizează Angajat'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};
