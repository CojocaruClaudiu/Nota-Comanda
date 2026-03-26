// src/modules/auto/AddCarModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent, Tabs, Tab,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, MenuItem,
    FormControlLabel, Switch
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TripOriginIcon from '@mui/icons-material/TripOrigin';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import EventIcon from '@mui/icons-material/Event';
import NumbersIcon from '@mui/icons-material/Numbers';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PersonIcon from '@mui/icons-material/Person';
import { Autocomplete } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import {
  createCar,
  uploadCarDocument,
  getCarDocumentUrl,
  type CarPayload,
  type NormaEuro,
  type CarStatus,
  type CarDocumentType,
} from '../../api/cars';
import { type EmployeeWithStats } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';
import { Dayjs } from 'dayjs';
import CarDocumentsSection, { EMPTY_CAR_DOCUMENT_FILES, type CarDocumentFileMap } from './CarDocumentsSection';

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

const NORMA_EURO_OPTIONS: { value: NormaEuro; label: string }[] = [
  { value: 'EURO_3', label: 'Euro 3' },
  { value: 'EURO_4', label: 'Euro 4' },
  { value: 'EURO_5', label: 'Euro 5' },
  { value: 'EURO_6', label: 'Euro 6' },
];

const CAR_STATUS_OPTIONS: { value: CarStatus; label: string }[] = [
  { value: 'ACTIV', label: 'Activ' },
  { value: 'IN_REPARATIE', label: 'În reparație' },
  { value: 'RETRAS', label: 'Retras' },
  { value: 'VANDUT', label: 'Vândut' },
];

const CAR_INACTIVE_STATUS_OPTIONS = CAR_STATUS_OPTIONS.filter((option) => option.value !== 'ACTIV');

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
  normaEuro: Yup.mixed<NormaEuro>().oneOf(NORMA_EURO_OPTIONS.map(f => f.value)).nullable(),
  status: Yup.mixed<CarStatus>().oneOf(CAR_STATUS_OPTIONS.map(f => f.value)).nullable(),
  expItp: Yup.mixed().nullable(),
  expRca: Yup.mixed().nullable(),
  expRovi: Yup.mixed().nullable(),
  expCasco: Yup.mixed().nullable(),
  winterTiresChangedAt: Yup.mixed().nullable(),
  winterTiresGood: Yup.boolean().nullable(),
  winterTireName: Yup.string().max(120).nullable(),
  winterTireDimensions: Yup.string().max(120).nullable(),
  summerTiresChangedAt: Yup.mixed().nullable(),
  summerTiresGood: Yup.boolean().nullable(),
  summerTireName: Yup.string().max(120).nullable(),
  summerTireDimensions: Yup.string().max(120).nullable(),
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
  normaEuro: '' as NormaEuro | '',
  status: 'ACTIV' as CarStatus,
  expItp: null as Dayjs | null,
  expRca: null as Dayjs | null,
  expRovi: null as Dayjs | null,
  expCasco: null as Dayjs | null,
  winterTiresChangedAt: null as Dayjs | null,
  winterTiresGood: true as boolean,
  winterTireName: '',
  winterTireDimensions: '',
  summerTiresChangedAt: null as Dayjs | null,
  summerTiresGood: true as boolean,
  summerTireName: '',
  summerTireDimensions: '',
  rcaDecontareDirecta: false as boolean,
};

