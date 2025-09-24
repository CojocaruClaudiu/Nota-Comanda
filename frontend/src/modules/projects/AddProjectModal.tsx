import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stack,
  IconButton,
  Typography,
  Divider,
  CircularProgress,
  Fade,
  Autocomplete,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { roRO as roRODate } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DescriptionIcon from '@mui/icons-material/Description';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { Project, ProjectStatus } from '../../types/types';
import useNotistack from '../orders/hooks/useNotistack';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clients: Array<{ id: string; name: string }>;
  onAddClient?: (clientName: string) => void;
}

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNING', label: 'Planificare' },
  { value: 'IN_PROGRESS', label: 'În desfășurare' },
  { value: 'ON_HOLD', label: 'În așteptare' },
  { value: 'COMPLETED', label: 'Finalizat' },
  { value: 'CANCELLED', label: 'Anulat' },
];

// Validation schema
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
  startDate: Yup.date()
    .nullable(),
  endDate: Yup.date()
    .nullable()
    .min(Yup.ref('startDate'), 'Data sfârșit trebuie să fie după data început'),
});

// Initial values
const initialValues = {
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

const AddProjectModal: React.FC<AddProjectModalProps> = ({ open, onClose, onSave, clients, onAddClient }) => {
  const [saving, setSaving] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      setSaving(true);
      await onSave({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        status: values.status,
  startDate: values.startDate ? new Date(values.startDate) : undefined,
        endDate: values.endDate ? new Date(values.endDate) : undefined,
  budget: values.budget ? parseFloat(values.budget) : undefined,
  currency: (values as any).currency || 'RON',
        clientId: values.clientId || undefined,
        location: values.location.trim() || undefined,
        client: values.clientId ? { 
          id: values.clientId, 
          name: clients.find(c => c.id === values.clientId)?.name || '' 
        } : undefined,
      });
      handleClose();
      successNotistack('Proiectul a fost adăugat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut crea proiectul';
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
            maxWidth="lg"
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
                  <PlaylistAddIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">
                    Adaugă Proiect Nou
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Completează informațiile proiectului
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
                      <FolderIcon color="primary" />
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
                                if (newValue && newValue.id === 'add-new') {
                                  // Extract the client name from the display text
                                  const clientName = newValue.name.replace('Adaugă client nou: "', '').replace('"', '');
                                  if (onAddClient) {
                                    onAddClient(clientName);
                                  }
                                  // Don't set the field value for the "add new" option
                                  return;
                                }
                                form.setFieldValue('clientId', newValue ? newValue.id : '');
                              }}
                              options={clients}
                              getOptionLabel={(option) => {
                                if (option.id === 'add-new') {
                                  return option.name;
                                }
                                return option.name;
                              }}
                              isOptionEqualToValue={(option, value) => {
                                if (!option || !value) return false;
                                return option.id === value.id;
                              }}
                              noOptionsText="Nu s-au găsit clienți"
                              renderOption={(props, option) => {
                                if (option.id === 'add-new') {
                                  return (
                                    <li {...props} style={{ ...props.style, fontStyle: 'italic', color: '#1976d2' }}>
                                      <PersonAddIcon sx={{ mr: 1, color: 'primary.main' }} />
                                      {option.name}
                                    </li>
                                  );
                                }
                                
                                return (
                                  <li {...props}>
                                    <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />
                                    {option.name}
                                  </li>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Client"
                                  placeholder="Caută sau selectează un client..."
                                  error={touched.clientId && !!errors.clientId}
                                  helperText={touched.clientId && errors.clientId}
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
                                // Filter existing clients
                                const filtered = options.filter(option => {
                                  // Skip the synthetic "add-new" option from previous filters
                                  if (option.id === 'add-new') return false;
                                  return option.name.toLowerCase().includes(inputValue.toLowerCase());
                                });
                                
                                // Add "Add new client" option if no exact matches and there's meaningful input
                                if (inputValue && inputValue.trim() !== '') {
                                  const exactMatch = options.some(option => 
                                    option.id !== 'add-new' && 
                                    option.name.toLowerCase() === inputValue.toLowerCase()
                                  );
                                  
                                  if (!exactMatch) {
                                    filtered.push({
                                      id: 'add-new',
                                      name: `Adaugă client nou: "${inputValue.trim()}"`,
                                    });
                                  }
                                }
                                
                                return filtered;
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
                      <BusinessIcon color="secondary" />
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
                            helperText={touched.location && errors.location}
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
                              helperText={touched.budget && errors.budget}
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
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <PlaylistAddIcon />}
                >
                  {saving ? 'Se salvează...' : 'Adaugă Proiect'}
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

export default AddProjectModal;
