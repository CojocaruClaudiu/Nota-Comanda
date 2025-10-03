import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  Alert, Chip, Badge, Autocomplete, TextField
} from '@mui/material';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HistoryIcon from '@mui/icons-material/History';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import EventIcon from '@mui/icons-material/Event';
import UpdateIcon from '@mui/icons-material/Update';

import {
  MaterialReactTable,
  useMaterialReactTable,
  createRow,
  type MRT_ColumnDef,
  type MRT_TableOptions,
} from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { rankItem } from '@tanstack/match-sorter-utils';
import { unitSelectOptions, isValidUnit } from '../../utils/units';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import useNotistack from '../orders/hooks/useNotistack';
import { PriceHistoryModal } from './PriceHistoryModal';
import { UploadTechnicalSheetDialog } from './UploadTechnicalSheetDialog';

import {
  fetchUniqueMaterials,
  fetchSuppliers,
  createMaterialWithoutGroup,
  updateMaterial,
  deleteMaterial,
  type Material,
  type Supplier,
} from '../../api/materials';

const trim = (v?: string | null) => (v == null ? '' : String(v).trim());

// Format date helper
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

/* ---------------- Types for the unified tree rows ---------------- */
type NodeType = 'group' | 'material';
interface TreeRow {
  type: NodeType;
  id: string;
  parentId?: string | null;
  name: string;
  code?: string | null;
  supplierName?: string | null;
  supplierId?: string | null;
  unit?: string | null;
  price?: number | null;
  currency?: 'RON' | 'EUR' | null;
  purchaseDate?: string | null;
  technicalSheet?: string | null;
  number: string;              // 1 / 1.1
  subRows?: TreeRow[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;               // Group > Material (for fuzzy/global filter)
  // Enriched fields
  purchaseCount?: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  suppliers?: string[];
}

/* ---------------- Build tree from API data ---------------- */
async function buildTree(): Promise<TreeRow[]> {
  // Fetch unique materials (one per product code) for main table
  const materials = await fetchUniqueMaterials();

  // Convert all materials to flat rows
  const materialRows: TreeRow[] = materials.map((m: Material, idx: number) => ({
    type: 'material' as const,
    id: m.id,
    parentId: m.groupId,
    name: m.description,
    code: m.code,
    supplierName: m.supplierName,
    supplierId: m.supplierId,
    unit: m.unit,
    price: Number(m.price),
    currency: m.currency,
    purchaseDate: m.purchaseDate,
    technicalSheet: m.technicalSheet,
    number: String(idx + 1),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    // Enriched fields
    purchaseCount: m.purchaseCount,
    avgPrice: m.avgPrice ? Number(m.avgPrice) : undefined,
    minPrice: m.minPrice ? Number(m.minPrice) : undefined,
    maxPrice: m.maxPrice ? Number(m.maxPrice) : undefined,
    suppliers: m.suppliers,
  }));

  return materialRows;
}

/* ---------------- Add path for better searching ---------------- */
function addPaths(nodes: TreeRow[]): TreeRow[] {
  return nodes.map((n) => {
    // For flat materials, combine description + supplier for better search
    const path = n.supplierName ? `${n.name} ${n.supplierName}` : n.name;
    return { ...n, path };
  });
}

/* ---------------- Little persist helper ---------------- */
const STORAGE_KEY = 'materials-table-state-v1';
type PersistState = Partial<{
  columnPinning: any;
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  density: 'compact' | 'comfortable' | 'spacious';
  pagination: { pageIndex: number; pageSize: number };
  sorting: any;
  globalFilter: string;
}>;

const loadPersist = (): PersistState => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};
const savePersist = (patch: PersistState) => {
  const prev = loadPersist();
  const next = { ...prev, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

/* ---------------- Page ---------------- */
// Create QueryClient outside component to avoid recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

function MaterialsPageContent() {
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { successNotistack, errorNotistack } = useNotistack();

  // Price history modal state
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{ code: string; description: string } | null>(null);

  // Upload technical sheet dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedForUpload, setSelectedForUpload] = useState<{ id: string; name: string; currentFile?: string | null } | null>(null);


  // where the creating row appears
  const [createPos, setCreatePos] = useState<'top' | 'bottom' | number>('top');

  // state persistence
  const persisted = loadPersist();
  // controlled sorting state
  const [sorting, setSorting] = useState<any>(
    Array.isArray(persisted.sorting) ? persisted.sorting : []
  );
  // controlled pagination state
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>(
    persisted.pagination ?? { pageIndex: 0, pageSize: 50 }
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await buildTree();
      setTree(addPaths(t));
    } catch (e: any) {
      setError(e?.message || 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(() => [
    // Hidden PATH column for powerful fuzzy/global filtering across hierarchy
    {
      id: 'path',
      header: 'Căutare',
      accessorKey: 'path',
      enableGlobalFilter: true,
      enableColumnFilter: true,
      filterFn: 'fuzzy' as any,
      size: 200,
      enableHiding: true,
      Cell: () => null,
    },
    // NUMBER column
    {
      accessorKey: 'number',
      header: '#',
      size: 80,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      muiTableHeadCellProps: { align: 'left' },
      muiTableBodyCellProps: { align: 'left', sx: { pl: 1.5, whiteSpace: 'nowrap' } },
      Cell: ({ row }) => (
        <Box
          sx={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.2,
          }}
        >
          {row.original.number || '—'}
        </Box>
      ),
      enableEditing: false,
    },
    // NAME column
    {
      accessorKey: 'name',
      header: 'Denumire',
      size: 520,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      enableColumnFilterModes: true,
      filterFn: 'fuzzy' as any,
      muiEditTextFieldProps: { required: true, autoFocus: true },
      Cell: ({ renderedCellValue }) => {
        return (
          <Typography variant="body1">
            {renderedCellValue as string}
          </Typography>
        );
      },
    },
    // CODE column (editable only for materials)
    {
      accessorKey: 'code',
      header: 'Cod',
      size: 140,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      muiEditTextFieldProps: ({ row }: any) => ({
        required: row?.original?.type === 'material',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row, renderedCellValue }) => {
        return row.original.type === 'material' ? renderedCellValue : '—';
      },
    },
    // SUPPLIER column
    {
      accessorKey: 'supplierName',
      header: 'Furnizor',
      size: 280,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      enableEditing: false,
      Cell: ({ row, renderedCellValue }) => {
        return row.original.type === 'material' && renderedCellValue ? (
          <Tooltip title={row.original.supplierId ? `ID: ${row.original.supplierId}` : ''}>
            <Chip size="small" label={renderedCellValue as string} variant="outlined" color="primary" />
          </Tooltip>
        ) : '—';
      },
    },
    // UNIT column (editable only for materials)
    {
      accessorKey: 'unit',
      header: 'UM',
      size: 120,
      enableColumnFilter: true,
      filterVariant: 'select',
      filterSelectOptions: unitSelectOptions as any,
      filterFn: 'equalsString' as any,
      editVariant: 'select',
      editSelectOptions: unitSelectOptions as any,
      muiEditTextFieldProps: ({ row }: any) => ({
        select: true,
        placeholder: 'Alege unitatea',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row, renderedCellValue }) => {
        const val = trim(renderedCellValue as string);
        return row.original.type === 'material' && val ? (
          <Chip size="small" variant="outlined" label={val} />
        ) : (
          '—'
        );
      },
    },
    // PRICE column with trend indicator (editable only for materials)
    {
      accessorKey: 'price',
      header: 'Preț',
      size: 180,
      enableColumnFilter: false,
      muiEditTextFieldProps: ({ row }: any) => ({
        type: 'number',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '—';
        const price = row.original.price ?? 0;
        const avgPrice = row.original.avgPrice ?? price;
        const minPrice = row.original.minPrice ?? price;
        const maxPrice = row.original.maxPrice ?? price;
        const currency = row.original.currency ?? 'RON';
        
        // Determine price trend
        let TrendIcon = TrendingFlatIcon;
        let trendColor: 'success' | 'error' | 'inherit' = 'inherit';
        if (price < avgPrice * 0.95) {
          TrendIcon = TrendingDownIcon;
          trendColor = 'success'; // Lower price is good
        } else if (price > avgPrice * 1.05) {
          TrendIcon = TrendingUpIcon;
          trendColor = 'error'; // Higher price is bad
        }
        
        const tooltipText = `Curent: ${price.toFixed(2)} ${currency}\nMediu: ${avgPrice.toFixed(2)} ${currency}\nMin: ${minPrice.toFixed(2)} ${currency}\nMax: ${maxPrice.toFixed(2)} ${currency}`;
        
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2">{price.toFixed(2)} {currency}</Typography>
            {row.original.purchaseCount && row.original.purchaseCount > 1 && (
              <Tooltip title={tooltipText} arrow>
                <TrendIcon fontSize="small" color={trendColor} />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    // PURCHASE DATE column
    {
      accessorKey: 'purchaseDate',
      header: 'Data Achiziție',
      size: 150,
      enableColumnFilter: true,
      filterVariant: 'date-range',
      enableEditing: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '—';
        const date = row.original.purchaseDate;
        if (!date) return <Chip size="small" label="N/A" variant="outlined" />;
        
        return (
          <Tooltip title={`Achiziționat: ${formatDate(date)}`}>
            <Chip 
              size="small" 
              icon={<EventIcon />} 
              label={formatDate(date)}
              variant="outlined"
              color="info"
            />
          </Tooltip>
        );
      },
    },
    // PURCHASE COUNT column
    {
      accessorKey: 'purchaseCount',
      header: 'Achiziții',
      size: 110,
      enableColumnFilter: true,
      filterVariant: 'range',
      enableEditing: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '—';
        const count = row.original.purchaseCount ?? 1;
        const suppliers = row.original.suppliers ?? [];
        
        if (count <= 1) return '—';
        
        const tooltipText = `${count} achiziții\n${suppliers.length} furnizori: ${suppliers.slice(0, 3).join(', ')}${suppliers.length > 3 ? '...' : ''}`;
        
        return (
          <Tooltip title={tooltipText} arrow>
            <Badge badgeContent={count} color="primary" max={99}>
              <Chip size="small" label={`${count}×`} color="primary" variant="outlined" />
            </Badge>
          </Tooltip>
        );
      },
    },
    // TECHNICAL SHEET column
    {
      accessorKey: 'technicalSheet',
      header: 'Fișă Tehnică',
      size: 150,
      enableEditing: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '—';
        const sheet = row.original.technicalSheet;
        
        return (
          <Stack direction="row" spacing={0.5}>
            {sheet ? (
              <>
                <Tooltip title="Descarcă fișa tehnică">
                  <Chip 
                    size="small" 
                    icon={<UploadFileIcon />} 
                    label="Disponibil" 
                    color="success"
                    variant="outlined"
                    onClick={() => {
                      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/materials/${row.original.id}/download-sheet`;
                      window.open(downloadUrl, '_blank');
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
                <Tooltip title="Schimbă fișa tehnică">
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSelectedForUpload({
                        id: row.original.id,
                        name: row.original.name,
                        currentFile: sheet,
                      });
                      setUploadDialogOpen(true);
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Chip 
                size="small" 
                label="Încarcă" 
                variant="outlined"
                onClick={() => {
                  setSelectedForUpload({
                    id: row.original.id,
                    name: row.original.name,
                    currentFile: null,
                  });
                  setUploadDialogOpen(true);
                }}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Stack>
        );
      },
    },
    // LAST UPDATED column (hidden by default)
    {
      accessorKey: 'updatedAt',
      header: 'Actualizat',
      size: 150,
      enableEditing: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '—';
        const date = row.original.updatedAt;
        
        return (
          <Tooltip title={`Ultima modificare: ${formatDate(date)}`} arrow>
            <Chip 
              size="small" 
              icon={<UpdateIcon />} 
              label={formatDate(date)}
              variant="outlined"
            />
          </Tooltip>
        );
      },
    },
  ], []);

  /* -------- CRUD Handlers -------- */
  const handleCreateRow: MRT_TableOptions<TreeRow>['onCreatingRowSave'] = async ({ values, table }) => {
    setSaving(true);
    try {
      const code = trim(values.code);
      const description = trim(values.name);
      const unit = trim(values.unit) || 'buc';
      const price = Number(values.price) || 0;
      
      if (!code || !description) throw new Error('Codul și descrierea sunt obligatorii');
      if (!isValidUnit(unit)) throw new Error(`Unitate invalidă: ${unit}`);
      
      await createMaterialWithoutGroup({ code, description, unit, price, currency: 'RON' });
      successNotistack('Material creat cu succes!');
      await load();
      table.setCreatingRow(null);
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la creare');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRow: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ row, values, table }) => {
    setSaving(true);
    try {
      const code = trim(values.code);
      const description = trim(values.name);
      const unit = trim(values.unit) || 'buc';
      const price = Number(values.price) || 0;
      
      if (!code || !description) throw new Error('Codul și descrierea sunt obligatorii');
      if (!isValidUnit(unit)) throw new Error(`Unitate invalidă: ${unit}`);
      
      await updateMaterial(row.original.id, {
        code,
        description,
        unit,
        price,
        currency: row.original.currency || 'RON',
        technicalSheet: row.original.technicalSheet,
      });
      successNotistack('Material actualizat cu succes!');
      await load();
      table.setEditingRow(null);
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la actualizare');
    } finally {
      setSaving(false);
    }
  };

  /* -------- Table -------- */
  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: tree,

    // row identification
    getRowId: (row) => row.id,

    // Performance optimizations
    enableRowVirtualization: true,
    enablePagination: true,
    enableBottomToolbar: true,
    
    // filtering & sorting
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    enableFilterMatchHighlighting: true,  // Re-enabled for yellow highlighting
    enableFacetedValues: false,
    enableSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: true,
    globalFilterFn: 'fuzzy' as any,
    filterFns: {
      fuzzy: (row: any, columnId: string, value: string, addMeta: (meta: any) => void) => {
        if (!value) return true;
        const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
        const searchValue = String(value).toLowerCase();
        // Simple case-insensitive search for better performance
        if (cellValue.includes(searchValue)) {
          addMeta?.({ rank: 1 });
          return true;
        }
        // Fall back to fuzzy match for more sophisticated searches
        const itemRank = rankItem(cellValue, searchValue);
        addMeta?.(itemRank);
        return itemRank.passed;
      },
    },

    // editing
    enableEditing: true,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    onCreatingRowSave: handleCreateRow,
    onEditingRowSave: handleEditRow,
    positionCreatingRow: createPos,

    // row actions
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row, table }) => {
      return (
        <Stack direction="row" gap={1} justifyContent="flex-end">
          <Tooltip title="Istoric Prețuri">
            <span>
              <IconButton
                size="small"
                color="info"
                onClick={() => {
                  setSelectedMaterial({
                    code: row.original.code || '',
                    description: row.original.name,
                  });
                  setPriceHistoryOpen(true);
                }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Editează">
            <span>
              <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Șterge">
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={async () => {
                  const r = row.original;
                  const title = 'Confirmare ștergere';
                  const bodyTitle = 'Ești sigur că vrei să ștergi?';
                  const desc = (<span>Materialul <strong>{r.name}</strong> va fi șters permanent.</span>);
                  const ok = await confirm({ title, bodyTitle, description: desc, confirmText: 'Șterge', cancelText: 'Anulează', danger: true });
                  if (!ok) return;
                  setSaving(true);
                  try {
                    await deleteMaterial(r.id);
                    successNotistack('Material șters cu succes!');
                    await load();
                  } catch (e: any) {
                    errorNotistack(e?.message || 'Eroare la ștergere');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      );
    },

    // top toolbar
    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" gap={1}>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            setCreatePos(0);
            table.setCreatingRow(
              createRow(table, {
                type: 'material',
                id: `__new__${Date.now()}`,
                name: '',
                code: '',
                unit: 'buc',
                price: 0,
                currency: 'RON',
                number: '',
              }, 0, 0),
            );
          }}
        >
          Adaugă Material
        </Button>
        <Button variant="outlined" onClick={() => load()} disabled={loading}>
          Reîncarcă
        </Button>
      </Stack>
    ),

    // localization
    localization: MRT_Localization_RO,

    // look & feel like Qualifications page
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    displayColumnDefOptions: {
      'mrt-row-actions': { header: 'Acțiuni', size: 180 },
    },
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 280px)' } },
    rowVirtualizerOptions: { overscan: 10 },
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return { sx: { backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit' } };
    },

    // state persistence
    initialState: {
      ...persisted,
      columnVisibility: { 
        ...persisted.columnVisibility, 
        path: false,
        updatedAt: false  // Hide "Last Updated" column by default
      },
      density: (persisted.density as any) ?? 'compact',
      showGlobalFilter: true,
      pagination: { pageIndex: 0, pageSize: 25 },  // Default to 25 rows per page for better performance
    },
    onColumnVisibilityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().columnVisibility) : updater;
      savePersist({ columnVisibility: value as any });
    },
    onDensityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().density) : updater;
      savePersist({ density: value as any });
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ pagination: next as any });
        return next;
      });
    },
    onSortingChange: (updater) => {
      setSorting((prev: any) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ sorting: next as any });
        return next;
      });
    },
    onGlobalFilterChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().globalFilter) : updater;
      savePersist({ globalFilter: value as any });
    },

    // controlled loading banners
    state: {
      isLoading: loading,
      showProgressBars: saving,
      showAlertBanner: !!error,
      sorting,
      pagination,
    },
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <Inventory2RoundedIcon color="primary" />
            <Typography variant="h5">Materiale</Typography>
            {!loading && tree.length > 0 && (
              <Chip 
                size="small" 
                label={`${tree.length} materiale`}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Price History Modal */}
      {selectedMaterial && (
        <PriceHistoryModal
          open={priceHistoryOpen}
          onClose={() => {
            setPriceHistoryOpen(false);
            setSelectedMaterial(null);
          }}
          materialCode={selectedMaterial.code}
          materialDescription={selectedMaterial.description}
        />
      )}

      {/* Upload Technical Sheet Dialog */}
      {selectedForUpload && (
        <UploadTechnicalSheetDialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setSelectedForUpload(null);
          }}
          materialId={selectedForUpload.id}
          materialName={selectedForUpload.name}
          currentFile={selectedForUpload.currentFile}
          onUploadSuccess={() => {
            successNotistack('Fișa tehnică a fost actualizată!');
            load(); // Reload to show updated file status
          }}
        />
      )}
    </Box>
  );
}

// Wrap with QueryClientProvider for caching
export default function MaterialsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <MaterialsPageContent />
    </QueryClientProvider>
  );
}
