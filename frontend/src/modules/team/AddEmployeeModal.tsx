import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Typography,
  Stack,
  Box,
  IconButton,
  Chip,
  Divider,
  Collapse,
  CircularProgress,
  Fade,
  ButtonBase,
  alpha,
  Switch,
  FormControlLabel
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import { DatePicker } from '@mui/x-date-pickers';
import {
  PersonAdd,
  Person,
  Work,
  Phone,
  Badge,
  ContactMail,
  Close,
  ExpandMore,
  History
} from '@mui/icons-material';
import dayjs from 'dayjs';

interface Employee {
  id: number;
  name: string;
  hiredAt: string;
  cnp?: string;
  birthDate?: string;
  phone?: string;
  qualifications?: string[];
  idSeries?: string;
  idNumber?: string;
  idIssuer?: string;
  idIssueDateISO?: string;
  county?: string;
  locality?: string;
  address?: string;
  manualCarryOverDays?: number;
}


interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => Promise<void>;
  saving?: boolean;
}

interface FormState {
  name: string;
  hiredAt: string | null;
  isActive?: boolean;
  cnp?: string;
  birthDate?: string | null;
  phone?: string;
  qualifications?: string[];
  idSeries?: string;
  idNumber?: string;
  idIssuer?: string;
  idIssueDateISO?: string | null;
  county?: string;
  locality?: string;
  address?: string;
  manualCarryOverDays?: string; // string for input handling
}

