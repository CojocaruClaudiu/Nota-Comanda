// src/modules/auto/EditCarModal.tsx
import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, MenuItem
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BadgeIcon from '@mui/icons-material/Badge';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import EventIcon from '@mui/icons-material/Event';
import NumbersIcon from '@mui/icons-material/Numbers';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PersonIcon from '@mui/icons-material/Person';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Autocomplete } from '@mui/material';

import { updateCar, type Car } from '../../api/cars';
import { type EmployeeWithStats } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';
import dayjs, { Dayjs } from 'dayjs';

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
function fromIso(s?: string | null) {
  return s ? dayjs(s) : null;
}

export interface EditCarModalProps {
  open: boolean;
  car: Car | null;
  employees: EmployeeWithStats[];
  onClose: () => void;
  onCarUpdated: (car: Car) => void;
}

const validationSchema = Yup.object({
  vin: Yup.string().required('VIN este obligatoriu').min(5).max(50),
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
});

export const EditCarModal: React.FC<EditCarModalProps> = ({ open, car, onClose, onCarUpdated, employees }) => {
  const [saving, setSaving] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const initialValues = useMemo(() => ({
    vin: car?.vin ?? '',
    marca: car?.marca ?? '',
    model: car?.model ?? '',
    an: car?.an ?? '',
    culoare: car?.culoare ?? '',
    placute: car?.placute ?? '',
    driverId: car?.driverId ?? null,
    driverNote: car?.driverNote ?? '',
    combustibil: (car?.combustibil || '') as FuelType | '',
    expItp: fromIso(car?.expItp),
    expRca: fromIso(car?.expRca),
    expRovi: fromIso(car?.expRovi),
  }), [car]);

  const handleClose = () => { if (!saving) onClose(); };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
  onSubmit={async (values) => {
        if (!car) return;
        try {
          setSaving(true);
          const payload = {
            vin: values.vin.trim(),
            marca: values.marca.trim(),
            model: values.model.trim(),
            an: Number(values.an),
            culoare: values.culoare?.trim() || null,
            placute: values.placute.trim().toUpperCase(),
            driverId: values.driverId || null,
            driverNote: values.driverNote?.trim() || null,
            combustibil: (values.combustibil || null) as any,
            expItp: toIso(values.expItp as any),
            expRca: toIso(values.expRca as any),
            expRovi: toIso(values.expRovi as any),
          };
          const updated = await updateCar(car.id, payload);
          onCarUpdated(updated);
          handleClose();
          successNotistack('Mașina a fost actualizată cu succes!');
        } catch (e: any) {
          errorNotistack(e?.message || 'Nu am putut actualiza mașina');
        } finally {
          setSaving(false);
        }
      }}
      enableReinitialize
      key={car?.id || 'none'}
    >
      {({ values, errors, touched, isValid, dirty, setFieldValue }) => (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' } }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form>
            {/* Header */}
            <Box sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', p: 3, position: 'relative' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EditIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="600">Editează Mașină</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Modifică informațiile mașinii: {car?.placute}</Typography>
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
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <BadgeIcon color="primary" />
                      Date obligatorii
                    </Typography>

                    <Stack spacing={2.5}>
                      <Field name="vin">
                        {({ field }: any) => (
                          <TextField {...field} label="VIN" required fullWidth variant="outlined" error={touched.vin && !!errors.vin} helperText={touched.vin && errors.vin} InputProps={{ startAdornment: <NumbersIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        )}
                      </Field>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <Field name="placute">
                          {({ field }: any) => (
                            <TextField {...field} label="Plăcuțe" required fullWidth variant="outlined" error={touched.placute && !!errors.placute} helperText={touched.placute && errors.placute} InputProps={{ startAdornment: <TextSnippetIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          )}
                        </Field>
                        <Field name="an">
                          {({ field }: any) => (
                            <TextField {...field} label="An" type="number" required fullWidth variant="outlined" error={touched.an && !!errors.an} helperText={touched.an && errors.an} InputProps={{ startAdornment: <EventIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          )}
                        </Field>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <Field name="marca">
                          {({ field }: any) => (
                            <TextField {...field} label="Marcă" required fullWidth variant="outlined" error={touched.marca && !!errors.marca} helperText={touched.marca && errors.marca} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          )}
                        </Field>
                        <Field name="model">
                          {({ field }: any) => (
                            <TextField {...field} label="Model" required fullWidth variant="outlined" error={touched.model && !!errors.model} helperText={touched.model && errors.model} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          )}
                        </Field>
                        <Field name="culoare">
                          {({ field }: any) => (
                            <TextField {...field} label="Culoare" fullWidth variant="outlined" error={touched.culoare && !!errors.culoare} helperText={touched.culoare && errors.culoare} InputProps={{ startAdornment: <ColorLensIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          )}
                        </Field>
                      </Stack>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

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
                              <TextField {...field} label="Notă șofer" fullWidth variant="outlined" error={touched.driverNote && !!errors.driverNote} helperText={touched.driverNote && errors.driverNote} InputProps={{ startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                            )}
                          </Field>
                        </Box>
                        <Box sx={{ flex: { xs: '1 1 auto', sm: '1 1 0' } }}>
                          <Field name="combustibil">
                            {({ field }: any) => (
                              <TextField {...field} select label="Combustibil" fullWidth>
                                {FUEL_OPTIONS.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Field>
                        </Box>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                        <DatePicker label="Expirare ITP" format="DD/MM/YYYY" value={values.expItp as any} onChange={(d) => setFieldValue('expItp', d)} slotProps={{ textField: { fullWidth: true } }} />
                        <DatePicker label="Expirare RCA" format="DD/MM/YYYY" value={values.expRca as any} onChange={(d) => setFieldValue('expRca', d)} slotProps={{ textField: { fullWidth: true } }} />
                        <DatePicker label="Expirare Rovinietă" format="DD/MM/YYYY" value={values.expRovi as any} onChange={(d) => setFieldValue('expRovi', d)} slotProps={{ textField: { fullWidth: true } }} />
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
                  sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', '&:hover': { background: 'linear-gradient(135deg, #e084ea 0%, #e4495a 100%)' } }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {saving ? 'Se actualizează...' : 'Actualizează Mașină'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default EditCarModal;
