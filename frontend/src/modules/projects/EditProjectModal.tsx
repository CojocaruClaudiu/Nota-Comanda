// src/modules/projects/EditProjectModal.tsx
import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade,
  FormControl, InputLabel, Select, MenuItem, Autocomplete,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { roRO as roRODate } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import type { Project, ProjectStatus } from '../../types/types';
import { projectsApi } from '../../api/projects';
import useNotistack from '../orders/hooks/useNotistack';

interface EditProjectModalProps {
  open: boolean;
  project: Project | null;
  clients: Array<{ id: string; name: string }>;
  onClose: () => void;
  onProjectUpdated: (project: Project) => void;
  onAddClient?: (clientName: string) => void;
}

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNING', label: 'Planificare' },
  { value: 'IN_PROGRESS', label: 'În desfășurare' },
  { value: 'ON_HOLD', label: 'În așteptare' },
  { value: 'COMPLETED', label: 'Finalizat' },
  { value: 'CANCELLED', label: 'Anulat' },
];

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Numele proiectului este obligatoriu')
    .min(2, 'Numele trebuie să aibă cel puțin 2 caractere')
    .max(100, 'Numele nu poate avea mai mult de 100 caractere'),
  description: Yup.string()
    .max(500, 'Descrierea nu poate avea mai mult de 500 caractere'),
  location: Yup.string()
    .max(200, 'Locația nu poate avea mai mult de 200 caractere'),
  budget: Yup.number()
    .positive('Bugetul trebuie să fie un număr pozitiv')
    .nullable(),
  startDate: Yup.date().nullable(),
  endDate: Yup.date().nullable().min(Yup.ref('startDate'), 'Data sfârșit trebuie să fie după data început'),
});

