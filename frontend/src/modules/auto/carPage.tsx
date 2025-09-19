// src/pages/auto/CarPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip, Tooltip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem,
} from '@mui/material';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_Row,
} from 'material-react-table';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ro';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Autocomplete } from '@mui/material';

import useNotistack from '../orders/hooks/useNotistack';
import { getCars, createCar, updateCar, deleteCar, type Car, type CarPayload } from '../../api/cars';
import { getEmployees, type EmployeeWithStats } from '../../api/employees';

dayjs.extend(customParseFormat);
dayjs.locale('ro');

type FuelType =
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

// helpers date
const toIso = (d: Dayjs | null) => (d && d.isValid() ? d.format('YYYY-MM-DD') : null);
const fromIso = (s?: string | null) => (s ? dayjs(s) : null);
const dmy = (s?: string | null) => (s ? dayjs(s).format('DD/MM/YYYY') : '—');

// urgency helpers
const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const d = dayjs(iso);
  if (!d.isValid()) return null;
  return d.startOf('day').diff(dayjs().startOf('day'), 'day');
};
const chipFor = (label: string, iso?: string | null) => {
  const n = daysLeft(iso);
  let color: 'default' | 'success' | 'warning' | 'error' = 'default';
  let text = '—';
  if (n !== null) {
    if (n <= 0) {
      color = 'error';
      text = 'EXPIRAT';
    } else if (n <= 30) {
      color = 'error';
      text = `${n} zile`;
    } else if (n <= 90) {
      color = 'warning';
      text = `${n} zile`;
    } else {
      color = 'success';
      text = `${n} zile`;
    }
  }
  return (
    <Tooltip title={`${label}: ${iso ? dmy(iso) : '—'}`}>
      <Chip label={`${label}: ${text}`} color={color} size="small" />
    </Tooltip>
  );
};
const urgency = (c: Car) => {
  const arr = [daysLeft(c.expItp), daysLeft(c.expRca), daysLeft(c.expRovi)].filter(
    (x): x is number => typeof x === 'number',
  );
  return arr.length ? Math.min(...arr) : Number.POSITIVE_INFINITY;
};

// form shape
type CarForm = {
  vin: string;
  marca: string;
  model: string;
  an: number | '';
  culoare: string;
  placute: string;
  driverId: string | null;
  driverNote: string;
  combustibil: FuelType | '';
  expItp: Dayjs | null;
  expRca: Dayjs | null;
  expRovi: Dayjs | null;
};

const emptyForm: CarForm = {
  vin: '',
  marca: '',
  model: '',
  an: '',
  culoare: '',
  placute: '',
  driverId: null,
  driverNote: '',
  combustibil: '',
  expItp: null,
  expRca: null,
  expRovi: null,
};

// Romanian MRT localization (minimal)
const roLoc = {
  actions: 'Acțiuni',
  showHideFilters: 'Filtre',
  showHideColumns: 'Coloane',
  clearFilter: 'Șterge filtrul',
  clearSearch: 'Șterge căutarea',
  search: 'Caută',
  rowsPerPage: 'Rânduri / pagină',
  sortByColumnAsc: 'Sortează ascendent',
  sortByColumnDesc: 'Sortează descendent',
};

