// src/pages/team/EchipaPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
  Box, Paper, Stack, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Tooltip,
  CircularProgress, Chip, Divider, List, ListItem, ListItemText, Alert,
  Grid, Collapse
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';

import useNotistack from '../orders/hooks/useNotistack';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  addLeave, getLeaves, deleteLeave,
  type EmployeeWithStats, type EmployeePayload, type Leave, type LeavePayload
} from '../../api/employees';

// business-day helpers (weekend-aware)
import {
  businessEndDate,
  businessDatesForLeave,
  sumBusinessDaysForYear,
} from '../../utils/businessDays';
import { generateLeaveDocx, openPrintPreview } from '../../utils/leaveDocs';

dayjs.locale('ro');

/** ───────────────── Policy (adjust for your company) ───────────────── **/
const BASE_ANNUAL = 21;              // base days / year
const BONUS_EVERY_YEARS = 5;         // +1 day every 5 full years
const BONUS_PER_EVERY = 1;           // the bonus per step
const PRO_RATA_ROUND = Math.floor;   // conservative rounding

/** ───────────────── Small helpers ───────────────── **/
const dmy = (v?: string | Date | null) => {
  if (!v) return '—';
  const d = typeof v === 'string' ? dayjs(v) : dayjs(v);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
};
const toIsoDate = (d: Dayjs | null) => (d && d.isValid() ? d.format('YYYY-MM-DD') : '');

const isWeekend = (d: dayjs.Dayjs) => d.day() === 0 || d.day() === 6;
const nextBusinessDay = (d: dayjs.Dayjs) => {
  let cur = d.startOf('day');
  while (isWeekend(cur)) cur = cur.add(1, 'day');
  return cur;
};

const tenureParts = (start?: string | Date | null) => {
  if (!start) return null;
  let s = dayjs(start).startOf('day');
  if (!s.isValid()) return null;
  const now = dayjs().startOf('day');

  const years = now.diff(s, 'year');
  s = s.add(years, 'year');
  const months = now.diff(s, 'month');
  s = s.add(months, 'month');
  const days = now.diff(s, 'day');
  return { years, months, days };
};
const formatTenureRo = (p: { years: number; months: number; days: number } | null) => {
  if (!p) return '—';
  const parts: string[] = [];
  if (p.years) parts.push(`${p.years} ${p.years === 1 ? 'an' : 'ani'}`);
  if (p.months) parts.push(`${p.months} ${p.months === 1 ? 'lună' : 'luni'}`);
  if (parts.length === 0 || p.days) parts.push(`${p.days} ${p.days === 1 ? 'zi' : 'zile'}`);
  if (parts.length <= 1) return parts[0] || '—';
  if (parts.length === 2) return `${parts[0]} și ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} și ${parts[parts.length - 1]}`;
};

/** ───────────────── Entitlement math ───────────────── **/
const annualEntitlementAtYearEnd = (hiredAt?: string | null, year?: number) => {
  if (!hiredAt) return BASE_ANNUAL;
  const ref = dayjs(`${year ?? dayjs().year()}-12-31`);
  const years = ref.diff(dayjs(hiredAt), 'year');
  const bonusSteps = Math.floor(years / BONUS_EVERY_YEARS);
  return BASE_ANNUAL + bonusSteps * BONUS_PER_EVERY;
};

const proRataForYear = (hiredAt?: string | null, year?: number) => {
  const y = year ?? dayjs().year();
  if (!hiredAt) return annualEntitlementAtYearEnd(hiredAt, y);

  const hire = dayjs(hiredAt);
  if (!hire.isValid()) return annualEntitlementAtYearEnd(hiredAt, y);

  const yStart = dayjs(`${y}-01-01`);
  const yEnd = dayjs(`${y}-12-31`);
  const totalDaysInYear = yEnd.diff(yStart, 'day') + 1;

  // hired before the year starts ⇒ full entitlement for that year
  if (hire.isBefore(yStart, 'day')) return annualEntitlementAtYearEnd(hiredAt, y);

  // hired during the year ⇒ pro-rata from hire → year end
  const daysEmployedThisYear = yEnd.diff(hire, 'day') + 1;
  const annual = annualEntitlementAtYearEnd(hiredAt, y);
  return PRO_RATA_ROUND((annual * daysEmployedThisYear) / totalDaysInYear);
};