const toIso = (v?: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '');

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  open,
  project,
  clients,
  onClose,
  onProjectUpdated,
  onAddClient,
}) => {
  const [saving, setSaving] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const initialValues = useMemo(() => {
    if (!project) {
      return {
        name: '',
        description: '',
        status: 'PLANNING' as ProjectStatus,
        startDate: '',
        endDate: '',
  budget: '',
  currency: 'RON',
        clientId: '',
        location: '',
      };
    }
    return {
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      startDate: project.startDate ? toIso(project.startDate as any) : '',
      endDate: project.endDate ? toIso(project.endDate as any) : '',
  budget: project.budget != null ? String(project.budget) : '',
  currency: (project as any).currency ?? 'RON',
      clientId: project.clientId ?? '',
      location: project.location ?? '',
    };
  }, [project]);

  const handleSubmit = async (values: typeof initialValues) => {
    if (!project) return;
    try {
      setSaving(true);
      const updated = await projectsApi.update(project.id, {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        status: values.status,
        startDate: values.startDate ? new Date(values.startDate) : undefined,
        endDate: values.endDate ? new Date(values.endDate) : undefined,
  budget: values.budget ? parseFloat(values.budget) : undefined,
  currency: (values as any).currency || 'RON',
        clientId: values.clientId || undefined,
        location: values.location.trim() || undefined,
      });
      onProjectUpdated(updated);
      handleClose();
      successNotistack('Proiectul a fost actualizat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut actualiza proiectul';
      errorNotistack(msg);
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
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      key={project?.id || 'none'}
    >
      {({ errors, touched, isValid, dirty, values, setFieldValue }) => (
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale="ro"
          localeText={roRODate.components.MuiLocalizationProvider.defaultProps.localeText}
        >
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
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
                      Editează Proiect
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                      Modifică informațiile proiectului: {project?.name}
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
                    {/* Required Fields Section */}
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <BusinessIcon color="primary" />
                        Informații Obligatorii
                      </Typography>
                      <Stack spacing={2.5}>
                        <Field name="name">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Nume Proiect"
                              placeholder="Ex: Renovare Birou, Construcție Casă, Aplicație Web"
                              required
                              fullWidth
                              variant="outlined"
                              error={touched.name && !!errors.name}
                              helperText={touched.name && errors.name}
                              InputProps={{
                                startAdornment: <AssignmentIcon sx={{ color: 'action.active', mr: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                        </Field>

                        <Field name="description">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Descriere"
                              placeholder="Descrierea detaliată a proiectului..."
                              fullWidth
                              multiline
                              rows={3}
                              variant="outlined"
                              error={touched.description && !!errors.description}
                              helperText={touched.description && errors.description}
                              InputProps={{
                                startAdornment: <DescriptionIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                        </Field>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={values.status}
                              label="Status"
                              onChange={(e) => setFieldValue('status', e.target.value)}
                              sx={{
                                borderRadius: 2,
                              }}
                            >
                              {statusOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <Field name="clientId">
                            {({ field, form }: any) => (
                              <Autocomplete
                                value={clients.find(client => client.id === field.value) || null}
                                onChange={(_, newValue) => {
                                  if (newValue && (newValue as any).id === 'add-new') {
                                    const clientName = (newValue as any).name.replace('Adaugă client nou: "', '').replace('"', '');
                                    if (onAddClient) {
                                      onAddClient(clientName);
                                    }
                                    return;
                                  }
                                  form.setFieldValue('clientId', newValue ? (newValue as any).id : '');
                                }}
                                options={clients}
                                getOptionLabel={(option) => (option as any).name}
                                isOptionEqualToValue={(option, value) => !!option && !!value && (option as any).id === (value as any).id}
                                noOptionsText="Nu s-au găsit clienți"
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Client"
                                    placeholder="Caută sau selectează un client..."
                                    error={touched.clientId && !!errors.clientId}
                                    helperText={touched.clientId && (errors.clientId as any)}
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: (
                                        <>
                                          <PeopleIcon sx={{ color: 'action.active', mr: 1 }} />
                                          {params.InputProps.startAdornment}
                                        </>
                                      ),
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                      }
                                    }}
                                  />
                                )}
                                filterOptions={(options, { inputValue }) => {
                                  const filtered = options.filter((option: any) => option.id !== 'add-new' && option.name.toLowerCase().includes(inputValue.toLowerCase()));
                                  if (inputValue && inputValue.trim() !== '') {
                                    const exactMatch = options.some((o: any) => o.id !== 'add-new' && o.name.toLowerCase() === inputValue.toLowerCase());
                                    if (!exactMatch) {
                                      (filtered as any).push({ id: 'add-new', name: `Adaugă client nou: "${inputValue.trim()}"` });
                                    }
                                  }
                                  return filtered as any;
                                }}
                                fullWidth
                                sx={{ width: '100%' }}
                              />
                            )}
                          </Field>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Optional Fields Section */}
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <DescriptionIcon color="secondary" />
                        Informații Opționale
                      </Typography>
                      <Stack spacing={2.5}>
                        <Field name="location">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Locație"
                              placeholder="Ex: București, Sector 1, Str. Aviatorilor Nr. 10"
                              fullWidth
                              variant="outlined"
                              error={touched.location && !!errors.location}
                              helperText={touched.location && (errors.location as any)}
                              InputProps={{
                                startAdornment: <LocationOnIcon sx={{ color: 'action.active', mr: 1 }} />,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                        </Field>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Field name="startDate">
                            {({ field, form }: any) => (
                              <DatePicker
                                label="Data Început"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(newValue) =>
                                  form.setFieldValue('startDate', newValue ? newValue.format('YYYY-MM-DD') : '')
                                }
                                format="DD.MM.YYYY"
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    variant: 'outlined',
                                    error: touched.startDate && !!errors.startDate,
                                    helperText: touched.startDate && (errors.startDate as any),
                                    InputLabelProps: { shrink: true },
                                    InputProps: {
                                      startAdornment: <CalendarTodayIcon sx={{ color: 'action.active', mr: 1 }} />,
                                    },
                                    sx: {
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                      },
                                    },
                                  },
                                }}
                              />
                            )}
                          </Field>

                          <Field name="endDate">
                            {({ field, form }: any) => (
                              <DatePicker
                                label="Data Sfârșit"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(newValue) =>
                                  form.setFieldValue('endDate', newValue ? newValue.format('YYYY-MM-DD') : '')
                                }
                                format="DD.MM.YYYY"
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    variant: 'outlined',
                                    error: touched.endDate && !!errors.endDate,
                                    helperText: touched.endDate && (errors.endDate as any),
                                    InputLabelProps: { shrink: true },
                                    InputProps: {
                                      startAdornment: <CalendarTodayIcon sx={{ color: 'action.active', mr: 1 }} />,
                                    },
                                    sx: {
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                      },
                                    },
                                  },
                                }}
                              />
                            )}
                          </Field>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Field name="budget">
                            {({ field }: any) => (
                              <TextField
                                {...field}
                                label="Buget"
                                placeholder="Ex: 15000"
                                fullWidth
                                type="number"
                                variant="outlined"
                                error={touched.budget && !!errors.budget}
                                helperText={touched.budget && (errors.budget as any)}
                                inputProps={{ min: 0, step: 0.01 }}
                                InputProps={{
                                  startAdornment: <AccountBalanceWalletIcon sx={{ color: 'action.active', mr: 1 }} />,
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                  }
                                }}
                              />
                            )}
                          </Field>

                          <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Valută</InputLabel>
                            <Select
                              label="Valută"
                              value={(values as any).currency}
                              onChange={(e) => setFieldValue('currency', e.target.value)}
                            >
                              <MenuItem value="RON">RON</MenuItem>
                              <MenuItem value="EUR">EUR</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
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
                      }
                    }}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                  >
                    {saving ? 'Se actualizează...' : 'Actualizează Proiect'}
                  </Button>
                </Stack>
              </Box>
            </Form>
          </Dialog>
        </LocalizationProvider>
      )}
    </Formik>
  );
};

export default EditProjectModal;
