// src/modules/auto/AddCarModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, MenuItem,
  Checkbox, FormControlLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BadgeIcon from '@mui/icons-material/Badge';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import EventIcon from '@mui/icons-material/Event';
import NumbersIcon from '@mui/icons-material/Numbers';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PersonIcon from '@mui/icons-material/Person';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Autocomplete } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

import { createCar, type CarPayload } from '../../api/cars';
import { type EmployeeWithStats } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';
import { Dayjs } from 'dayjs';

// Keep fuel type union in-sync with carPage
export type FuelType =
  | 'MOTORINA'
  | 'BENZINA'
  | 'BENZINA_GPL'
  | 'HIBRID_MOTORINA'
  | 'HIBRID_BENZINA'
  | 'ELECTRIC'
  | 'ALT';

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'MOTORINA', label: 'Motorină' },
  { value: 'BENZINA', label: 'Benzină' },
  { value: 'BENZINA_GPL', label: 'Benzină/GPL' },
  { value: 'HIBRID_MOTORINA', label: 'Hibrid (Motorină)' },
  { value: 'HIBRID_BENZINA', label: 'Hibrid (Benzină)' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'ALT', label: 'Alt combustibil' },
];

function toIso(d: Dayjs | null) {
  return d && d.isValid() ? d.format('YYYY-MM-DD') : null;
}

export interface AddCarModalProps {
  open: boolean;
  onClose: () => void;
  onCarAdded: (car: any) => void;
  employees: EmployeeWithStats[];
}

const validationSchema = Yup.object({
  vin: Yup.string().required('VIN este obligatoriu').min(5, 'Minim 5 caractere').max(50),
  placute: Yup.string().required('Plăcuțe obligatorii').min(3).max(15),
  an: Yup.number().typeError('An invalid').required('An obligatoriu').min(1900).max(new Date().getFullYear() + 1),
  marca: Yup.string().required('Marcă obligatorie').max(50),
  model: Yup.string().required('Model obligatoriu').max(80),
  culoare: Yup.string().max(50).nullable(),
  driverId: Yup.string().nullable(),
  driverNote: Yup.string().max(200).nullable(),
  combustibil: Yup.mixed<FuelType>().oneOf(FUEL_OPTIONS.map(f => f.value)).nullable(),
  expItp: Yup.mixed().nullable(),
  expRca: Yup.mixed().nullable(),
  expRovi: Yup.mixed().nullable(),
  rcaDecontareDirecta: Yup.boolean().nullable(),
});

const initialValues = {
  vin: '',
  marca: '',
  model: '',
  an: '',
  culoare: '',
  placute: '',
  driverId: null as string | null,
  driverNote: '',
  combustibil: '' as FuelType | '',
  expItp: null as Dayjs | null,
  expRca: null as Dayjs | null,
  expRovi: null as Dayjs | null,
  rcaDecontareDirecta: false as boolean,
};

