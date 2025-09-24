import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Stack,
  Box,
  Typography,
  IconButton,
  Fade,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import AddBusinessIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlaceIcon from '@mui/icons-material/Place';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import type { ClientLocation } from '../../../types/types';

interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (location: Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clients: Array<{ id: string; name: string }>;
  onAddClient?: (clientName: string) => void;
}

// Validation schema
const validationSchema = Yup.object({
  clientId: Yup.string()
    .required('Clientul este obligatoriu'),
  name: Yup.string()
    .required('Numele locației este obligatoriu')
    .min(2, 'Numele trebuie să aibă cel puțin 2 caractere')
    .max(100, 'Numele nu poate avea mai mult de 100 caractere'),
  address: Yup.string()
    .required('Adresa este obligatorie')
    .min(5, 'Adresa trebuie să aibă cel puțin 5 caractere')
    .max(500, 'Adresa nu poate avea mai mult de 500 caractere'),
});

// Initial values
const initialValues = {
  clientId: '',
  name: '',
  address: '',
};

interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (location: Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clients: Array<{ id: string; name: string }>;
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({ open, onClose, onSave, clients, onAddClient }) => {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      setSaving(true);
      await onSave({
        clientId: values.clientId,
        name: values.name.trim(),
        address: values.address.trim(),
        client: clients.find(c => c.id === values.clientId),
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create location:', error);
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
                  <AddLocationIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">
                    Adaugă Locație Client
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Completează informațiile locației
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
                      <PlaceIcon color="primary" />
                      Informații Locație
                    </Typography>
                    <Stack spacing={2.5}>
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
                                helperText={touched.clientId && errors.clientId}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />
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
                            sx={{ width: '100%' }}
                          />
                        )}
                      </Field>

                      <Field name="name">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Nume Locație"
                            placeholder="Ex: Șantier Construcție Vila, Depozit Central"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.name && !!errors.name}
                            helperText={touched.name && errors.name}
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

                      <Field name="address">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Adresă Completă"
                            placeholder="Ex: Strada Primăverii nr. 15, Sector 1, București"
                            required
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            error={touched.address && !!errors.address}
                            helperText={touched.address && errors.address}
                            InputProps={{
                              startAdornment: <PlaceIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
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
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <AddLocationIcon />}
                >
                  {saving ? 'Se salvează...' : 'Adaugă Locație'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default AddLocationModal;
