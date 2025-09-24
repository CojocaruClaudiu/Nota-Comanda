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
import DeleteCarDialog from './DeleteCarDialog';
import { getCars, type Car } from '../../api/cars';
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
  const { errorNotistack } = useNotistack();
  const [rows, setRows] = useState<Car[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  // saving handled inside modals
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openAdd, setOpenAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Car | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Car | null>(null);

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
  // creation handled in AddCarModal; edit handled in EditCarModal

  // handleCreate removed; creation handled by AddCarModal

  // handleUpdate moved into EditCarModal

  // delete handled inside DeleteCarDialog

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
            <IconButton color="error" size="small" onClick={() => setConfirmDelete(row.original)}>
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
      density: 'comfortable',
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

      {/* DELETE (refactored) */}
      <DeleteCarDialog
        open={!!confirmDelete}
        car={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onCarDeleted={() => {
          if (confirmDelete) {
            setRows((prev) => prev.filter((r) => r.id !== confirmDelete.id));
            setConfirmDelete(null);
          }
        }}
      />
    </Box>
  );
}
