import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Fade,
  TextField,
  Autocomplete,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddBusinessIcon from '@mui/icons-material/PersonAdd';
import type { ClientLocation } from '../../../types/types';

interface EditLocationModalProps {
  open: boolean;
  location: ClientLocation | null;
  clients: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (location: Partial<ClientLocation>) => void | Promise<void>;
  onAddClient?: (clientName: string) => void;
}

// Validation schema similar in spirit to EditClientModal
const validationSchema = Yup.object({
  clientId: Yup.string().required('Clientul este obligatoriu'),
  name: Yup.string()
    .required('Numele locației este obligatoriu')
    .min(2, 'Minim 2 caractere')
    .max(150, 'Maxim 150 caractere')
    .matches(/^[a-zA-ZăâîșțĂÎȘȚ0-9\s\-\.\,]+$/, 'Poate conține doar litere, cifre, spații și semne de punctuație'),
  address: Yup.string()
    .required('Adresa este obligatorie')
    .min(2, 'Minim 2 caractere')
    .max(250, 'Maxim 250 caractere'),
});

const EditLocationModal: React.FC<EditLocationModalProps> = ({ open, location, clients, onClose, onSave, onAddClient }) => {
  const [saving, setSaving] = useState(false);

  const getInitialValues = () => ({
    clientId: location?.client?.id || location?.clientId || '',
    name: location?.name || '',
    address: location?.address || '',
  });

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (values: { clientId: string; name: string; address: string }) => {
    if (!location) return;
    try {
      setSaving(true);
      // Pass Partial<ClientLocation> to parent
      await Promise.resolve(onSave({ id: location.id, clientId: values.clientId, name: values.name, address: values.address }));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Formik
      initialValues={getInitialValues()}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      key={location?.id || 'none'}
    >
      {({ errors, touched, isValid, dirty }) => (
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
            {/* Header */}
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
                    Editează Locație
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Modifică informațiile locației: {location?.name}
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
                  },
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
                      Informații Locație
                    </Typography>
                    <Stack spacing={2.5}>
                      {/* Client autocomplete with add-new option (mirrors AddLocationModal) */}
                      <Field name="clientId">
                        {({ field, form }: any) => (
                          <Autocomplete
                            value={clients.find((c) => c.id === field.value) || null}
                            onChange={(_, newValue) => {
                              if (newValue && (newValue as any).id === 'add-new') {
                                const clientName = (newValue as any).name.replace('Adaugă client nou: "', '').replace('"', '');
                                if (onAddClient) onAddClient(clientName);
                                return;
                              }
                              form.setFieldValue('clientId', newValue ? (newValue as any).id : '');
                            }}
                            options={clients as any}
                            getOptionLabel={(option: any) => option?.name ?? ''}
                            isOptionEqualToValue={(option: any, value: any) => !!option && !!value && option.id === value.id}
                            noOptionsText="Nu s-au găsit clienți"
                            renderOption={(props, option: any) => {
                              if (option.id === 'add-new') {
                                return (
                                  <li {...props} style={{ ...props.style, fontStyle: 'italic', color: '#1976d2' }}>
                                    <AddBusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
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
                                required
                                error={touched.clientId && !!errors.clientId}
                                helperText={touched.clientId && (errors.clientId as string)}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                              />
                            )}
                            filterOptions={(options: any[], { inputValue }) => {
                              const filtered = options.filter(option => {
                                if (option.id === 'add-new') return false;
                                return option.name.toLowerCase().includes(inputValue.toLowerCase());
                              });
                              if (inputValue && inputValue.trim() !== '') {
                                const exactMatch = options.some(option => 
                                  option.id !== 'add-new' && 
                                  option.name.toLowerCase() === inputValue.toLowerCase()
                                );
                                if (!exactMatch) {
                                  filtered.push({ id: 'add-new', name: `Adaugă client nou: "${inputValue.trim()}"` });
                                }
                              }
                              return filtered;
                            }}
                            sx={{ width: '100%' }}
                          />
                        )}
                      </Field>

                      {/* Location name */}
                      <Field name="name">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Nume Locație"
                            placeholder="Ex: Sediu Central, Depozit Nord"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.name && !!errors.name}
                            helperText={touched.name && (errors.name as string)}
                            InputProps={{
                              startAdornment: <PlaceIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                            }}
                          />
                        )}
                      </Field>

                      {/* Address */}
                      <Field name="address">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Adresă"
                            placeholder="Ex: Str. Aviatorilor 10, București"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.address && !!errors.address}
                            helperText={touched.address && (errors.address as string)}
                            InputProps={{
                              startAdornment: <LocationOnIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                            }}
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
                  disabled={!isValid || !dirty || saving || !location}
                  variant="contained"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #e084ea 0%, #e4495a 100%)' },
                  }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {saving ? 'Se actualizează...' : 'Actualizează Locația'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default EditLocationModal;
