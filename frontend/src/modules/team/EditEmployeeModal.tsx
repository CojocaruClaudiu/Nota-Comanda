// src/modules/team/EditEmployeeModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, Collapse
} from '@mui/material';
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
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s\-\.]+$/, 'Numele poate conține doar litere, spații, cratime și puncte'),
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
  birthDate: Yup.string()
    .nullable(),
  idIssueDateISO: Yup.string()
    .nullable(),
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
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }
          }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form>
            {/* Header */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  <EditIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">
                    Editează Angajat
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Modifică informațiile angajatului: {employee?.name}
                  </Typography>
                </Box>
              </Stack>
              
              <IconButton
                onClick={handleClose}
                disabled={updating}
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
                              startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        )}
                      </Field>

                      <Stack direction="row" spacing={2}>
                        <Field name="cnp">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="CNP"
                              placeholder="1234567890123"
                              fullWidth
                              variant="outlined"
                              inputProps={{ maxLength: 13 }}
                              error={touched.cnp && !!errors.cnp}
                              helperText={touched.cnp && errors.cnp}
                              InputProps={{
                                startAdornment: <BadgeIcon sx={{ color: 'action.active', mr: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
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
                                startAdornment: <PhoneIcon sx={{ color: 'action.active', mr: 1 }} />,
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

                      <Stack direction="row" spacing={2}>
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
                                startAdornment: <WorkIcon sx={{ color: 'action.active', mr: 1 }} />,
                              },
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }
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
                              helperText: touched.birthDate && errors.birthDate || 'Opțional',
                              InputProps: {
                                startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
                              },
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }
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
                              startAdornment: <WorkIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
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

                  {/* Optional Fields Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ContactMailIcon color="secondary" />
                      Informații Opționale
                    </Typography>
                    
                    {/* Advanced section toggle */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Button
                        size="small"
                        startIcon={<ExpandMoreIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                        onClick={() => setShowAdvanced(s => !s)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {showAdvanced ? 'Ascunde detalii' : 'Detalii CI & adresă'}
                      </Button>
                      <Typography variant="caption" color="text.secondary">(opțional)</Typography>
                    </Stack>

                    <Collapse in={showAdvanced} unmountOnExit>
                      <Stack spacing={2.5}>
                        {/* CI Section */}
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Carte de Identitate
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            <Field name="idSeries">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Serie CI"
                                  placeholder="AB"
                                  inputProps={{ maxLength: 3 }}
                                  error={touched.idSeries && !!errors.idSeries}
                                  helperText={touched.idSeries && errors.idSeries}
                                  sx={{ width: '120px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                            <Field name="idNumber">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Număr CI"
                                  placeholder="123456"
                                  inputProps={{ maxLength: 6 }}
                                  error={touched.idNumber && !!errors.idNumber}
                                  helperText={touched.idNumber && errors.idNumber}
                                  sx={{ width: '150px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                            <Field name="idIssuer">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Emitent CI"
                                  placeholder="SPCLEP București"
                                  fullWidth
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                          </Stack>
                          <DatePicker
                            label="Data Eliberării CI"
                            format="DD/MM/YYYY"
                            value={values.idIssueDateISO ? dayjs(values.idIssueDateISO) : null}
                            onChange={(date) => setFieldValue('idIssueDateISO', date?.format('YYYY-MM-DD') || '')}
                            slotProps={{ 
                              textField: { 
                                fullWidth: true, 
                                error: touched.idIssueDateISO && !!errors.idIssueDateISO, 
                                helperText: touched.idIssueDateISO && errors.idIssueDateISO,
                                sx: { mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                              } 
                            }}
                          />
                        </Box>

                        {/* Address Section */}
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Adresă Domiciliu
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            <Field name="county">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Județ"
                                  placeholder="București"
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                            <Field name="locality">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  label="Localitate"
                                  placeholder="Sectorul 1"
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                              )}
                            </Field>
                          </Stack>
                          <Field name="address">
                            {({ field }: any) => (
                              <TextField
                                {...field}
                                label="Adresă Completă"
                                placeholder="Str. Aviatorilor Nr. 10, Bl. A1, Sc. B, Et. 3, Ap. 15"
                                fullWidth
                                multiline
                                rows={2}
                                sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                              />
                            )}
                          </Field>
                        </Box>
                      </Stack>
                    </Collapse>
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