export const AddCarModal: React.FC<AddCarModalProps> = ({ open, onClose, onCarAdded, employees }) => {
  const [saving, setSaving] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const handleClose = () => { if (!saving) onClose(); };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { resetForm }) => {
        try {
          setSaving(true);
          const payload: CarPayload = {
            vin: values.vin.trim(),
            marca: values.marca.trim(),
            model: values.model.trim(),
            an: Number(values.an),
            culoare: values.culoare?.trim() || null,
            placute: values.placute.trim().toUpperCase(),
            driverId: values.driverId || null,
            driverNote: values.driverNote?.trim() || null,
            combustibil: (values.combustibil || null) as any,
            expItp: toIso(values.expItp),
            expRca: toIso(values.expRca),
            expRovi: toIso(values.expRovi),
            rcaDecontareDirecta: values.rcaDecontareDirecta ?? false,
          };
          const created = await createCar(payload);
          onCarAdded(created);
          resetForm();
          handleClose();
          successNotistack('Mașina a fost adăugată cu succes!');
        } catch (e: any) {
          errorNotistack(e?.message || 'Nu am putut crea mașina');
        } finally {
          setSaving(false);
        }
      }}
      enableReinitialize
    >
      {({ values, errors, touched, isValid, dirty, setFieldValue }) => (
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
                background: 'linear-gradient(135deg, #1fa2ff 0%, #12d8fa 50%, #a6ffcb 100%)',
                color: 'white',
                p: 3,
                position: 'relative'
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DirectionsCarFilledRoundedIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">Adaugă Mașină</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Completează informațiile mașinii</Typography>
                </Box>
              </Stack>

              <IconButton onClick={handleClose} disabled={saving} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Content */}
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* Required */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <BadgeIcon color="primary" />
                      Date obligatorii
                    </Typography>

                    <Stack spacing={2.5}>
                      <Field name="vin">
                        {({ field }: any) => (
                          <TextField
                            {...field}
                            label="VIN"
                            placeholder="Ex: WDB2032201F123456"
                            required
                            fullWidth
                            variant="outlined"
                            error={touched.vin && !!errors.vin}
                            helperText={touched.vin && errors.vin}
                            InputProps={{ startAdornment: <NumbersIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        )}
                      </Field>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <Field name="placute">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Plăcuțe"
                              placeholder="Ex: B 12 ABC"
                              required
                              fullWidth
                              variant="outlined"
                              error={touched.placute && !!errors.placute}
                              helperText={touched.placute && errors.placute}
                              InputProps={{ startAdornment: <TextSnippetIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                        <Field name="an">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="An"
                              placeholder="Ex: 2019"
                              type="number"
                              required
                              fullWidth
                              variant="outlined"
                              error={touched.an && !!errors.an}
                              helperText={touched.an && errors.an}
                              InputProps={{ startAdornment: <EventIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <Field name="marca">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Marcă"
                              placeholder="Ex: Dacia"
                              required
                              fullWidth
                              variant="outlined"
                              error={touched.marca && !!errors.marca}
                              helperText={touched.marca && errors.marca}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                        <Field name="model">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Model"
                              placeholder="Ex: Logan"
                              required
                              fullWidth
                              variant="outlined"
                              error={touched.model && !!errors.model}
                              helperText={touched.model && errors.model}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                        <Field name="culoare">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Culoare"
                              placeholder="Ex: Gri"
                              fullWidth
                              variant="outlined"
                              error={touched.culoare && !!errors.culoare}
                              helperText={touched.culoare && errors.culoare}
                              InputProps={{ startAdornment: <ColorLensIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          )}
                        </Field>
                      </Stack>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Optional */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LocalGasStationIcon color="secondary" />
                      Detalii opționale
                    </Typography>
                    <Stack spacing={2.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <Box sx={{ flex: { xs: '1 1 auto', sm: '2 1 0' } }}>
                          <Autocomplete
                            options={employees}
                            getOptionLabel={(o) => o.name}
                            value={employees.find((e) => e.id === values.driverId) || null}
                            onChange={(_, val) => setFieldValue('driverId', val?.id || null)}
                            renderInput={(params) => <TextField {...params} label="Șofer (angajat)" fullWidth />}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                          />
                        </Box>
                        <Box sx={{ flex: { xs: '1 1 auto', sm: '1 1 0' } }}>
                          <Field name="driverNote">
                            {({ field }: any) => (
                              <TextField
                                {...field}
                                label="Notă șofer"
                                fullWidth
                                variant="outlined"
                                error={touched.driverNote && !!errors.driverNote}
                                helperText={touched.driverNote && errors.driverNote}
                                InputProps={{ startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                              />
                            )}
                          </Field>
                        </Box>
                        <Box sx={{ flex: { xs: '1 1 auto', sm: '1 1 0' } }}>
                          <Field name="combustibil">
                            {({ field }: any) => (
                              <TextField
                                {...field}
                                select
                                label="Combustibil"
                                fullWidth
                              >
                                {FUEL_OPTIONS.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Field>
                        </Box>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <DatePicker
                          label="Expirare ITP"
                          format="DD/MM/YYYY"
                          value={values.expItp}
                          onChange={(d) => setFieldValue('expItp', d)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                        {/* RCA date + decontare toggle inline */}
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            border: '1px solid',
                            borderColor: values.rcaDecontareDirecta ? 'success.main' : 'divider',
                            borderRadius: 2,
                            p: 1.5,
                            bgcolor: values.rcaDecontareDirecta ? 'success.lighter' : 'background.paper',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <DatePicker
                            label="Expirare RCA"
                            format="DD/MM/YYYY"
                            value={values.expRca}
                            onChange={(d) => setFieldValue('expRca', d)}
                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                          />
                          <FormControlLabel
                            sx={{
                              m: 0,
                              mt: 1,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: values.rcaDecontareDirecta ? 'success.light' : 'grey.100',
                              '& .MuiFormControlLabel-label': {
                                fontSize: 13,
                                fontWeight: 500,
                                color: values.rcaDecontareDirecta ? 'success.dark' : 'text.secondary'
                              }
                            }}
                            control={
                              <Checkbox
                                size="small"
                                sx={{ p: 0.25, mr: 0.75 }}
                                checked={Boolean(values.rcaDecontareDirecta)}
                                onChange={(e) => setFieldValue('rcaDecontareDirecta', e.target.checked)}
                                color="success"
                              />
                            }
                            label="✓ Decontare directă"
                          />
                        </Box>
                        <DatePicker
                          label="Expirare Rovinietă"
                          format="DD/MM/YYYY"
                          value={values.expRovi}
                          onChange={(d) => setFieldValue('expRovi', d)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </DialogContent>

            {/* Actions */}
            <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} disabled={saving} variant="outlined" size="large" sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}>
                  Anulează
                </Button>
                <Button type="submit" disabled={!isValid || !dirty || saving} variant="contained" size="large"
                  sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #1fa2ff 0%, #12d8fa 50%, #a6ffcb 100%)', '&:hover': { background: 'linear-gradient(135deg, #1a90e6 0%, #10c1e1 50%, #91f0b6 100%)' } }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <DirectionsCarFilledRoundedIcon />}
                >
                  {saving ? 'Se salvează...' : 'Adaugă Mașină'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default AddCarModal;
