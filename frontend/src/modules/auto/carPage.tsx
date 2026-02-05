// src/pages/auto/CarPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, Button, Chip, Tooltip, CircularProgress, Alert, IconButton } from '@mui/material';
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
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ro';
// DatePicker/Autocomplete used in EditCarModal, not here

import useNotistack from '../orders/hooks/useNotistack';
import AddCarModal from './AddCarModal';
import EditCarModal from './EditCarModal';
import { getCars, deleteCar, type Car } from '../../api/cars';
import { getEmployees, type EmployeeWithStats } from '../../api/employees';
import { useConfirm } from '../common/confirm/ConfirmProvider';

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
const dmy = (s?: string | null) => (s ? dayjs(s).format('DD/MM/YYYY') : '—');

// urgency helpers
const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const d = dayjs(iso);
  if (!d.isValid()) return null;
  return d.startOf('day').diff(dayjs().startOf('day'), 'day');
};
const chipFor = (label: string, iso?: string | null, days?: number | null) => {
  const n = typeof days === 'number' ? days : daysLeft(iso);
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
const expiryLabel = (days?: number | null) => {
  if (days == null) return '—';
  if (days <= 0) return 'EXPIRAT';
  return `${days} zile`;
};
const rcaDirectLabel = (direct?: boolean | null) => (direct ? 'DD' : '');
const chipForRca = (iso?: string | null, days?: number | null, direct?: boolean | null) => {
  const n = typeof days === 'number' ? days : daysLeft(iso);
  const text = expiryLabel(n);
  let color: 'default' | 'success' | 'warning' | 'error' = 'default';
  if (n !== null) {
    if (n <= 0) color = 'error';
    else if (n <= 30) color = 'error';
    else if (n <= 90) color = 'warning';
    else color = 'success';
  }

  const ddLabel = rcaDirectLabel(direct);
  const suffix = ddLabel ? ` • ${ddLabel}` : '';
  return (
    <Tooltip title={`RCA: ${iso ? dmy(iso) : '—'}${suffix}`}>
      <Chip
        color={color}
        size="small"
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <span>{`RCA: ${text}`}</span>
            {ddLabel ? (
              <Chip
                size="small"
                label="DD"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 800,
                  bgcolor: 'common.white',
                  borderColor: 'rgba(0,0,0,0.25)',
                  color: 'text.primary',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ) : null}
          </Box>
        }
      />
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
// local edit/add forms moved into dedicated modals

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
  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Car[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  // saving handled inside modals
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openAdd, setOpenAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Car | null>(null);
  // global confirm dialog handles deletion

  // forms
  // form state handled within modals for add/edit
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

  const expiryMeta = useMemo(() => {
    const map = new Map<string, { itp?: number | null; rca?: number | null; rovi?: number | null; urgency: number }>();
    rows.forEach((r) => {
      const itp = daysLeft(r.expItp);
      const rca = daysLeft(r.expRca);
      const rovi = daysLeft(r.expRovi);
      const list = [itp, rca, rovi].filter((x): x is number => typeof x === 'number');
      map.set(r.id, {
        itp,
        rca,
        rovi,
        urgency: list.length ? Math.min(...list) : Number.POSITIVE_INFINITY,
      });
    });
    return map;
  }, [rows]);

  const columns = useMemo<MRT_ColumnDef<Car>[]>(() => [
    { accessorKey: 'placute', header: 'Plăcuțe', size: 140 },
    { accessorKey: 'marca', header: 'Marcă', size: 120 },
    { accessorKey: 'model', header: 'Model', size: 140 },
    { accessorKey: 'an', header: 'An', size: 100 },
    { accessorKey: 'culoare', header: 'Culoare', size: 120, Cell: ({ cell }) => cell.getValue<string>() || '—' },
        {
      // Use accessorFn to safely read nested driver name without warnings when missing
      accessorFn: (row) => row.driver?.name || '',
      id: 'driverName',
      header: 'Șofer',
      size: 220,
      enableGlobalFilter: true,
      filterFn: 'includesString',
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
      enableSorting: true,
      accessorFn: (row) => expiryLabel(expiryMeta.get(row.id)?.itp ?? null),
      Cell: ({ row }) => chipFor('ITP', row.original.expItp, expiryMeta.get(row.original.id)?.itp ?? null),
      sortingFn: (a, b) => {
        const da = expiryMeta.get(a.original.id)?.itp ?? Number.POSITIVE_INFINITY;
        const db = expiryMeta.get(b.original.id)?.itp ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    {
      id: 'rca',
      header: 'RCA',
      size: 160,
      enableSorting: true,
      accessorFn: (row) => {
        const label = rcaDirectLabel(row.rcaDecontareDirecta ?? false);
        return `${expiryLabel(expiryMeta.get(row.id)?.rca ?? null)}${label ? ` ${label}` : ''}`;
      },
      Cell: ({ row }) => chipForRca(row.original.expRca, expiryMeta.get(row.original.id)?.rca ?? null, row.original.rcaDecontareDirecta),
      sortingFn: (a, b) => {
        const da = expiryMeta.get(a.original.id)?.rca ?? Number.POSITIVE_INFINITY;
        const db = expiryMeta.get(b.original.id)?.rca ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    {
      id: 'rovi',
      header: 'Rovinietă',
      size: 180,
      enableSorting: true,
      accessorFn: (row) => expiryLabel(expiryMeta.get(row.id)?.rovi ?? null),
      Cell: ({ row }) => chipFor('Rovinietă', row.original.expRovi, expiryMeta.get(row.original.id)?.rovi ?? null),
      sortingFn: (a, b) => {
        const da = expiryMeta.get(a.original.id)?.rovi ?? Number.POSITIVE_INFINITY;
        const db = expiryMeta.get(b.original.id)?.rovi ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    },
    // hidden for default sort
    { id: 'urgent', header: 'Urgent', accessorFn: (r) => expiryMeta.get(r.id)?.urgency ?? Number.POSITIVE_INFINITY, enableHiding: true, enableColumnFilter: false, size: 1 },
  ], [expiryMeta]);

  // CRUD handlers
  // creation handled in AddCarModal; edit handled in EditCarModal

  // handleCreate removed; creation handled by AddCarModal

  // handleUpdate moved into EditCarModal

  // delete handled via global ConfirmProvider

  const data = useMemo(() => rows, [rows]);

  const renderRowActions = useCallback(
    ({ row }: { row: MRT_Row<Car> }) => (
      <Stack direction="row" spacing={1}>
        <Tooltip title="Editează">
          <span>
            <IconButton size="small" onClick={() => setEditTarget(row.original)}>
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
                const car = row.original;
                const ok = await confirm({
                  title: 'Confirmare Ștergere',
                  bodyTitle: 'Ești sigur că vrei să ștergi?',
                  description: (
                    <>
                      Mașina <strong>{car.placute}</strong> ({car.marca} {car.model}) va fi ștearsă permanent.
                    </>
                  ),
                  confirmText: 'Șterge',
                  cancelText: 'Anulează',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteCar(car.id);
                  setRows((prev) => prev.filter((r) => r.id !== car.id));
                  successNotistack('Șters');
                } catch (e: any) {
                  errorNotistack(e?.message || 'Nu am putut șterge');
                }
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    getRowId: (r) => r.id,
    state: { isLoading: loading, pagination, showGlobalFilter: true },
    onPaginationChange: setPagination,
    initialState: {
      sorting: [{ id: 'urgent', desc: false }],
      density: 'compact',
      pagination: { pageIndex: 0, pageSize: 10 },
      columnVisibility: { urgent: false },
    },
    autoResetPageIndex: false,

    // UX
    enableSorting: true,
  enableMultiSort: true,
    enableColumnFilters: true,
    columnFilterDisplayMode: 'popover',
    enableGlobalFilterModes: true,
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableStickyHeader: true,
    enableRowVirtualization: true,
  enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions,
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" spacing={1}>
  <Button variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} onClick={() => setOpenAdd(true)}>
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
        const n = expiryMeta.get(row.original.id)?.urgency ?? Number.POSITIVE_INFINITY;
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
  muiTableHeadCellProps: { sx: { py: 0.75 } },
  muiTableBodyCellProps: { sx: { py: 0.5 } },

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

      {/* ADD (refactored) */}
      <AddCarModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        employees={employees}
        onCarAdded={(created) => {
          setRows((prev) => [created, ...prev].sort((a, b) => urgency(a) - urgency(b)));
        }}
      />

      {/* EDIT (refactored) */}
      <EditCarModal
        open={!!editTarget}
        car={editTarget}
        employees={employees}
        onClose={() => setEditTarget(null)}
        onCarUpdated={(updated) => {
          setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => urgency(a) - urgency(b)));
        }}
      />

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
}


