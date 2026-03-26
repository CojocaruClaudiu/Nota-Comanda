// src/modules/auto/EditCarModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, Tabs, Tab,
  TextField, Button, Stack, IconButton, Typography,
  Box, Divider, CircularProgress, Fade, MenuItem, Chip,
    FormControlLabel, Switch
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import TripOriginIcon from '@mui/icons-material/TripOrigin';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import EventIcon from '@mui/icons-material/Event';
import NumbersIcon from '@mui/icons-material/Numbers';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PersonIcon from '@mui/icons-material/Person';
import { Autocomplete } from '@mui/material';

import {
  updateCar,
  uploadCarDocument,
  deleteCarDocument,
  getCarDocumentUrl,
  fetchCarDocumentHistory,
  fetchCarTireHistory,
  deleteCarDocumentHistoryEntry,
  updateCarTireHistoryEntry,
  deleteCarTireHistoryEntry,
  type Car,
  type NormaEuro,
  type CarStatus,
  type CarDocumentType,
  type CarDocumentHistoryEntry,
  type CarTireHistoryEntry,
} from '../../api/cars';
import { type EmployeeWithStats } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';
import dayjs, { Dayjs } from 'dayjs';
import CarDocumentsSection, { EMPTY_CAR_DOCUMENT_FILES, type CarDocumentFileMap } from './CarDocumentsSection';

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
function fromIso(s?: string | null) {
  return s ? dayjs(s) : null;
}

function tireConditionLabel(isGood?: boolean | null) {
  if (isGood === true) return 'Anvelope bune';
  if (isGood === false) return 'De schimbat';
  return 'Stare necunoscută';
}

function tireSeasonLabel(season: 'WINTER' | 'SUMMER') {
  return season === 'WINTER' ? 'Iarnă' : 'Vară';
}

type TireHistoryDraft = {
  season: 'WINTER' | 'SUMMER';
  changedAt: Dayjs | null;
  isGood: boolean | null;
  tireName: string;
  tireDimensions: string;
  note: string;
};

const EMPTY_TIRE_HISTORY_DRAFT: TireHistoryDraft = {
  season: 'WINTER',
  changedAt: null,
  isGood: null,
  tireName: '',
  tireDimensions: '',
  note: '',
};

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
  normaEuro: Yup.mixed<NormaEuro>().oneOf(NORMA_EURO_OPTIONS.map(f => f.value)).nullable(),
  status: Yup.mixed<CarStatus>().oneOf(CAR_STATUS_OPTIONS.map(f => f.value)).nullable(),
  expItp: Yup.mixed().nullable(),
  expRca: Yup.mixed().nullable(),
  expRovi: Yup.mixed().nullable(),
  expCasco: Yup.mixed().nullable(),
  winterTiresChangedAt: Yup.mixed().nullable(),
  winterTiresGood: Yup.boolean().nullable(),
  winterTireName: Yup.string().max(80).nullable(),
  winterTireDimensions: Yup.string().max(80).nullable(),
  summerTiresChangedAt: Yup.mixed().nullable(),
  summerTiresGood: Yup.boolean().nullable(),
  summerTireName: Yup.string().max(80).nullable(),
  summerTireDimensions: Yup.string().max(80).nullable(),
  rcaDecontareDirecta: Yup.boolean().nullable(),
});