export const AddCarModal: React.FC<AddCarModalProps> = ({ open, onClose, onCarAdded, employees }) => {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [docFiles, setDocFiles] = useState<CarDocumentFileMap>({ ...EMPTY_CAR_DOCUMENT_FILES });
  const { successNotistack, errorNotistack } = useNotistack();

  const handleClose = () => {
    if (!saving) {
      setActiveTab(0);
      setDocFiles({ ...EMPTY_CAR_DOCUMENT_FILES });
      onClose();
    }
  };

  const setDocFile = (type: CarDocumentType, file: File | null) => {
    setDocFiles((prev) => ({ ...prev, [type]: file }));
  };

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
            normaEuro: (values.normaEuro || null) as any,
            status: values.status as CarStatus,
            expItp: toIso(values.expItp),
            expRca: toIso(values.expRca),
            expRovi: toIso(values.expRovi),
            expCasco: toIso(values.expCasco),
            winterTiresChangedAt: toIso(values.winterTiresChangedAt),
            winterTiresGood: values.winterTiresGood ?? true,
            winterTireName: values.winterTireName?.trim() || null,
            winterTireDimensions: values.winterTireDimensions?.trim() || null,
            summerTiresChangedAt: toIso(values.summerTiresChangedAt),
            summerTiresGood: values.summerTiresGood ?? true,
            summerTireName: values.summerTireName?.trim() || null,
            summerTireDimensions: values.summerTireDimensions?.trim() || null,
            rcaDecontareDirecta: values.rcaDecontareDirecta ?? false,
          };
          const created = await createCar(payload);

          let latestCar = created;
          const pendingUploads = (Object.entries(docFiles) as Array<[CarDocumentType, File | null]>)
            .flatMap(([type, file]) => (file ? [{ type, file }] : []));

          if (pendingUploads.length > 0) {
            let uploadedCount = 0;
            for (const { type, file } of pendingUploads) {
              try {
                latestCar = await uploadCarDocument(created.id, type, file, values.placute);
                uploadedCount += 1;
              } catch (uploadError: any) {
                errorNotistack(`Document ${type}: ${uploadError?.message || 'Nu am putut încărca fișierul'}`);
              }
            }

            if (uploadedCount === pendingUploads.length) {
              successNotistack('Mașina și documentele au fost salvate cu succes!');
            } else if (uploadedCount > 0) {
              successNotistack(`Mașina a fost adăugată. Documente încărcate: ${uploadedCount}/${pendingUploads.length}.`);
            } else {
              successNotistack('Mașina a fost adăugată. Documentele nu au fost încărcate.');
            }
          } else {
            successNotistack('Mașina a fost adăugată cu succes!');
          }

          onCarAdded(latestCar);
          resetForm();
          setActiveTab(0);
          setDocFiles({ ...EMPTY_CAR_DOCUMENT_FILES });
          handleClose();
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
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
            }
          }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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

            {/* Tab navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2 }}>
                <Tab label="Date obligatorii" icon={<BadgeIcon />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }} />
                <Tab label="Detalii opționale" icon={<LocalGasStationIcon />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }} />
                <Tab label="Anvelope" icon={<TripOriginIcon />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }} />
                <Tab label="Documente" icon={<DescriptionOutlinedIcon />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }} />
              </Tabs>
            </Box>

            {/* Content */}
            <DialogContent sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
              {/* Tab 0: Date obligatorii */}
              <Box sx={{ p: 3, display: activeTab === 0 ? 'block' : 'none' }}>
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
                            InputProps={{
                              startAdornment: <NumbersIcon sx={{ color: 'action.active', mr: 1 }} />,
                              endAdornment: (
                                <Stack direction="row" alignItems="center" sx={{ ml: 1 }}>
                                  <Divider orientation="vertical" flexItem sx={{ height: 24, my: 'auto', mx: 1, opacity: 0.5 }} />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={values.status === 'ACTIV'}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFieldValue('status', 'ACTIV');
                                          } else {
                                            setFieldValue('status', values.status !== 'ACTIV' ? values.status : 'IN_REPARATIE');
                                          }
                                        }}
                                        size="small"
                                        color="success"
                                      />
                                    }
                                    label={
                                      <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        color={values.status === 'ACTIV' ? 'success.main' : 'text.secondary'}
                                        sx={{ minWidth: 48 }}
                                      >
                                        {values.status === 'ACTIV' ? 'Activ' : 'Inactiv'}
                                      </Typography>
                                    }
                                    sx={{ mr: 0, ml: 0.5 }}
                                  />
                                </Stack>
                              ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, pr: 1 } }}
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

              {/* Tab 1: Detalii opționale */}
              <Box sx={{ p: 3, display: activeTab === 1 ? 'block' : 'none' }}>
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
                        <Box sx={{ flex: { xs: '1 1 auto', sm: '1 1 0' } }}>
                          <Field name="normaEuro">
                            {({ field }: any) => (
                              <TextField {...field} select label="Normă Euro" fullWidth>
                                <MenuItem value=""><em>—</em></MenuItem>
                                {NORMA_EURO_OPTIONS.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Field>
                        </Box>
                        {values.status !== 'ACTIV' && (
                          <Box sx={{ flex: { xs: '1 1 auto', sm: '1 1 0' } }}>
                            <TextField
                              select
                              label="Motiv inactiv"
                              value={values.status}
                              onChange={(e) => setFieldValue('status', e.target.value)}
                              fullWidth
                            >
                              {CAR_INACTIVE_STATUS_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                              ))}
                            </TextField>
                          </Box>
                        )}
                      </Stack>

                </Stack>
              </Box>

              {/* Tab 2: Anvelope */}
              <Box sx={{ p: 3, display: activeTab === 2 ? 'block' : 'none' }}>
                <Stack spacing={2.5}>
                  <Typography variant="h6" fontWeight={600}>Seturi anvelope curente</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fiecare mașină are două seturi: iarnă și vară. Când se schimbă setul în editare, setul anterior intră în istoric.
                  </Typography>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                    <Box
                      sx={{
                        flex: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Set iarnă</Typography>
                      <Stack spacing={2}>
                        <DatePicker
                          label="Ultima schimbare"
                          format="DD/MM/YYYY"
                          value={values.winterTiresChangedAt}
                          onChange={(d) => setFieldValue('winterTiresChangedAt', d)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />

                        <Field name="winterTireName">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Nume anvelope"
                              placeholder="Ex: Michelin Alpin 6"
                              fullWidth
                              variant="outlined"
                            />
                          )}
                        </Field>

                        <Field name="winterTireDimensions">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Dimensiuni"
                              placeholder="Ex: 205/55 R16"
                              fullWidth
                              variant="outlined"
                            />
                          )}
                        </Field>

                        <FormControlLabel
                          sx={{
                            m: 0,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: values.winterTiresGood ? 'success.light' : 'error.light',
                            '& .MuiFormControlLabel-label': {
                              fontWeight: 600,
                              color: values.winterTiresGood ? 'success.dark' : 'error.dark',
                            },
                          }}
                          control={
                            <Switch
                              checked={Boolean(values.winterTiresGood)}
                              onChange={(e) => setFieldValue('winterTiresGood', e.target.checked)}
                              color={values.winterTiresGood ? 'success' : 'error'}
                            />
                          }
                          label={values.winterTiresGood ? 'Anvelope bune' : 'Anvelope de schimbat'}
                        />
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Set vară</Typography>
                      <Stack spacing={2}>
                        <DatePicker
                          label="Ultima schimbare"
                          format="DD/MM/YYYY"
                          value={values.summerTiresChangedAt}
                          onChange={(d) => setFieldValue('summerTiresChangedAt', d)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />

                        <Field name="summerTireName">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Nume anvelope"
                              placeholder="Ex: Continental PremiumContact"
                              fullWidth
                              variant="outlined"
                            />
                          )}
                        </Field>

                        <Field name="summerTireDimensions">
                          {({ field }: any) => (
                            <TextField
                              {...field}
                              label="Dimensiuni"
                              placeholder="Ex: 205/55 R16"
                              fullWidth
                              variant="outlined"
                            />
                          )}
                        </Field>

                        <FormControlLabel
                          sx={{
                            m: 0,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: values.summerTiresGood ? 'success.light' : 'error.light',
                            '& .MuiFormControlLabel-label': {
                              fontWeight: 600,
                              color: values.summerTiresGood ? 'success.dark' : 'error.dark',
                            },
                          }}
                          control={
                            <Switch
                              checked={Boolean(values.summerTiresGood)}
                              onChange={(e) => setFieldValue('summerTiresGood', e.target.checked)}
                              color={values.summerTiresGood ? 'success' : 'error'}
                            />
                          }
                          label={values.summerTiresGood ? 'Anvelope bune' : 'Anvelope de schimbat'}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              {/* Tab 3: Documente */}
              <Box sx={{ p: 3, display: activeTab === 3 ? 'block' : 'none' }}>
                <CarDocumentsSection
                  files={docFiles}
                  disableActions={saving}
                  onPickFile={setDocFile}
                  toPublicUrl={getCarDocumentUrl}
                  expiryDates={{
                    ITP: values.expItp,
                    RCA: values.expRca,
                    CASCO: values.expCasco,
                    VINIETA: values.expRovi,
                  }}
                  onExpiryDateChange={(type, d) => {
                    const fieldMap: Record<CarDocumentType, string> = {
                      ITP: 'expItp', RCA: 'expRca', CASCO: 'expCasco', VINIETA: 'expRovi',
                    };
                    setFieldValue(fieldMap[type], d);
                  }}
                  rcaDecontareDirecta={values.rcaDecontareDirecta}
                  onRcaDecontareChange={(checked) => setFieldValue('rcaDecontareDirecta', checked)}
                />
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
