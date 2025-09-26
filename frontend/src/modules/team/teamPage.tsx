// src/pages/team/EchipaPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  CircularProgress, Chip, Alert
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import AddEmployeeModal from './AddEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { deleteEmployee } from '../../api/employees';
import AddLeaveModal from './AddLeaveModal';
import HolidayHistoryModal from './HolidayHistoryModal';
import useNotistack from '../orders/hooks/useNotistack';
import {
  getEmployees, createEmployee,
  type EmployeeWithStats, type EmployeePayload
} from '../../api/employees';

// business-day helpers (weekend-aware)
// (removed unused imports)

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
  const confirm = useConfirm();

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
  const [saving, setSaving] = useState(false);

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
  const handleEmployeeUpdated = async () => {
    await load();
  };
  const handleEmployeeDeleted = async () => {
    await load();
  };

  /** History */
  const openHistoryDialog = (row: EmployeeWithStats) => {
    setOpenHistory(row);
  };

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
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Confirmare Ștergere Angajat',
                        bodyTitle: 'Ești sigur că vrei să ștergi angajatul?',
                        description: (
                          <>Angajatul <strong>{row.original.name}</strong> va fi șters permanent.</>
                        ),
                        confirmText: 'Șterge Angajat',
                        cancelText: 'Anulează',
                        danger: true,
                      });
                      if (!ok) return;
                      try {
                        await deleteEmployee(row.original.id);
                        await handleEmployeeDeleted();
                        successNotistack('Angajat șters');
                      } catch (e: any) {
                        errorNotistack(e?.message || 'Nu am putut șterge angajatul');
                      }
                    }}
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

      {/* ---------------- Add Employee Modal ---------------- */}
      <AddEmployeeModal 
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={doCreate}
        saving={saving}
      />

      {/* ---------------- Edit Employee Modal ---------------- */}
      <EditEmployeeModal
        open={openEdit !== null}
        onClose={() => setOpenEdit(null)}
        employee={openEdit}
        onEmployeeUpdated={handleEmployeeUpdated}
      />

      {/* ---------------- Add Leave Modal ---------------- */}
      <AddLeaveModal
        open={!!openLeave}
        onClose={() => setOpenLeave(null)}
        employee={openLeave}
        onLeaveAdded={async () => {
          await load();
        }}
      />

      {/* ---------------- Holiday History Modal ---------------- */}
      <HolidayHistoryModal
        open={!!openHistory}
        onClose={() => setOpenHistory(null)}
        employee={openHistory}
        onHistoryUpdated={load}
      />

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
}