interface ValidationErrors {
  name?: string;
  hiredAt?: string;
  cnp?: string;
  birthDate?: string;
  phone?: string;
  idSeries?: string;
  idNumber?: string;
  idIssueDateISO?: string;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  open,
  onClose,
  onSave,
  saving = false
}) => {
  const [form, setForm] = useState<FormState>({
    name: '',
    hiredAt: null,
    isActive: true,
    cnp: '',
    birthDate: null,
    phone: '',
    qualifications: [],
    idSeries: '',
    idNumber: '',
    idIssuer: '',
    idIssueDateISO: null,
    county: '',
    locality: '',
    address: '',
    manualCarryOverDays: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Utility functions
  const toIsoDate = useCallback((d: dayjs.Dayjs | null): string | null => {
    return d?.isValid() ? d.format('YYYY-MM-DD') : null;
  }, []);

  const setDigits = useCallback((field: keyof FormState, maxLen?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (maxLen) val = val.slice(0, maxLen);
    setForm(f => ({ ...f, [field]: val }));
  }, []);

  const setUpper = useCallback((field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value.toUpperCase() }));
  }, []);

  const ageFromBirth = useCallback((birthDate?: string | null): number | null => {
    if (!birthDate) return null;
    return dayjs().diff(dayjs(birthDate), 'year');
  }, []);

  const tenureParts = useCallback((hiredAt?: string | null) => {
    if (!hiredAt) return { years: 0, months: 0 };
    const hired = dayjs(hiredAt);
    const now = dayjs();
    const years = now.diff(hired, 'year');
    const months = now.diff(hired.add(years, 'year'), 'month');
    return { years, months };
  }, []);

  const formatTenureRo = useCallback(({ years, months }: { years: number; months: number }): string => {
    if (years === 0 && months === 0) return 'nou angajat';
    if (years === 0) return `${months} luni`;
    if (months === 0) return `${years} ani`;
    return `${years} ani, ${months} luni`;
  }, []);

  // Validation
  const { errs, valid } = useMemo(() => {
    const newErrs: ValidationErrors = {};

    if (!form.name?.trim()) {
      newErrs.name = 'Numele este obligatoriu';
    }

    if (!form.hiredAt) {
      newErrs.hiredAt = 'Data angajării este obligatorie';
    } else if (dayjs(form.hiredAt).isAfter(dayjs(), 'day')) {
      newErrs.hiredAt = 'Data angajării nu poate fi în viitor';
    }

    if (form.cnp && form.cnp.length !== 13) {
      newErrs.cnp = 'CNP-ul trebuie să aibă exact 13 cifre';
    }

    if (form.phone && !/^(\+40|0)7\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
      newErrs.phone = 'Format telefon invalid (ex: 0722123456)';
    }

    if (form.idSeries && !/^[A-Z]{2,3}$/.test(form.idSeries)) {
      newErrs.idSeries = 'Serie CI invalidă (ex: AB)';
    }

    if (form.idNumber && !/^\d{6}$/.test(form.idNumber)) {
      newErrs.idNumber = 'Număr CI invalid (6 cifre)';
    }

    const isValid = Object.keys(newErrs).length === 0;
    return { errs: newErrs, valid: isValid };
  }, [form.name, form.hiredAt, form.cnp, form.phone, form.idSeries, form.idNumber]);

  const handleClose = useCallback(() => {
    setForm({
      name: '',
      hiredAt: null,
      isActive: true,
      cnp: '',
      birthDate: null,
      phone: '',
      qualifications: [],
      idSeries: '',
      idNumber: '',
      idIssuer: '',
      idIssueDateISO: null,
      county: '',
      locality: '',
      address: '',
      manualCarryOverDays: ''
    });
    setShowAdvanced(false);
    setShowErrors(false);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }

    const employeeData: Partial<Employee> = {
      name: form.name.trim(),
      hiredAt: form.hiredAt!,
      isActive: form.isActive ?? true,
      cnp: form.cnp || undefined,
      birthDate: form.birthDate || undefined,
      phone: form.phone || undefined,
      qualifications: form.qualifications?.filter(Boolean) || [],
      idSeries: form.idSeries || undefined,
      idNumber: form.idNumber || undefined,
      idIssuer: form.idIssuer || undefined,
      idIssueDateISO: form.idIssueDateISO || undefined,
      county: form.county || undefined,
      locality: form.locality || undefined,
      address: form.address || undefined,
      manualCarryOverDays: form.manualCarryOverDays ? Number(form.manualCarryOverDays) : undefined
    };

    await onSave(employeeData);
    handleClose();
  }, [valid, form, onSave, handleClose]);

  return (
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
            <PersonAdd fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="600">
              Adaugă Angajat Nou
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Completează informațiile angajatului
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
          <Close />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Required Fields Section */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person color="primary" />
                Informații Obligatorii
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Nume Complet"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Popescu Ion Andrei"
                  required
                  fullWidth
                  error={showErrors && !!errs.name}
                  helperText={showErrors ? errs.name : ''}
                  InputProps={{
                    startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />,
                    endAdornment: (
                      <Stack direction="row" alignItems="center" sx={{ ml: 1 }}>
                        <Divider orientation="vertical" flexItem sx={{ height: 24, my: 'auto', mx: 1, opacity: 0.5 }} />
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={form.isActive !== false}
                              onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                              size="small"
                              color="success" 
                            />
                          }
                          label={
                            <Typography variant="caption" fontWeight={600} color={form.isActive !== false ? "success.main" : "text.secondary"} sx={{ minWidth: 45 }}>
                              {form.isActive !== false ? "Activ" : "Inactiv"}
                            </Typography>
                          }
                          sx={{ mr: 0, ml: 0.5 }}
                        />
                      </Stack>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      pr: 1
                    }
                  }}
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="CNP"
                    value={form.cnp || ''}
                    onChange={setDigits('cnp', 13)}
                    placeholder="1234567890123"
                    inputProps={{ inputMode: 'numeric', maxLength: 13 }}
                    fullWidth
                    error={showErrors && !!errs.cnp}
                    helperText={showErrors ? errs.cnp : '13 cifre'}
                    InputProps={{
                      startAdornment: <Badge sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />

                  <TextField
                    label="Telefon"
                    value={form.phone || ''}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.trim() }))}
                    placeholder="Ex: 0722123456"
                    fullWidth
                    error={showErrors && !!errs.phone}
                    helperText={showErrors ? errs.phone : 'ex: 07xxxxxxxx sau +407xxxxxxxx'}
                    InputProps={{
                      startAdornment: <Phone sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <DatePicker
                    label="Data Angajării"
                    format="DD/MM/YYYY"
                    value={form.hiredAt ? dayjs(form.hiredAt) : null}
                    disableFuture
                    onChange={(d) => setForm(f => ({ ...f, hiredAt: toIsoDate(d) }))}
                    slotProps={{ 
                      textField: { 
                        required: true, 
                        fullWidth: true, 
                        error: showErrors && !!errs.hiredAt, 
                        helperText: showErrors ? errs.hiredAt : '',
                        InputProps: {
                          startAdornment: <Work sx={{ color: 'action.active', mr: 1 }} />,
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
                    value={form.birthDate ? dayjs(form.birthDate) : null}
                    onChange={(d) => setForm(f => ({ ...f, birthDate: toIsoDate(d) || null }))}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true, 
                        error: showErrors && !!errs.birthDate, 
                        helperText: showErrors ? errs.birthDate : 'Opțional',
                        InputProps: {
                          startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />,
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

                <TextField
                  label="Calificări"
                  value={(form.qualifications || []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, qualifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Ex: Șofer categoria B, Stivuitorist, Mecanic auto"
                  fullWidth
                  multiline
                  rows={2}
                  helperText="Separate prin virgulă (opțional)"
                  InputProps={{
                    startAdornment: <Work sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                  }}

                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />

                <TextField
                  label="Zile Reportate Manual"
                  value={form.manualCarryOverDays || ''}
                  onChange={setDigits('manualCarryOverDays')}
                  placeholder="0"
                  fullWidth
                  helperText="Zile de concediu reportate din anul anterior (suprascrie calculul automat)"
                  InputProps={{
                    startAdornment: <History sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Stack>
            </Box>

            {/* Live preview chips */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Previzualizare
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`Vârsta: ${ageFromBirth(form.birthDate) ?? '—'}`} />
                <Chip size="small" label={`Vechime: ${formatTenureRo(tenureParts(form.hiredAt))}`} />
                <Chip size="small" label={form.isActive === false ? 'Status: Inactiv' : 'Status: Activ'} />
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Optional Fields Section */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ContactMail color="secondary" />
                Informații Opționale
              </Typography>


              {/* Advanced section toggle */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<ExpandMore sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
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
                      <TextField
                        label="Serie CI"
                        value={form.idSeries || ''}
                        onChange={setUpper('idSeries')}
                        placeholder="AB"
                        inputProps={{ maxLength: 3 }}
                        error={!!errs.idSeries}
                        helperText={errs.idSeries}
                        sx={{ width: '120px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        label="Număr CI"
                        value={form.idNumber || ''}
                        onChange={setDigits('idNumber')}
                        placeholder="123456"
                        inputProps={{ inputMode: 'numeric' }}
                        error={!!errs.idNumber}
                        helperText={errs.idNumber}
                        sx={{ width: '150px', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        label="Emitent CI"
                        value={form.idIssuer || ''}
                        onChange={e => setForm(f => ({ ...f, idIssuer: e.target.value }))}
                        placeholder="SPCLEP București"
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Stack>
                    <DatePicker
                      label="Data Eliberării CI"
                      format="DD/MM/YYYY"
                      value={form.idIssueDateISO ? dayjs(form.idIssueDateISO) : null}
                      onChange={d => setForm(f => ({ ...f, idIssueDateISO: toIsoDate(d) }))}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, 
                          error: !!errs.idIssueDateISO, 
                          helperText: errs.idIssueDateISO,
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
                      <TextField
                        label="Județ"
                        value={form.county || ''}
                        onChange={e => setForm(f => ({ ...f, county: e.target.value }))}
                        placeholder="București"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        label="Localitate"
                        value={form.locality || ''}
                        onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
                        placeholder="Sectorul 1"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Stack>
                    <TextField
                      label="Adresă Completă"
                      value={form.address || ''}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Str. Aviatorilor Nr. 10, Bl. A1, Sc. B, Et. 3, Ap. 15"
                      fullWidth
                      multiline
                      rows={2}
                      sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
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
            onClick={handleSave}
            disabled={saving || !valid || !form.name || !form.hiredAt}
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
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
          >
            {saving ? 'Se salvează...' : 'Adaugă Angajat'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default AddEmployeeModal;