export default function CarPage() {
  const { successNotistack, errorNotistack } = useNotistack();
  const [rows, setRows] = useState<Car[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openAdd, setOpenAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Car | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Car | null>(null);

  // forms
  const [form, setForm] = useState<CarForm>(emptyForm);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cs, emps] = await Promise.all([getCars(), getEmployees()]);
      setRows(cs.sort((a, b) => urgency(a) - urgency(b)));
      setEmployees(emps);
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut încărca mașinile';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<MRT_ColumnDef<Car>[]>(() => [
    { accessorKey: 'placute', header: 'Plăcuțe', size: 140 },
    { accessorKey: 'marca', header: 'Marcă', size: 120 },
    { accessorKey: 'model', header: 'Model', size: 140 },
    { accessorKey: 'an', header: 'An', size: 80 },
    { accessorKey: 'culoare', header: 'Culoare', size: 120, Cell: ({ cell }) => cell.getValue<string>() || '—' },
    {
      accessorKey: 'driver.name',
      header: 'Șofer',
      size: 220,
      Cell: ({ row }) => row.original.driver?.name || '—',
    },
    {
      accessorKey: 'driverNote',
      header: 'Notă șofer',
      size: 220,
      Cell: ({ cell }) => cell.getValue<string>() || '—',
    },
    {
      accessorKey: 'combustibil',
      header: 'Combustibil',
      size: 160,
      Cell: ({ cell }) => {
        const v = cell.getValue<FuelType | null>();
        const found = FUEL_OPTIONS.find((o) => o.value === v)?.label;
        return found || '—';
      },
      filterVariant: 'select',
      filterSelectOptions: FUEL_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    },
    {
      id: 'itp',
      header: 'ITP',
      size: 160,
      Cell: ({ row }) => chipFor('ITP', row.original.expItp),
      sortingFn: (a, b) => {
        const da = daysLeft(a.original.expItp) ?? Number.POSITIVE_INFINITY;
        const db = daysLeft(b.original.expItp) ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    {
      id: 'rca',
      header: 'RCA',
      size: 160,
      Cell: ({ row }) => chipFor('RCA', row.original.expRca),
      sortingFn: (a, b) => {
        const da = daysLeft(a.original.expRca) ?? Number.POSITIVE_INFINITY;
        const db = daysLeft(b.original.expRca) ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    {
      id: 'rovi',
      header: 'Rovinietă',
      size: 180,
      Cell: ({ row }) => chipFor('Rovinietă', row.original.expRovi),
      sortingFn: (a, b) => {
        const da = daysLeft(a.original.expRovi) ?? Number.POSITIVE_INFINITY;
        const db = daysLeft(b.original.expRovi) ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    // hidden for default sort
    { id: 'urgent', header: 'Urgent', accessorFn: (r) => urgency(r), enableHiding: true, enableColumnFilter: false, size: 1 },
  ], []);

  // CRUD handlers
  const canSubmit = form.vin && form.marca && form.model && form.placute && Number(form.an) > 1900;

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      const payload: CarPayload = {
        vin: form.vin.trim(),
        marca: form.marca.trim(),
        model: form.model.trim(),
        an: Number(form.an),
        culoare: form.culoare.trim() || null,
        placute: form.placute.trim().toUpperCase(),
        driverId: form.driverId || null,
        driverNote: form.driverNote.trim() || null,
        combustibil: (form.combustibil || null) as FuelType | null,
        expItp: toIso(form.expItp),
        expRca: toIso(form.expRca),
        expRovi: toIso(form.expRovi),
      };
      const created = await createCar(payload);
      setRows((prev) => [created, ...prev].sort((a, b) => urgency(a) - urgency(b)));
      setOpenAdd(false);
      setForm(emptyForm);
      successNotistack('Mașină adăugată');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut adăuga mașina');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget || !canSubmit) return;
    try {
      setSaving(true);
      const payload: CarPayload = {
        vin: form.vin.trim(),
        marca: form.marca.trim(),
        model: form.model.trim(),
        an: Number(form.an),
        culoare: form.culoare.trim() || null,
        placute: form.placute.trim().toUpperCase(),
        driverId: form.driverId || null,
        driverNote: form.driverNote.trim() || null,
        combustibil: (form.combustibil || null) as FuelType | null,
        expItp: toIso(form.expItp),
        expRca: toIso(form.expRca),
        expRovi: toIso(form.expRovi),
      };
      const updated = await updateCar(editTarget.id, payload);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => urgency(a) - urgency(b)));
      setEditTarget(null);
      successNotistack('Mașină actualizată');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut actualiza mașina');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setSaving(true);
      await deleteCar(confirmDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setConfirmDelete(null);
      successNotistack('Mașină ștearsă');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge mașina');
    } finally {
      setSaving(false);
    }
  };

  const data = useMemo(() => rows, [rows]);

  const renderRowActions = useCallback(
    ({ row }: { row: MRT_Row<Car> }) => (
      <Stack direction="row" spacing={1}>
        <Tooltip title="Editează">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                setEditTarget(row.original);
                setForm({
                  vin: row.original.vin,
                  marca: row.original.marca,
                  model: row.original.model,
                  an: row.original.an,
                  culoare: row.original.culoare || '',
                  placute: row.original.placute || '',
                  driverId: row.original.driverId || null,
                  driverNote: row.original.driverNote || '',
                  combustibil: (row.original.combustibil || '') as FuelType | '',
                  expItp: fromIso(row.original.expItp),
                  expRca: fromIso(row.original.expRca),
                  expRovi: fromIso(row.original.expRovi),
                });
              }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Șterge">
          <span>
            <IconButton color="error" size="small" onClick={() => setConfirmDelete(row.original)} disabled={saving}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
    [saving],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    getRowId: (r) => r.id,
    state: { isLoading: loading, pagination, showGlobalFilter: true },
    onPaginationChange: setPagination,
    initialState: {
      sorting: [{ id: 'urgent', desc: false }],
      density: 'comfortable',
      pagination: { pageIndex: 0, pageSize: 10 },
      columnVisibility: { urgent: false },
    },
    autoResetPageIndex: false,

    // UX
    enableSorting: true,
    enableColumnFilters: true,
    columnFilterDisplayMode: 'popover',
    enableGlobalFilterModes: true,
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableStickyHeader: true,
    enableRowVirtualization: true,
    positionActionsColumn: 'last',
    renderRowActions,
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<AddCircleOutlineRoundedIcon />}
          onClick={() => {
            setForm(emptyForm);
            setOpenAdd(true);
          }}
        >
          Adaugă mașină
        </Button>
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
        </Button>
      </Stack>
    ),

    // Row styling by urgency with zebra stripes
    muiTableBodyRowProps: ({ row }) => ({
      sx: (theme) => {
        const n = urgency(row.original);
        const isEvenRow = row.index % 2 === 0;
        
        // Priority 1: Urgency-based coloring
        if (n <= 0) return { bgcolor: `${theme.palette.error.light}33` };
        if (n <= 30) return { bgcolor: `${theme.palette.error.light}1a` };
        if (n <= 90) return { bgcolor: `${theme.palette.warning.light}14` };
        
        // Priority 2: Zebra stripes for normal rows
        if (isEvenRow) {
          return { bgcolor: theme.palette.action.hover };
        }
        
        return {};
      },
    }),

    // MUI props
    muiPaginationProps: { rowsPerPageOptions: [10, 25, 50, 100] },
    muiTablePaperProps: { sx: { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' } },
    muiTableContainerProps: { sx: { flex: 1, minHeight: 0 } },

    localization: roLoc,
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <DirectionsCarFilledRoundedIcon color="primary" />
            <Typography variant="h5">Parc auto</Typography>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* ADD */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="md">
        <DialogTitle>Adaugă mașină</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="VIN" value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))} required fullWidth />
              <TextField label="Plăcuțe" value={form.placute} onChange={(e) => setForm((f) => ({ ...f, placute: e.target.value }))} required fullWidth />
              <TextField
                label="An"
                type="number"
                value={form.an}
                onChange={(e) => setForm((f) => ({ ...f, an: Number(e.target.value) || '' }))}
                required
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Marcă" value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} required fullWidth />
              <TextField label="Model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} required fullWidth />
              <TextField label="Culoare" value={form.culoare} onChange={(e) => setForm((f) => ({ ...f, culoare: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Driver autocomplete */}
              <Autocomplete
                options={employees}
                getOptionLabel={(o) => o.name}
                value={employees.find((e) => e.id === form.driverId) || null}
                onChange={(_, val) => setForm((f) => ({ ...f, driverId: val?.id || null }))}
                renderInput={(params) => <TextField {...params} label="Șofer (angajat)" fullWidth />}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
              />
              <TextField
                label="Notă șofer"
                value={form.driverNote}
                onChange={(e) => setForm((f) => ({ ...f, driverNote: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Combustibil"
                value={form.combustibil}
                onChange={(e) => setForm((f) => ({ ...f, combustibil: e.target.value as FuelType }))}
                fullWidth
              >
                {FUEL_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Expirare ITP"
                format="DD/MM/YYYY"
                value={form.expItp}
                onChange={(d) => setForm((f) => ({ ...f, expItp: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Expirare RCA"
                format="DD/MM/YYYY"
                value={form.expRca}
                onChange={(d) => setForm((f) => ({ ...f, expRca: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Expirare Rovinietă"
                format="DD/MM/YYYY"
                value={form.expRovi}
                onChange={(d) => setForm((f) => ({ ...f, expRovi: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Anulează</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !canSubmit}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="md">
        <DialogTitle>Editează mașină</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="VIN" value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))} required fullWidth />
              <TextField label="Plăcuțe" value={form.placute} onChange={(e) => setForm((f) => ({ ...f, placute: e.target.value }))} required fullWidth />
              <TextField
                label="An"
                type="number"
                value={form.an}
                onChange={(e) => setForm((f) => ({ ...f, an: Number(e.target.value) || '' }))}
                required
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Marcă" value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} required fullWidth />
              <TextField label="Model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} required fullWidth />
              <TextField label="Culoare" value={form.culoare} onChange={(e) => setForm((f) => ({ ...f, culoare: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                options={employees}
                getOptionLabel={(o) => o.name}
                value={employees.find((e) => e.id === form.driverId) || null}
                onChange={(_, val) => setForm((f) => ({ ...f, driverId: val?.id || null }))}
                renderInput={(params) => <TextField {...params} label="Șofer (angajat)" fullWidth />}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
              />
              <TextField
                label="Notă șofer"
                value={form.driverNote}
                onChange={(e) => setForm((f) => ({ ...f, driverNote: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Combustibil"
                value={form.combustibil}
                onChange={(e) => setForm((f) => ({ ...f, combustibil: e.target.value as FuelType }))}
                fullWidth
              >
                {FUEL_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Expirare ITP"
                format="DD/MM/YYYY"
                value={form.expItp}
                onChange={(d) => setForm((f) => ({ ...f, expItp: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Expirare RCA"
                format="DD/MM/YYYY"
                value={form.expRca}
                onChange={(d) => setForm((f) => ({ ...f, expRca: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Expirare Rovinietă"
                format="DD/MM/YYYY"
                value={form.expRovi}
                onChange={(d) => setForm((f) => ({ ...f, expRovi: d }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Anulează</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={saving || !canSubmit}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          Sigur doriți să ștergeți {confirmDelete?.placute} ({confirmDelete?.marca} {confirmDelete?.model})?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Anulează</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={saving}>
            Șterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