const accruedToToday = (hiredAt?: string | null) => {
  if (!hiredAt) return 0;
  const hire = dayjs(hiredAt);
  if (!hire.isValid()) return 0;

  const now = dayjs();
  const y = now.year();
  const yStart = dayjs(`${y}-01-01`);
  const yEnd = dayjs(`${y}-12-31`);

  const from = hire.isBefore(yStart, 'day') ? yStart : hire;
  const denom = hire.isBefore(yStart, 'day')
    ? yEnd.diff(yStart, 'day') + 1
    : yEnd.diff(hire, 'day') + 1;

  const daysSoFar = now.diff(from, 'day') + 1;
  const yearEnt = proRataForYear(hiredAt, y);
  return PRO_RATA_ROUND((yearEnt * daysSoFar) / denom);
};

/** sum of leave days in a given year (weekend-aware) */
const sumTakenForYear = (history: Leave[], year: number) =>
  sumBusinessDaysForYear(history as any, year);

/** ───────────────── Columns ───────────────── **/
const mkColumns = (currentYear: number): MRT_ColumnDef<EmployeeWithStats>[] => [
  { accessorKey: 'name', header: 'Nume' },
  { accessorKey: 'cnp', header: 'CNP', size: 140 },
  {
    accessorKey: 'qualifications',
    header: 'Calificări',
    Cell: ({ cell }) => {
      const arr = (cell.getValue<string[]>() || []).filter(Boolean);
      return arr.length ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {arr.map((q, i) => <Chip key={i} label={q} size="small" />)}
        </Stack>
      ) : '—';
    },
  },
  { accessorKey: 'hiredAt', header: 'Angajat din', Cell: ({ cell }) => dmy(cell.getValue<string>()) },

  {
    id: 'tenure',
    header: 'Vechime',
    accessorFn: (row) => {
      const d = dayjs(row.hiredAt);
      return d.isValid() ? dayjs().diff(d, 'day') : -1;
    },
    sortingFn: 'basic',
    sortDescFirst: true,
    size: 140,
    Cell: ({ row }) => (
      <Tooltip title="Deschide detalii">
        <Chip
          label={formatTenureRo(tenureParts(row.original.hiredAt))}
          size="small"
          onClick={() => row.toggleExpanded()}
          clickable
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>
    ),
  },

  // Entitlements + accrual
  { id: 'annualEnt', header: 'Drept/an', accessorFn: (r) => annualEntitlementAtYearEnd(r.hiredAt), size: 90 },
  { id: 'yearEnt', header: `Drept ${currentYear}`, accessorFn: (r) => proRataForYear(r.hiredAt, currentYear), size: 110 },
  { id: 'accruedToday', header: 'Acumulat azi', accessorFn: (r) => accruedToToday(r.hiredAt), size: 120 },

  { accessorKey: 'takenDays', header: 'Folosite (an)' },

  {
    id: 'remainingToday',
    header: 'Rămase azi',
    accessorFn: (r) => Math.max(0, accruedToToday(r.hiredAt) - Number(r.takenDays || 0)),
  },
];