export const EditCarModal: React.FC<EditCarModalProps> = ({ open, car, onClose, onCarUpdated, employees }) => {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [docFiles, setDocFiles] = useState<CarDocumentFileMap>({ ...EMPTY_CAR_DOCUMENT_FILES });
  const [deletingDoc, setDeletingDoc] = useState<Partial<Record<CarDocumentType, boolean>>>({});
  const [docHistory, setDocHistory] = useState<CarDocumentHistoryEntry[]>([]);
  const [tireHistory, setTireHistory] = useState<CarTireHistoryEntry[]>([]);
  const [editingTireHistoryId, setEditingTireHistoryId] = useState<string | null>(null);
  const [tireHistoryDraft, setTireHistoryDraft] = useState<TireHistoryDraft>(EMPTY_TIRE_HISTORY_DRAFT);
  const [savingTireHistory, setSavingTireHistory] = useState(false);
  const [deletingTireHistoryId, setDeletingTireHistoryId] = useState<string | null>(null);
  const { successNotistack, errorNotistack } = useNotistack();

  // Fetch document history whenever the car changes
  useEffect(() => {
    if (!car?.id) { setDocHistory([]); return; }
    fetchCarDocumentHistory(car.id)
      .then(setDocHistory)
      .catch(() => setDocHistory([]));
  }, [car?.id]);

  useEffect(() => {
    if (!car?.id) { setTireHistory([]); return; }
    fetchCarTireHistory(car.id)
      .then(setTireHistory)
      .catch(() => setTireHistory([]));
  }, [car?.id]);

  useEffect(() => {
    setEditingTireHistoryId(null);
    setTireHistoryDraft(EMPTY_TIRE_HISTORY_DRAFT);
    setSavingTireHistory(false);
    setDeletingTireHistoryId(null);
  }, [car?.id, open]);

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
    normaEuro: (car?.normaEuro || '') as NormaEuro | '',
    status: (car?.status || 'ACTIV') as CarStatus,
    expItp: fromIso(car?.expItp),
    expRca: fromIso(car?.expRca),
    expRovi: fromIso(car?.expRovi),
    expCasco: fromIso(car?.expCasco),
    winterTiresChangedAt: fromIso(car?.winterTiresChangedAt ?? car?.tiresChangedAt),
    winterTiresGood: car?.winterTiresGood ?? car?.tiresGood ?? true,
    winterTireName: car?.winterTireName ?? '',
    winterTireDimensions: car?.winterTireDimensions ?? '',
    summerTiresChangedAt: fromIso(car?.summerTiresChangedAt ?? car?.tiresChangedAt),
    summerTiresGood: car?.summerTiresGood ?? car?.tiresGood ?? true,
    summerTireName: car?.summerTireName ?? '',
    summerTireDimensions: car?.summerTireDimensions ?? '',
    rcaDecontareDirecta: car?.rcaDecontareDirecta ?? false,
  }), [car]);

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

  const existingDocumentPaths = useMemo(
    () => ({
      RCA: car?.rcaDocument ?? null,
      CASCO: car?.cascoDocument ?? null,
      VINIETA: car?.vinietaDocument ?? null,
      ITP: car?.itpDocument ?? null,
    }),
    [car?.rcaDocument, car?.cascoDocument, car?.vinietaDocument, car?.itpDocument],
  );

  const handleDeleteExistingDocument = async (type: CarDocumentType) => {
    if (!car || saving) return;
    try {
      setDeletingDoc((prev) => ({ ...prev, [type]: true }));
      const updated = await deleteCarDocument(car.id, type);
      onCarUpdated(updated);
      successNotistack(`Documentul ${type} a fost șters.`);
    } catch (error: any) {
      errorNotistack(error?.message || `Nu am putut șterge documentul ${type}`);
    } finally {
      setDeletingDoc((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!car) return;
    await deleteCarDocumentHistoryEntry(car.id, historyId);
    setDocHistory((prev) => prev.filter((e) => e.id !== historyId));
  };

  const beginEditTireHistory = (entry: CarTireHistoryEntry) => {
    setEditingTireHistoryId(entry.id);
    setTireHistoryDraft({
      season: entry.season,
      changedAt: fromIso(entry.changedAt),
      isGood: entry.isGood ?? null,
      tireName: entry.tireName ?? '',
      tireDimensions: entry.tireDimensions ?? '',
      note: entry.note ?? '',
    });
  };

  const cancelEditTireHistory = () => {
    setEditingTireHistoryId(null);
    setTireHistoryDraft(EMPTY_TIRE_HISTORY_DRAFT);
  };

  const saveTireHistoryEdit = async () => {
    if (!car || !editingTireHistoryId) return;

    try {
      setSavingTireHistory(true);
      const updatedEntry = await updateCarTireHistoryEntry(car.id, editingTireHistoryId, {
        season: tireHistoryDraft.season,
        changedAt: toIso(tireHistoryDraft.changedAt),
        isGood: tireHistoryDraft.isGood,
        tireName: tireHistoryDraft.tireName.trim() || null,
        tireDimensions: tireHistoryDraft.tireDimensions.trim() || null,
        note: tireHistoryDraft.note.trim() || null,
      });

      setTireHistory((prev) =>
        prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
      );
      successNotistack('Intrarea din istoricul anvelopelor a fost actualizată.');
      cancelEditTireHistory();
    } catch (error: any) {
      errorNotistack(error?.message || 'Nu am putut actualiza intrarea din istoricul anvelopelor.');
    } finally {
      setSavingTireHistory(false);
    }
  };

  const handleDeleteTireHistory = async (historyId: string) => {
    if (!car) return;
    const shouldDelete = window.confirm('Sigur vrei să ștergi această intrare din istoricul anvelopelor?');
    if (!shouldDelete) return;

    try {
      setDeletingTireHistoryId(historyId);
      await deleteCarTireHistoryEntry(car.id, historyId);
      setTireHistory((prev) => prev.filter((entry) => entry.id !== historyId));
      if (editingTireHistoryId === historyId) {
        cancelEditTireHistory();
      }
      successNotistack('Intrarea din istoricul anvelopelor a fost ștearsă.');
    } catch (error: any) {
      errorNotistack(error?.message || 'Nu am putut șterge intrarea din istoricul anvelopelor.');
    } finally {
      setDeletingTireHistoryId(null);
    }
  };

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
            normaEuro: (values.normaEuro || null) as any,
            status: values.status as CarStatus,
            expItp: toIso(values.expItp as any),
            expRca: toIso(values.expRca as any),
            expRovi: toIso(values.expRovi as any),
            expCasco: toIso(values.expCasco as any),
            winterTiresChangedAt: toIso(values.winterTiresChangedAt as any),
            winterTiresGood: values.winterTiresGood ?? true,
            winterTireName: values.winterTireName?.trim() || null,
            winterTireDimensions: values.winterTireDimensions?.trim() || null,
            summerTiresChangedAt: toIso(values.summerTiresChangedAt as any),
            summerTiresGood: values.summerTiresGood ?? true,
            summerTireName: values.summerTireName?.trim() || null,
            summerTireDimensions: values.summerTireDimensions?.trim() || null,
            rcaDecontareDirecta: values.rcaDecontareDirecta ?? false,
          };
          let updated = await updateCar(car.id, payload);

          const pendingUploads = (Object.entries(docFiles) as Array<[CarDocumentType, File | null]>)
            .flatMap(([type, file]) => (file ? [{ type, file }] : []));

          if (pendingUploads.length > 0) {
            let uploadedCount = 0;
            for (const { type, file } of pendingUploads) {
              try {
                updated = await uploadCarDocument(car.id, type, file, values.placute);
                uploadedCount += 1;
              } catch (uploadError: any) {
                errorNotistack(`Document ${type}: ${uploadError?.message || 'Nu am putut încărca fișierul'}`);
              }
            }

            if (uploadedCount === pendingUploads.length) {
              successNotistack('Mașina și documentele au fost actualizate cu succes!');
            } else if (uploadedCount > 0) {
              successNotistack(`Mașina a fost actualizată. Documente încărcate: ${uploadedCount}/${pendingUploads.length}.`);
            } else {
              successNotistack('Mașina a fost actualizată. Documentele nu au fost încărcate.');
            }
          } else {
            successNotistack('Mașina a fost actualizată cu succes!');
          }

          onCarUpdated(updated);
          // Refresh history after uploads
          if (car?.id) {
            fetchCarDocumentHistory(car.id).then(setDocHistory).catch(() => {});
            fetchCarTireHistory(car.id).then(setTireHistory).catch(() => {});
          }
          setActiveTab(0);
          setDocFiles({ ...EMPTY_CAR_DOCUMENT_FILES });
          handleClose();
        } catch (e: any) {
          errorNotistack(e?.message || 'Nu am putut actualiza mașina');
        } finally {
          setSaving(false);
        }
      }}
      enableReinitialize
      key={car?.id || 'none'}
    >
      {({ values, errors, touched, isValid, dirty, setFieldValue }) => {
        const hasPendingDocs = Object.values(docFiles).some((file) => Boolean(file));

        return (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' } }}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <Form style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                          value={values.winterTiresChangedAt as any}
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
                          value={values.summerTiresChangedAt as any}
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

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                      Istoric seturi vechi
                    </Typography>

                    {tireHistory.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nu există încă seturi vechi înregistrate.
                      </Typography>
                    ) : (
                      <Stack spacing={1.2}>
                        {tireHistory.map((entry) => {
                          const seasonColor: 'info' | 'warning' = entry.season === 'WINTER' ? 'info' : 'warning';
                          const conditionColor: 'success' | 'error' | 'default' =
                            entry.isGood === true ? 'success' : entry.isGood === false ? 'error' : 'default';
                          const isEditing = editingTireHistoryId === entry.id;

                          return (
                            <Box
                              key={entry.id}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                p: 1.5,
                                bgcolor: 'background.paper',
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip size="small" color={seasonColor} label={tireSeasonLabel(entry.season)} />
                                  <Chip size="small" color={conditionColor} variant={entry.isGood == null ? 'outlined' : 'filled'} label={tireConditionLabel(entry.isGood)} />
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Typography variant="caption" color="text.secondary">
                                    Înlocuite la: {dayjs(entry.replacedAt).format('DD/MM/YYYY HH:mm')}
                                  </Typography>
                                  {!isEditing && (
                                    <>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => beginEditTireHistory(entry)}
                                        disabled={savingTireHistory || deletingTireHistoryId === entry.id}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        Editează
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="text"
                                        color="error"
                                        onClick={() => handleDeleteTireHistory(entry.id)}
                                        disabled={savingTireHistory || deletingTireHistoryId === entry.id}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        {deletingTireHistoryId === entry.id ? 'Se șterge...' : 'Șterge'}
                                      </Button>
                                    </>
                                  )}
                                  {isEditing && (
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={cancelEditTireHistory}
                                      disabled={savingTireHistory}
                                      sx={{ textTransform: 'none' }}
                                    >
                                      Renunță
                                    </Button>
                                  )}
                                </Stack>
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                Ultima schimbare set vechi: {entry.changedAt ? dayjs(entry.changedAt).format('DD/MM/YYYY') : 'Fără dată'}
                              </Typography>
                              {(entry.tireName || entry.tireDimensions) && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {entry.tireName || 'Fără nume'}
                                  {entry.tireDimensions ? ` · ${entry.tireDimensions}` : ''}
                                </Typography>
                              )}
                              {entry.note && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Notă: {entry.note}
                                </Typography>
                              )}

                              {isEditing && (
                                <Box
                                  sx={{
                                    mt: 1.5,
                                    pt: 1.5,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Stack spacing={1.5}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                      <TextField
                                        select
                                        label="Sezon"
                                        value={tireHistoryDraft.season}
                                        onChange={(e) =>
                                          setTireHistoryDraft((prev) => ({
                                            ...prev,
                                            season: e.target.value as 'WINTER' | 'SUMMER',
                                          }))
                                        }
                                        fullWidth
                                        size="small"
                                      >
                                        <MenuItem value="WINTER">Iarnă</MenuItem>
                                        <MenuItem value="SUMMER">Vară</MenuItem>
                                      </TextField>

                                      <DatePicker
                                        label="Ultima schimbare"
                                        format="DD/MM/YYYY"
                                        value={tireHistoryDraft.changedAt}
                                        onChange={(d) =>
                                          setTireHistoryDraft((prev) => ({
                                            ...prev,
                                            changedAt: d,
                                          }))
                                        }
                                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                      />
                                    </Stack>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                      <TextField
                                        label="Nume anvelope"
                                        placeholder="Ex: Michelin Alpin 6"
                                        value={tireHistoryDraft.tireName}
                                        onChange={(e) =>
                                          setTireHistoryDraft((prev) => ({
                                            ...prev,
                                            tireName: e.target.value,
                                          }))
                                        }
                                        fullWidth
                                        size="small"
                                      />
                                      <TextField
                                        label="Dimensiuni"
                                        placeholder="Ex: 205/55 R16"
                                        value={tireHistoryDraft.tireDimensions}
                                        onChange={(e) =>
                                          setTireHistoryDraft((prev) => ({
                                            ...prev,
                                            tireDimensions: e.target.value,
                                          }))
                                        }
                                        fullWidth
                                        size="small"
                                      />
                                    </Stack>

                                    <TextField
                                      select
                                      label="Stare"
                                      value={
                                        tireHistoryDraft.isGood === true
                                          ? 'GOOD'
                                          : tireHistoryDraft.isGood === false
                                            ? 'BAD'
                                            : 'UNKNOWN'
                                      }
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setTireHistoryDraft((prev) => ({
                                          ...prev,
                                          isGood: value === 'GOOD' ? true : value === 'BAD' ? false : null,
                                        }));
                                      }}
                                      fullWidth
                                      size="small"
                                    >
                                      <MenuItem value="GOOD">Anvelope bune</MenuItem>
                                      <MenuItem value="BAD">Anvelope de schimbat</MenuItem>
                                      <MenuItem value="UNKNOWN">Stare necunoscută</MenuItem>
                                    </TextField>

                                    <TextField
                                      label="Notă"
                                      placeholder="Detalii suplimentare despre setul vechi"
                                      value={tireHistoryDraft.note}
                                      onChange={(e) =>
                                        setTireHistoryDraft((prev) => ({
                                          ...prev,
                                          note: e.target.value,
                                        }))
                                      }
                                      multiline
                                      minRows={2}
                                      fullWidth
                                      size="small"
                                    />

                                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={cancelEditTireHistory}
                                        disabled={savingTireHistory}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        Renunță
                                      </Button>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={saveTireHistoryEdit}
                                        disabled={savingTireHistory}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        {savingTireHistory ? 'Se salvează...' : 'Salvează'}
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Box>

              {/* Tab 3: Documente */}
              <Box sx={{ p: 3, display: activeTab === 3 ? 'block' : 'none' }}>
                <CarDocumentsSection
                  files={docFiles}
                  existingPaths={existingDocumentPaths}
                  deletingTypes={deletingDoc}
                  disableActions={saving}
                  onPickFile={setDocFile}
                  onDeleteExisting={handleDeleteExistingDocument}
                  toPublicUrl={getCarDocumentUrl}
                  expiryDates={{
                    ITP: values.expItp as any,
                    RCA: values.expRca as any,
                    CASCO: values.expCasco as any,
                    VINIETA: values.expRovi as any,
                  }}
                  onExpiryDateChange={(type, d) => {
                    const fieldMap: Record<CarDocumentType, string> = {
                      ITP: 'expItp', RCA: 'expRca', CASCO: 'expCasco', VINIETA: 'expRovi',
                    };
                    setFieldValue(fieldMap[type], d);
                  }}
                  rcaDecontareDirecta={values.rcaDecontareDirecta}
                  onRcaDecontareChange={(checked) => setFieldValue('rcaDecontareDirecta', checked)}
                  history={docHistory}
                  onDeleteHistory={handleDeleteHistory}
                />
              </Box>
            </DialogContent>

            {/* Actions */}
            <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} disabled={saving} variant="outlined" size="large" sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}>
                  Anulează
                </Button>
                <Button type="submit" disabled={!isValid || (!dirty && !hasPendingDocs) || saving} variant="contained" size="large"
                  sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', '&:hover': { background: 'linear-gradient(135deg, #e084ea 0%, #e4495a 100%)' } }}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                >
                  {saving ? 'Se actualizează...' : 'Actualizează Mașină'}
                </Button>
              </Stack>
            </Box>
          </Form>
        </Dialog>
      );
      }}
    </Formik>
  );
};

export default EditCarModal;
