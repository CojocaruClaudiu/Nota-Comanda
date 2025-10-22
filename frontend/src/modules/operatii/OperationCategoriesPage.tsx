import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  CircularProgress, Alert, Chip
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

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
import { FisaOperatieModal } from '../projects/FisaOperatieModal';

import {
  listOperationCategories,
  createOperationCategory,
  updateOperationCategory,
  deleteOperationCategory,
  listOperations,
  createOperation,
  updateOperation,
  deleteOperation,
  listOperationItems,
  createOperationItem,
  updateOperationItem,
  deleteOperationItem,
  type OperationCategory,
  type Operation,
  type OperationItem,
} from '../../api/operationCategories';

const trim = (v?: string | null) => (v == null ? '' : String(v).trim());

/* ---------------- Types for the unified tree rows ---------------- */
type NodeType = 'category' | 'operation' | 'item';
interface TreeRow {
  type: NodeType;
  id: string;
  parentId?: string | null;
  name: string;
  unit?: string | null;
  number: string;              // 1 / 1.1 / 1.1.1
  subRows?: TreeRow[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;               // Category > Operation > Item (for fuzzy/global filter)
}

/* ---------------- Numbering helpers ---------------- */
function numberize(tree: TreeRow[]): TreeRow[] {
  return tree.map((cat, i) => {
    const catNum = `${i + 1}`;
    const ops = (cat.subRows || []).map((op, j) => {
      const opNum = `${catNum}.${j + 1}`;
      const items = (op.subRows || []).map((it, k) => ({
        ...it,
        number: `${opNum}.${k + 1}`,
      }));
      return { ...op, number: opNum, subRows: items };
    });
    return { ...cat, number: catNum, subRows: ops };
  });
}

/* ---------------- Concurrent build (faster) ---------------- */
async function buildTree(): Promise<TreeRow[]> {
  const cats = await listOperationCategories();

  const catNodes: TreeRow[] = await Promise.all(
    cats.map(async (c: OperationCategory) => {
      const ops = await listOperations(c.id);

      const opNodes: TreeRow[] = await Promise.all(
        ops.map(async (o: Operation) => {
          const items = await listOperationItems(o.id);
          const itemNodes: TreeRow[] = items.map((it: OperationItem) => ({
            type: 'item',
            id: it.id,
            parentId: o.id,
            name: it.name,
            unit: (it as any).unit ?? null,
            number: '',
            createdAt: (it as any).createdAt,
            updatedAt: (it as any).updatedAt,
          }));
          return {
            type: 'operation',
            id: o.id,
            parentId: c.id,
            name: o.name,
            number: '',
            subRows: itemNodes,
            createdAt: (o as any).createdAt,
            updatedAt: (o as any).updatedAt,
          };
        })
      );

      return {
        type: 'category',
        id: c.id,
        parentId: null,
        name: c.name,
        number: '',
        subRows: opNodes,
        createdAt: (c as any).createdAt,
        updatedAt: (c as any).updatedAt,
      };
    })
  );

  return numberize(catNodes);
}

/* ---------------- Add full text path for better global fuzzy filtering ---------------- */
function addPaths(nodes: TreeRow[], parentPath = ''): TreeRow[] {
  return nodes.map((n) => {
    const path = parentPath ? `${parentPath} > ${n.name}` : n.name;
    const sub = n.subRows ? addPaths(n.subRows, path) : undefined;
    return { ...n, path, subRows: sub };
  });
}

/* ---------------- Little persist helper ---------------- */
const STORAGE_KEY = 'opcats-table-state-v1';
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
export default function OperationCategoriesPage() {
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { successNotistack, errorNotistack } = useNotistack();

  // where the creating row appears
  const [createPos, setCreatePos] = useState<'top' | 'bottom' | number>('top');

  // FiÈ™a OperaÈ›ie modal state
  const [showFisaOperatie, setShowFisaOperatie] = useState(false);
  const [selectedOperationName, setSelectedOperationName] = useState<string>('');
  const [selectedOperationId, setSelectedOperationId] = useState<string>('');

  // state persistence
  const persisted = loadPersist();
  // controlled sorting state (fixes header toggle not updating)
  const [sorting, setSorting] = useState<any>(
    Array.isArray(persisted.sorting) ? persisted.sorting : []
  );
  // controlled pagination state to fix rows-per-page not applying until refresh
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>(
    persisted.pagination ?? { pageIndex: 0, pageSize: 50 }
  );
  const [globalFilterValue, setGlobalFilterValue] = useState<string>(
    typeof persisted.globalFilter === 'string' ? persisted.globalFilter : ''
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
  const t = await buildTree();
  setTree(addPaths(t));
    } catch (e: any) {
      setError(e?.message || 'Eroare la Ã®ncÄƒrcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(() => [
    // Hidden PATH column for powerful fuzzy/global filtering across hierarchy
    {
      id: 'path',
      header: 'CÄƒutare',
      accessorFn: (row) => row.path || row.name,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      filterFn: 'fuzzy' as any,
      size: 200,
      enableHiding: true,
      Cell: () => null,
    },
    // NUMBER column (left, monospace, aligns like "1", "1.1", "1.1.1")
    {
      accessorKey: 'number',
      header: '#',
      size: 90,
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
          {row.original.number || 'â€”'}
        </Box>
      ),
      enableEditing: false,
    },
    // NAME column with subtle type chip
    {
      accessorKey: 'name',
      header: 'Denumire',
      size: 520,
  enableColumnFilter: true,
  enableGlobalFilter: true,
  enableColumnFilterModes: true,
  filterFn: 'fuzzy' as any,
      muiEditTextFieldProps: { required: true, autoFocus: true },
      Cell: ({ row, renderedCellValue }) => {
        const t = row.original.type;
        const sub = row.original.subRows || [];
        const opsCount = t === 'category' ? sub.length : t === 'operation' ? sub.length : undefined;
        const itemsCount = t === 'category'
          ? sub.reduce((acc, op) => acc + ((op.subRows?.length) || 0), 0)
          : t === 'operation'
            ? sub.length
            : undefined;
        const unit = trim(row.original.unit);
        return (
          <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25 }}>
            {t !== 'category' && <SubdirectoryArrowRightIcon fontSize="small" />}
            <Typography
              variant="body1"
              sx={{ fontWeight: t === 'category' ? 600 : 400 }}
            >
              {renderedCellValue as string}
            </Typography>
            <Chip
              size="small"
              label={t === 'category' ? 'Categorie' : t === 'operation' ? 'OperaÈ›ie' : 'Element'}
              variant="outlined"
            />
            {t === 'item' && unit && (
              <Chip size="small" color="info" variant="outlined" label={unit} />
            )}
            {t === 'category' && (
              <>
                <Chip size="small" variant="outlined" label={`${opsCount ?? 0} operaÈ›ii`} />
                <Chip size="small" variant="outlined" label={`${itemsCount ?? 0} elemente`} />
              </>
            )}
            {t === 'operation' && (
              <Chip size="small" variant="outlined" label={`${itemsCount ?? 0} elemente`} />
            )}
          </Stack>
        );
      },
    },
    // UNIT column (editable only for items)
    {
      accessorKey: 'unit',
      header: 'Unitate',
      size: 120,
  enableColumnFilter: true,
      enableGlobalFilter: false,
  filterVariant: 'select',
  filterSelectOptions: unitSelectOptions as any,
  filterFn: 'equalsString' as any,
      editVariant: 'select',
  editSelectOptions: unitSelectOptions as any,
      // keep editable, but disable input for non-item rows
      muiEditTextFieldProps: ({ row }: any) => ({
        select: true,
        placeholder: 'Alege unitatea',
        disabled: row?.original?.type !== 'item',
      }),
      Cell: ({ row, renderedCellValue }) => {
        const val = trim(renderedCellValue as string);
        return row.original.type === 'item' ? (val || 'â€”') : 'â€”';
      },
    },
  ], []);

  /* -------- CRUD handlers -------- */
  const handleCreateRow: MRT_TableOptions<TreeRow>['onCreatingRowSave'] = async ({ values, row, table }) => {
    const name = trim(values.name as string);
    if (!name) return;
  let unit = trim(values.unit as string | undefined);
  if (!isValidUnit(unit)) unit = '';

    try {
      setSaving(true);
      const tRow = row.original as TreeRow;

      if (tRow.type === 'category') {
        await createOperationCategory({ name });
      } else if (tRow.type === 'operation') {
        const categoryId = tRow.parentId!;
        await createOperation(categoryId, { name });
      } else {
        const operationId = tRow.parentId!;
  await createOperationItem(operationId, { name, unit: unit || null });
      }
      table.setCreatingRow(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleEditRow: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ values, row, table }) => {
    const name = trim(values.name as string);
    if (!name) return;
  let unit = trim(values.unit as string | undefined);
  if (!isValidUnit(unit)) unit = '';

    const r = row.original as TreeRow;
    try {
      setSaving(true);
      if (r.type === 'category') await updateOperationCategory(r.id, { name });
      else if (r.type === 'operation') await updateOperation(r.id, { name });
  else await updateOperationItem(r.id, { name, unit: unit || null });
      table.setEditingRow(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  /* -------- Table -------- */
  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: tree,

    // tree data
    getRowId: (row) => `${row.type}:${row.id}`,
    getSubRows: (row) => row.subRows,
    getRowCanExpand: (row) => row.original.type !== 'item',
  enableExpanding: true,
    enableExpandAll: true,
    autoResetExpanded: false,
  autoResetPageIndex: false,

    // filtering & sorting (advanced)
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
  enableFilterMatchHighlighting: true,
    enableFacetedValues: true,
    enableSorting: true,
    enableMultiSort: true,
  enableSortingRemoval: true,
    filterFromLeafRows: true, // keep parents if any leaf matches
    globalFilterFn: 'fuzzy' as any,
    filterFns: {
      // simple fuzzy filter using match-sorter-utils
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fuzzy: (row: any, columnId: string, value: string, addMeta: (meta: any) => void) => {
        const itemRank = rankItem(String(row.getValue(columnId) ?? ''), String(value ?? ''));
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

    // built-in row actions column
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row, staticRowIndex, table }) => {
      const addChild = (childType: NodeType) => {
        const tempId = `__new__${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const insertIndex = (staticRowIndex ?? row.index) + 1; // right after clicked row
        setCreatePos(insertIndex);
        table.setCreatingRow(
          createRow(
            table,
            {
              type: childType,
              id: tempId,
              parentId: row.original.id,
              name: '',
              number: '',
              subRows: childType !== 'item' ? [] : undefined,
              unit: childType === 'item' ? '' : undefined,
            },
            insertIndex,
            row.depth + 1,
          ),
        );
      };

      return (
        <Stack direction="row" gap={1} justifyContent="flex-end">
          {row.original.type === 'category' && (
            <Tooltip title="AdaugÄƒ operaÈ›ie">
              <span>
                <IconButton size="small" onClick={() => addChild('operation')}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {row.original.type === 'operation' && (
            <Tooltip title="AdaugÄƒ element">
              <span>
                <IconButton size="small" onClick={() => addChild('item')}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {row.original.type === 'item' && (
            <Tooltip title="Vezi FiÈ™a OperaÈ›ie">
              <span>
                <IconButton 
                  size="small" 
                  color="primary"
                  onClick={() => {
                    setSelectedOperationName(row.original.name);
                    setSelectedOperationId(row.original.id);
                    setShowFisaOperatie(true);
                  }}
                >
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="EditeazÄƒ">
            <span>
              <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="È˜terge">
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={async () => {
                  const r = row.original;
                  const isCategory = r.type === 'category';
                  const isOperation = r.type === 'operation';
                  const title = 'Confirmare È™tergere';
                  const bodyTitle = 'EÈ™ti sigur cÄƒ vrei sÄƒ È™tergi?';
                  const desc = isCategory
                    ? (<span>Categoria <strong>{r.name}</strong> È™i toate operaÈ›iile È™i elementele din ea vor fi È™terse permanent.</span>)
                    : isOperation
                      ? (<span>OperaÈ›ia <strong>{r.name}</strong> È™i toate elementele ei vor fi È™terse permanent.</span>)
                      : (<span>Elementul <strong>{r.name}</strong> va fi È™ters permanent.</span>);
                  const ok = await confirm({ title, bodyTitle, description: desc, confirmText: 'È˜terge', cancelText: 'AnuleazÄƒ', danger: true });
                  if (!ok) return;
                  try {
                    setSaving(true);
                    if (isCategory) await deleteOperationCategory(r.id);
                    else if (isOperation) await deleteOperation(r.id);
                    else await deleteOperationItem(r.id);
                    await load();
                    successNotistack('È˜ters');
                  } catch (e: any) {
                    errorNotistack(e?.message || 'Nu am putut È™terge');
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

    // look & feel
    localization: MRT_Localization_RO,
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    positionExpandColumn: 'first',
    displayColumnDefOptions: {
      'mrt-row-expand': { size: 56 },
      'mrt-row-actions': {
        header: 'AcÈ›iuni',
        size: 180,
        muiTableBodyCellProps: {
          sx: {
            opacity: 0.9,
            transition: 'opacity .15s ease',
            '.MuiTableRow-root:hover &': { opacity: 1 },
          },
        },
      },
    },

    // container sizing
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 220px)' } },

    // zebra stripes like Suppliers table
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return {
        sx: {
          backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit',
        },
      };
    },

    // toolbars
    muiSearchTextFieldProps: {
      placeholder: 'CautÄƒ categorie/operaÈ›ie/elementâ€¦',
      variant: 'outlined',
      sx: { minWidth: 320 },
    },
    muiToolbarAlertBannerProps: error ? { color: 'error', children: error } : undefined,

    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" gap={1}>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            const tempId = `__new__${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const insertIndex = table.getRowModel().rows.length; // bottom
            setCreatePos(insertIndex); // or 'bottom'
            table.setCreatingRow(
              createRow(
                table,
                { type: 'category', id: tempId, parentId: null, name: '', number: '', subRows: [] },
                insertIndex,
                0,
              ),
            );
          }}
        >
          AdaugÄƒ categorie
        </Button>
        <Button variant="outlined" onClick={() => load()} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : 'ReÃ®ncarcÄƒ'}
        </Button>
      </Stack>
    ),

    // initial & controlled state (+ persisted)
    initialState: {
      expanded: true,
  // pagination is controlled via state
      showGlobalFilter: true,
      showColumnFilters: true,
      columnPinning: persisted.columnPinning ?? { left: ['mrt-row-expand', 'number'], right: ['mrt-row-actions'] },
      density: persisted.density ?? 'compact',
  columnVisibility: { path: false, ...(persisted.columnVisibility ?? {}) },
      columnOrder: persisted.columnOrder,
      globalFilter: persisted.globalFilter,
    },

    // save user preferences
    onColumnPinningChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().columnPinning) : updater;
      savePersist({ columnPinning: value });
    },
    onColumnVisibilityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().columnVisibility) : updater;
      savePersist({ columnVisibility: value as any });
    },
    onColumnOrderChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().columnOrder) : updater;
      savePersist({ columnOrder: value as any });
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ pagination: next as any });
        return next as { pageIndex: number; pageSize: number };
      });
    },
    onDensityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().density) : updater;
      savePersist({ density: value as any });
    },
    onSortingChange: (updater) => {
      setSorting((prev: any) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ sorting: next as any });
        return next;
      });
    },
    onGlobalFilterChange: (updater) => {\n      setGlobalFilterValue((prev) => {\n        const next = typeof updater === 'function' ? updater(prev) : updater;\n        savePersist({ globalFilter: next as any });\n        return next as string;\n      });\n    },

    // controlled loading banners
    state: {\n      isLoading: loading,\n      showProgressBars: saving,\n      showAlertBanner: !!error,\n      sorting,\n      pagination,\n      globalFilter: globalFilterValue,
    },

    // Optional perf toggles for big datasets:
    // enableRowVirtualization: true,
    // estimateSize: () => 44,
  });

  // Auto-expand ancestors when filtering so matches nested under collapsed parents become visible
  const globalFilter = globalFilterValue || '';
  const columnFilters = table.getState().columnFilters as unknown as Array<unknown> | undefined;
  const hasActiveFilter = Boolean(globalFilter) || Boolean(columnFilters && columnFilters.length);

  useEffect(() => {
    if (!hasActiveFilter) return; // don't override when there's no filtering
    const expandMap: Record<string, boolean> = {};
    const walk = (rows: any[]) => {
      rows.forEach((r) => {
        if (r.subRows?.length) {
          expandMap[r.id] = true; // expand every parent that has visible children after filter
          walk(r.subRows);
        }
      });
    };
    const filteredRows: any[] = table.getFilteredRowModel().rows;
    walk(filteredRows);
    table.setExpanded(expandMap);
  }, [table, hasActiveFilter, globalFilter]);

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Categorii / OperaÈ›ii / Elemente</Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* FiÈ™a OperaÈ›ie Modal */}
      <FisaOperatieModal
        open={showFisaOperatie}
        onClose={() => {
          setShowFisaOperatie(false);
          setSelectedOperationName('');
          setSelectedOperationId('');
        }}
        operationName={selectedOperationName}
        operationId={selectedOperationId}
      />
    </Box>
  );
}


