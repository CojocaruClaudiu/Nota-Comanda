// src/modules/clients/EditClientModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionIcon from '@mui/icons-material/Description';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { updateClient, type Client, type ClientPayload } from '../../api/clients';
import useNotistack from '../orders/hooks/useNotistack';

interface EditClientModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onClientUpdated: (client: Client) => void;
}

// Validation schema
const validationSchema = Yup.object({
  name: Yup.string()
    .required('Numele clientului este obligatoriu')
    .min(2, 'Numele trebuie să aibă cel puțin 2 caractere')
    .max(100, 'Numele nu poate avea mai mult de 100 caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s\-\.]+$/, 'Numele poate conține doar litere, spații, cratime și puncte'),
  location: Yup.string()
    .required('Locația este obligatorie')
    .min(2, 'Locația trebuie să aibă cel puțin 2 caractere')
    .max(200, 'Locația nu poate avea mai mult de 200 caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ0-9\s\-\.\,]+$/, 'Locația poate conține doar litere, cifre, spații și semne de punctuație'),
  phone: Yup.string()
    .required('Telefonul este obligatoriu')
    .matches(/^(\+4|0)?(7[0-9]{8}|2[0-9]{8}|3[0-9]{8})$/, 'Numărul de telefon trebuie să fie valid (ex: 0722123456, +40722123456)'),
  email: Yup.string()
    .email('Adresa de email nu este validă')
    .nullable(),
  registrulComertului: Yup.string()
    .max(50, 'Registrul comerțului nu poate avea mai mult de 50 caractere')
    .matches(/^[a-zA-Z0-9\/\-\s]*$/, 'Registrul comerțului poate conține doar litere, cifre, cratime și bare oblice')
    .nullable(),
  cui: Yup.string()
    .matches(/^[0-9]{2,10}$/, 'CUI-ul trebuie să conțină între 2 și 10 cifre')
    .nullable(),
});

export const EditClientModal: React.FC<EditClientModalProps> = ({
  open,
  client,
  onClose,
  onClientUpdated
}) => {
  const [updating, setUpdating] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  // Get initial values based on client
  const getInitialValues = (): ClientPayload => {
    if (client) {
      return {
        name: client.name,
        location: client.location,
        phone: client.phone,
        email: client.email ?? '',
        registrulComertului: client.registrulComertului ?? '',
        cui: client.cui ?? '',
      };
    }
    return {
      name: '',
      location: '',
      phone: '',
      email: '',
      registrulComertului: '',
      cui: '',
    };
  };

  const handleSubmit = async (values: ClientPayload) => {
    if (!client) return;
    
    try {
      setUpdating(true);
      const updated = await updateClient(client.id, values);
      onClientUpdated(updated);
      handleClose();
      successNotistack('Clientul a fost actualizat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut actualiza clientul';
      errorNotistack(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (updating) return;
    onClose();
  };

  return (
    <Formik
      initialValues={getInitialValues()}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      key={client?.id || 'none'} // Reset form when client changes
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
                    Editează Client
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Modifică informațiile clientului: {client?.name}
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
                      <BusinessIcon color="primary" />
                      Informații Obligatorii
                    </Typography>
                    <Stack spacing={2.5}>
                      <Field name="name">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Nume Client"
                            placeholder="Ex: SC Topaz SRL, Compania ABC, Ion Popescu"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.name && !!errors.name}
                            helperText={touched.name && errors.name}
                            InputProps={{
                              startAdornment: <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        )}
                      </Field>

                      <Field name="location">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Locație"
                            placeholder="Ex: București, Sector 1, Str. Aviatorilor Nr. 10"
                            required
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

                      <Field name="phone">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Telefon"
                            placeholder="Ex: 0722123456, +40722123456"
                            required
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

                      <Field name="email">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Email"
                            placeholder="Ex: ion.popescu@email.com"
                            type="email"
                            fullWidth
                            variant="outlined"
                            error={touched.email && !!errors.email}
                            helperText={touched.email && errors.email}
                            InputProps={{
                              startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />,
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

                  {/* Optional Fields Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <DescriptionIcon color="secondary" />
                      Informații Opționale
                    </Typography>
                    <Stack spacing={2.5}>
                      <Field name="registrulComertului">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="Registrul Comerțului"
                            placeholder="Ex: J40/12345/2023, F40/987/2022"
                            fullWidth
                            variant="outlined"
                            error={touched.registrulComertului && !!errors.registrulComertului}
                            helperText={touched.registrulComertului && errors.registrulComertului}
                            InputProps={{
                              startAdornment: <DescriptionIcon sx={{ color: 'action.active', mr: 1 }} />,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        )}
                      </Field>

                      <Field name="cui">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="CUI"
                            placeholder="Ex: 12345678 (între 2 și 10 cifre)"
                            fullWidth
                            variant="outlined"
                            error={touched.cui && !!errors.cui}
                            helperText={touched.cui && errors.cui}
                            InputProps={{
                              startAdornment: <FingerprintIcon sx={{ color: 'action.active', mr: 1 }} />,
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
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e084ea 0%, #e4495a 100%)',
                    }
                  }}
                  startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {updating ? 'Se actualizează...' : 'Actualizează Client'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};