/** ───────────────── Component ───────────────── **/
export default function EchipaPage() {
  const { successNotistack, errorNotistack } = useNotistack();

  const [rows, setRows] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<EmployeeWithStats | null>(null);
  const [openLeave, setOpenLeave] = useState<EmployeeWithStats | null>(null);
  const [openHistory, setOpenHistory] = useState<EmployeeWithStats | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // --- forms
  const emptyForm: EmployeePayload = {
    name: '',
    qualifications: [],
    hiredAt: '',
    birthDate: null,
    cnp: '',
    idSeries: '',
    idNumber: '',
    idIssuer: '',
    idIssueDateISO: '',
    county: '',
    locality: '',
    address: '',
    phone: '',
  } as EmployeePayload;

  const [form, setForm] = useState<EmployeePayload>(emptyForm);
  const [leaveForm, setLeaveForm] = useState<LeavePayload>({ startDate: '', days: 1, note: '' });
  const [history, setHistory] = useState<Leave[]>([]);
  const [saving, setSaving] = useState(false);

  // History year filter
  const [historyYear, setHistoryYear] = useState<number | 'all'>(dayjs().year());

  // Leave UI help
  const [startMsg, setStartMsg] = useState<string>('');

  const currentYear = dayjs().year();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees();
      setRows(data);
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcarea echipei';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  const cols = useMemo(() => mkColumns(currentYear), [currentYear]);
  const parseQuals = (text: string): string[] => text.split(',').map(s => s.trim()).filter(Boolean);

  /** CRUD */
  const doCreate = async () => {
    try {
      setSaving(true);
      await createEmployee(form);
      setOpenAdd(false);
      setForm(emptyForm);
      await load();
      successNotistack('Angajat adăugat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut adăuga angajatul');
    } finally { setSaving(false); }
  };
  const doUpdate = async () => {
    if (!openEdit) return;
    try {
      setSaving(true);
      await updateEmployee(openEdit.id, form);
      setOpenEdit(null);
      await load();
      successNotistack('Angajat actualizat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut actualiza angajatul');
    } finally { setSaving(false); }
  };
  const doDelete = async (id: string) => {
    try {
      setSaving(true);
      await deleteEmployee(id);
      await load();
      successNotistack('Angajat șters');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge angajatul');
    } finally { setSaving(false); }
  };

  /** Leave */
  const doAddLeave = async () => {
    if (!openLeave) return;
    try {
      setSaving(true);

      await addLeave(openLeave.id, leaveForm);

      // generate: .docx + print preview
      await generateLeaveDocx({
        employeeName: openLeave.name,
        cnp: (openLeave as any).cnp,
        county: (openLeave as any).county,
        locality: (openLeave as any).locality,
        address: (openLeave as any).address,
        idSeries: (openLeave as any).idSeries,
        idNumber: (openLeave as any).idNumber,
        idIssuer: (openLeave as any).idIssuer,
        idIssueDateISO: (openLeave as any).idIssueDateISO,
        startISO: leaveForm.startDate,
        days: leaveForm.days,
        note: leaveForm.note,
        companyName: 'S.C. TOPAZ CONSTRUCT S.R.L.',
        companyCity: 'Băicoi',
      });

      openPrintPreview({
        employeeName: openLeave.name,
        cnp: (openLeave as any).cnp,
        county: (openLeave as any).county,
        locality: (openLeave as any).locality,
        address: (openLeave as any).address,
        idSeries: (openLeave as any).idSeries,
        idNumber: (openLeave as any).idNumber,
        idIssuer: (openLeave as any).idIssuer,
        idIssueDateISO: (openLeave as any).idIssueDateISO,
        startISO: leaveForm.startDate,
        days: leaveForm.days,
        note: leaveForm.note,
        companyName: 'S.C. TOPAZ CONSTRUCT S.R.L.',
        companyCity: 'Băicoi',
      });

      setOpenLeave(null);
      setLeaveForm({ startDate: '', days: 1, note: '' });
      await load();
      successNotistack('Concediu înregistrat. Am generat cererea și fereastra de print.');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut înregistra concediul');
    } finally { setSaving(false); }
  };

  /** History */
  const openHistoryDialog = async (row: EmployeeWithStats) => {
    try {
      setOpenHistory(row);
      setHistoryYear(dayjs().year());
      const h = await getLeaves(row.id);
      setHistory(h);
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut încărca istoricul concediilor');
    }
  };

  const yearsAvailable = useMemo(() => {
    const s = new Set<number>();
    history.forEach(h => { const y = dayjs(h.startDate).year(); if (!isNaN(y)) s.add(y); });
    return Array.from(s).sort((a, b) => b - a);
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (historyYear === 'all') return history;
    return history.filter(h => dayjs(h.startDate).year() === historyYear);
  }, [history, historyYear]);

  // Weekend-aware yearly total
  const totalDays = useMemo(() => {
    if (historyYear === 'all') return history.reduce((acc, h) => acc + (h.days || 0), 0);
    return sumBusinessDaysForYear(history as any, historyYear);
  }, [history, historyYear]);

  // Compute entitlement for the year shown in history dialog
  const entitlementForHistoryYear = useMemo(() => {
    if (!openHistory) return 0;
    const y = historyYear === 'all' ? currentYear : historyYear;
    return proRataForYear(openHistory.hiredAt, y);
  }, [openHistory, historyYear, currentYear]);

  // Live preview end date for Add Leave (weekend-aware)
  const previewEnd = useMemo(() => {
    return leaveForm.startDate && leaveForm.days
      ? businessEndDate(leaveForm.startDate, leaveForm.days)
      : null;
  }, [leaveForm.startDate, leaveForm.days]);

  /** ---------- Add Employee dialog helpers (validation + UX) ---------- */
  const isDigits = (s?: string, len?: number) => (s ?? '').match(len ? new RegExp(`^\\d{${len}}$`) : /^\d+$/);
  const ageFromBirth = (iso?: string | null) => {
    if (!iso) return null;
    const d = dayjs(iso);
    if (!d.isValid()) return null;
    return dayjs().diff(d, 'year');
  };
  const validateEmployee = (f: EmployeePayload) => {
    const errs: Record<string, string | undefined> = {};
    if (!f.name?.trim()) errs.name = 'Numele este obligatoriu';
    if (!f.hiredAt) errs.hiredAt = 'Data angajării este obligatorie';
    if (f.cnp && !isDigits(f.cnp, 13)) errs.cnp = 'CNP-ul trebuie să aibă 13 cifre';
    if (f.phone && !/^\+?\d{6,15}$/.test(f.phone)) errs.phone = 'Număr de telefon invalid';
    if (f.idSeries && !/^[A-Z]{1,3}$/.test(f.idSeries)) errs.idSeries = 'Serie 1–3 litere';
    if (f.idNumber && !isDigits(f.idNumber)) errs.idNumber = 'Doar cifre';
    if (f.idIssueDateISO && dayjs(f.idIssueDateISO).isAfter(dayjs(), 'day'))
      errs.idIssueDateISO = 'Nu poate fi în viitor';
    if (f.birthDate && dayjs(f.birthDate).isAfter(dayjs(), 'day'))
      errs.birthDate = 'Nu poate fi în viitor';
    return { errs, valid: Object.values(errs).every(v => !v) };
  };
  const { errs, valid } = useMemo(() => validateEmployee(form), [form]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const setDigits = (key: keyof EmployeePayload, len?: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value.replace(/\D+/g, '');
      if (len) v = v.slice(0, len);
      setForm(f => ({ ...f, [key]: v }));
    };
  const setUpper = (key: keyof EmployeePayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value.toUpperCase() }));

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Echipă</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setOpenAdd(true)}>Adaugă angajat</Button>
            <Button variant="contained" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <MaterialReactTable
          columns={cols}
          data={rows}
          state={{ isLoading: loading }}

          enableRowActions
          positionActionsColumn="last"
          renderRowActions={({ row }) => (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Istoric concedii">
                <span>
                  <IconButton size="small" onClick={() => openHistoryDialog(row.original)}>
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Adaugă concediu">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setOpenLeave(row.original);
                      setLeaveForm({ startDate: '', days: 1, note: '' });
                      setStartMsg('');
                    }}
                  >
                    <EventAvailableIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Editează">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setOpenEdit(row.original);
                      setForm({
                        name: row.original.name,
                        qualifications: row.original.qualifications,
                        hiredAt: dayjs(row.original.hiredAt).isValid()
                          ? dayjs(row.original.hiredAt).format('YYYY-MM-DD')
                          : '',
                        birthDate: row.original.birthDate
                          ? dayjs(row.original.birthDate).format('YYYY-MM-DD')
                          : null,
                        cnp: (row.original as any).cnp || '',
                        idSeries: (row.original as any).idSeries || '',
                        idNumber: (row.original as any).idNumber || '',
                        idIssuer: (row.original as any).idIssuer || '',
                        idIssueDateISO: (row.original as any).idIssueDateISO || '',
                        county: (row.original as any).county || '',
                        locality: (row.original as any).locality || '',
                        address: (row.original as any).address || '',
                        phone: (row.original as any).phone || '',
                      } as EmployeePayload);
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Șterge">
                <span>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => setConfirmDelete(row.original.id)}
                    disabled={saving}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}

          enableExpanding
          getRowCanExpand={() => true}
          positionExpandColumn="first"
          renderDetailPanel={({ row }) => {
            const ann = annualEntitlementAtYearEnd(row.original.hiredAt);
            const yearEnt = proRataForYear(row.original.hiredAt, currentYear);
            const accToday = accruedToToday(row.original.hiredAt);
            const used = Number(row.original.takenDays || 0);
            const remainToday = Math.max(0, accToday - used);
            const remainYear = Math.max(0, yearEnt - used);

            return (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                  <Chip color="primary" label={`Vechime: ${formatTenureRo(tenureParts(row.original.hiredAt))}`} />
                  <Chip label={`Angajat din: ${dmy(row.original.hiredAt)}`} />
                  <Chip label={`Drept/an: ${ann}`} />
                  <Chip label={`Drept ${currentYear}: ${yearEnt}`} />
                  <Chip label={`Acumulat azi: ${accToday}`} />
                  <Chip color="warning" label={`Folosite (an): ${used}`} />
                  <Chip color="success" label={`Rămase azi: ${remainToday}`} />
                  <Chip variant="outlined" label={`Rămase pe an: ${remainYear}`} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  * Zilele rămase se calculează pro-rata.
                </Typography>
              </Box>
            );
          }}

          initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
        />
      </Paper>

      {/* ---------------- Add Employee (redesigned) ---------------- */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="md">
        <DialogTitle>Adaugă angajat</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {/* Primary info */}
            <Typography variant="subtitle2" color="text.secondary">Informații de bază</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Nume"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required fullWidth error={!!errs.name} helperText={errs.name}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Data angajării"
                  format="DD/MM/YYYY"
                  value={form.hiredAt ? dayjs(form.hiredAt) : null}
                  onChange={(d) => setForm(f => ({ ...f, hiredAt: toIsoDate(d) }))}
                  slotProps={{ textField: { required: true, fullWidth: true, error: !!errs.hiredAt, helperText: errs.hiredAt } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="CNP"
                  value={form.cnp || ''}
                  onChange={setDigits('cnp', 13)}
                  inputProps={{ inputMode: 'numeric', maxLength: 13 }}
                  fullWidth error={!!errs.cnp} helperText={errs.cnp || '13 cifre'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data nașterii (opțional)"
                  format="DD/MM/YYYY"
                  value={form.birthDate ? dayjs(form.birthDate) : null}
                  onChange={(d) => setForm(f => ({ ...f, birthDate: toIsoDate(d) || null }))}
                  slotProps={{ textField: { fullWidth: true, error: !!errs.birthDate, helperText: errs.birthDate } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.trim() }))}
                  fullWidth error={!!errs.phone} helperText={errs.phone || 'ex: 07xxxxxxxx sau +407xxxxxxxx'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Calificări (separate prin virgulă)"
                  value={(form.qualifications || []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, qualifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Live preview chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`Vârsta: ${ageFromBirth(form.birthDate) ?? '—'}`} />
              <Chip size="small" label={`Vechime: ${formatTenureRo(tenureParts(form.hiredAt))}`} />
            </Stack>

            <Divider />

            {/* Advanced section toggle */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                size="small"
                startIcon={<ExpandMoreIcon sx={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                onClick={() => setShowAdvanced(s => !s)}
              >
                {showAdvanced ? 'Ascunde detalii' : 'Detalii CI & adresă'}
              </Button>
              <Typography variant="caption" color="text.secondary">(opțional)</Typography>
            </Stack>

            <Collapse in={showAdvanced} unmountOnExit>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {/* CI */}
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Carte de identitate</Typography></Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Serie CI"
                    value={form.idSeries || ''}
                    onChange={setUpper('idSeries')}
                    inputProps={{ maxLength: 3 }}
                    fullWidth error={!!errs.idSeries} helperText={errs.idSeries}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Număr CI"
                    value={form.idNumber || ''}
                    onChange={setDigits('idNumber')}
                    inputProps={{ inputMode: 'numeric' }}
                    fullWidth error={!!errs.idNumber} helperText={errs.idNumber}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Emitent CI"
                    value={form.idIssuer || ''}
                    onChange={e => setForm(f => ({ ...f, idIssuer: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Data eliberării CI"
                    format="DD/MM/YYYY"
                    value={form.idIssueDateISO ? dayjs(form.idIssueDateISO) : null}
                    onChange={d => setForm(f => ({ ...f, idIssueDateISO: toIsoDate(d) }))}
                    slotProps={{ textField: { fullWidth: true, error: !!errs.idIssueDateISO, helperText: errs.idIssueDateISO } }}
                  />
                </Grid>

                {/* Address */}
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Adresă</Typography></Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Județ" value={form.county || ''} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Localitate" value={form.locality || ''} onChange={e => setForm(f => ({ ...f, locality: e.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Adresă" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} fullWidth />
                </Grid>
              </Grid>
            </Collapse>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdd(false)}>Anulează</Button>
          <Button
            variant="contained"
            onClick={doCreate}
            disabled={saving || !valid || !form.name || !form.hiredAt}
          >
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Edit Employee (kept simple) ---------------- */}
      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editează angajat</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nume" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <TextField label="CNP" value={form.cnp || ''} onChange={e => setForm(f => ({ ...f, cnp: e.target.value }))} />
            <TextField label="Telefon" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <TextField label="Serie CI" value={form.idSeries || ''} onChange={e => setForm(f => ({ ...f, idSeries: e.target.value }))} />
            <TextField label="Număr CI" value={form.idNumber || ''} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} />
            <TextField label="Emitent CI" value={form.idIssuer || ''} onChange={e => setForm(f => ({ ...f, idIssuer: e.target.value }))} />
            <DatePicker label="Data eliberării CI" format="DD/MM/YYYY" value={form.idIssueDateISO ? dayjs(form.idIssueDateISO) : null} onChange={d => setForm(f => ({ ...f, idIssueDateISO: toIsoDate(d) }))} slotProps={{ textField: { fullWidth: true } }} />
            <TextField label="Județ" value={form.county || ''} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} />
            <TextField label="Localitate" value={form.locality || ''} onChange={e => setForm(f => ({ ...f, locality: e.target.value }))} />
            <TextField label="Adresă" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <TextField
              label="Calificări (separate prin virgulă)"
              value={(form.qualifications || []).join(', ')}
              onChange={e => setForm(f => ({ ...f, qualifications: parseQuals(e.target.value) }))} />
            <DatePicker
              label="Data angajării"
              format="DD/MM/YYYY"
              value={form.hiredAt ? dayjs(form.hiredAt) : null}
              onChange={(d) => setForm(f => ({ ...f, hiredAt: toIsoDate(d) }))}
              slotProps={{ textField: { required: true, fullWidth: true } }}
            />
            <DatePicker
              label="Data nașterii (opțional)"
              format="DD/MM/YYYY"
              value={form.birthDate ? dayjs(form.birthDate) : null}
              onChange={(d) => setForm(f => ({ ...f, birthDate: toIsoDate(d) || null }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(null)}>Anulează</Button>
          <Button variant="contained" onClick={doUpdate} disabled={saving || !form.name || !form.hiredAt}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Add Leave (weekend-aware) ---------------- */}
      <Dialog open={!!openLeave} onClose={() => setOpenLeave(null)} fullWidth maxWidth="sm">
        <DialogTitle>Concediu plătit</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <DatePicker
              label="Data început"
              format="DD/MM/YYYY"
              value={leaveForm.startDate ? dayjs(leaveForm.startDate) : null}
              onChange={(d) => {
                if (!d || !d.isValid()) {
                  setLeaveForm(f => ({ ...f, startDate: '' }));
                  setStartMsg('');
                  return;
                }
                if (isWeekend(d)) {
                  const nd = nextBusinessDay(d);
                  setLeaveForm(f => ({ ...f, startDate: nd.format('YYYY-MM-DD') }));
                  setStartMsg(`Am mutat începutul pe ${nd.format('DD/MM/YYYY')} (weekend ignorat)`);
                } else {
                  setLeaveForm(f => ({ ...f, startDate: toIsoDate(d) }));
                  setStartMsg('');
                }
              }}
              shouldDisableDate={(d) => !d || isWeekend(d)}
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  helperText: startMsg || undefined,
                }
              }}
            />
            <TextField
              label="Număr zile (zile lucrătoare)"
              type="number"
              inputProps={{ min: 1 }}
              value={leaveForm.days}
              onChange={e => setLeaveForm(f => ({ ...f, days: Math.max(1, Number(e.target.value || 1)) }))}
              required fullWidth
            />
            <TextField
              label="Notă (opțional)"
              value={leaveForm.note || ''}
              onChange={e => setLeaveForm(f => ({ ...f, note: e.target.value }))}
              fullWidth
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Live preview: weekend-aware end date & covered dates count */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={`Se încheie pe: ${previewEnd ? dayjs(previewEnd).format('DD/MM/YYYY') : '—'}`}
              variant="outlined"
            />
            {leaveForm.startDate && leaveForm.days ? (
              <Chip
                label={`Acoperă ${businessDatesForLeave(leaveForm.startDate, leaveForm.days).length} zile lucrătoare`}
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            * Zilele din weekend nu se contorizează. Se acumulează zilnic, pro-rata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenLeave(null); setStartMsg(''); }}>Anulează</Button>
          <Button variant="contained" onClick={doAddLeave} disabled={saving || !leaveForm.startDate || !leaveForm.days}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- History (year filter) ---------------- */}
      <Dialog open={!!openHistory} onClose={() => setOpenHistory(null)} fullWidth maxWidth="sm">
        <DialogTitle>Istoric concedii — {openHistory?.name}</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="Toți anii" variant={historyYear === 'all' ? 'filled' : 'outlined'} onClick={() => setHistoryYear('all')} clickable />
              {yearsAvailable.map(y => (
                <Chip key={y} label={String(y)} variant={historyYear === y ? 'filled' : 'outlined'} onClick={() => setHistoryYear(y)} clickable />
              ))}
            </Stack>
            <Box sx={{ flex: 1 }} />
            <DatePicker
              label="Alege un an"
              views={['year']}
              openTo="year"
              format="YYYY"
              value={historyYear === 'all' ? null : dayjs(`${historyYear}-01-01`)}
              onChange={(d) => setHistoryYear(d && d.isValid() ? d.year() : 'all')}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          {/* Summary for selected year */}
          {historyYear !== 'all' && (
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center" flexWrap="wrap">
              <Chip label={`Drept ${historyYear}: ${proRataForYear(openHistory?.hiredAt, historyYear as number)}`} />
              <Chip color="warning" label={`Folosite ${historyYear}: ${sumTakenForYear(history, historyYear as number)}`} />
              <Chip color="success" label={`Rămase ${historyYear}: ${Math.max(0, proRataForYear(openHistory?.hiredAt, historyYear as number) - sumTakenForYear(history, historyYear as number))}`} />
              <Chip variant="outlined" label={`Total în listă: ${totalDays}`} />
            </Stack>
          )}

          {filteredHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nu există înregistrări.</Typography>
          ) : (
            <List dense>
              {filteredHistory
                .slice()
                .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf())
                .map(h => (
                  <ListItem
                    key={h.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={async () => {
                          try {
                            await deleteLeave(h.id);
                            setHistory(prev => prev.filter(x => x.id !== h.id));
                            successNotistack('Înregistrare ștearsă');
                            await load();
                          } catch (e: any) {
                            errorNotistack(e?.message || 'Nu am putut șterge înregistrarea');
                          }
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${dmy(h.startDate)} — ${h.days} zile`}
                      secondary={h.note || undefined}
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(null)}>Închide</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Confirm Delete ---------------- */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          <Typography>Sunteți sigur că doriți să ștergeți acest angajat?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Anulează</Button>
          <Button color="error" variant="contained" onClick={() => { if (confirmDelete) { void doDelete(confirmDelete); setConfirmDelete(null); } }} disabled={saving}>
            Șterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
