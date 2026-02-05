import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable, createRow, type MRT_ColumnDef, type MRT_TableOptions } from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { Box, Paper, Stack, Typography, Button, IconButton, Tooltip, Chip, Alert } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

import { listEquipment, createEquipment, updateEquipment, deleteEquipment, renameEquipmentCategory, type Equipment, type EquipmentPayload } from '../../api/equipment';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import useNotistack from '../orders/hooks/useNotistack';

// removed inline confirm dialog in favor of global ConfirmProvider

/* Types for the tree rows */
type NodeType = 'category' | 'item';
interface TreeRow {
  type: NodeType;
  id: string; // category: categoryName; item: equipment.id
  parentId?: string | null; // for item: categoryName
  name: string; // category: categoryName; item: description
  code?: string; // only for items
  hourlyCost?: number; // only for items
  number?: string; // 1 / 1.1
  subRows?: TreeRow[];
  path?: string; // Category > Item
}

function numberize(tree: TreeRow[]): TreeRow[] {
  return tree.map((cat, i) => {
    const catNum = `${i + 1}`;
    const items = (cat.subRows || []).map((it, j) => ({ ...it, number: `${catNum}.${j + 1}` }));
    return { ...cat, number: catNum, subRows: items };
  });
}

  

export default function EquipmentPage() {
  const confirm = useConfirm();
  const { successNotistack, errorNotistack } = useNotistack();
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // delete confirmation handled per-click using useConfirm

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listEquipment();
      // group by category
      const byCat = new Map<string, Equipment[]>();
      list.forEach((e) => {
        const key = (e.category || '').trim() || '(Fără categorie)';
        const arr = byCat.get(key) || [];
        arr.push(e);
        byCat.set(key, arr);
      });
      const cats: TreeRow[] = Array.from(byCat.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, items]) => ({
          type: 'category',
          id: category,
          parentId: null,
          name: category,
          subRows: items
            .sort((a, b) => a.description.localeCompare(b.description))
            .map((it) => ({
              type: 'item',
              id: it.id,
              parentId: category,
              name: it.description,
              code: it.code,
              hourlyCost: it.hourlyCost,
              // attach extra fields to be available in row.original
              serialNumber: (it as any).serialNumber,
              referenceNumber: (it as any).referenceNumber,
              status: (it as any).status,
              lastRepairDate: (it as any).lastRepairDate,
              repairCost: (it as any).repairCost,
              repairCount: (it as any).repairCount,
              warranty: (it as any).warranty,
              equipmentNumber: (it as any).equipmentNumber,
              generation: (it as any).generation,
              purchasePrice: (it as any).purchasePrice,
            })),
        }));
  setTree(numberize(cats));
    } catch (e: any) {
    const msg = e?.message || 'Eroare la încărcare';
    setError(msg);
    errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);
  useEffect(() => { void load(); }, [load]);

  // Extract vendor product code (prefix before any :: suffix)
  const getProductCode = useCallback((code?: string) => {
    if (!code) return '';
    const idx = code.indexOf('::');
    return idx === -1 ? code : code.slice(0, idx);
  }, []);

  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(() => [
    // Number column
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
        <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>
          {row.original.number || '—'}
        </Box>
      ),
      enableEditing: false,
    },
    // Name column with type chip and counts
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
        if (t === 'item') {
          return (
            <Stack direction="row" alignItems="flex-start" gap={1} sx={{ py: 0.25 }}>
              <SubdirectoryArrowRightIcon fontSize="small" />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 400 }}>
                  {renderedCellValue as string}
                </Typography>
                {row.original.code && (
                  <Typography variant="caption" color="text.secondary">#{getProductCode(row.original.code)}</Typography>
                )}
              </Box>
            </Stack>
          );
        }
        const itemsCount = sub.length;
        return (
          <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {renderedCellValue as string}
            </Typography>
            <Chip size="small" variant="outlined" label={`${itemsCount ?? 0} articole`} />
          </Stack>
        );
      },
    },
    // Derived product code (read-only, vendor code prefix)
    { id: 'productCode', header: 'Cod produs', size: 220, enableGlobalFilter: true, accessorFn: (row) => getProductCode((row as any).code), enableEditing: false },
    // Code column (items only)
    { accessorKey: 'code', header: 'Cod', size: 350, enableGlobalFilter: true, Cell: ({ row, cell }) => row.original.type === 'item' ? (cell.getValue<string>() || '—') : '—', muiEditTextFieldProps: ({ row }: any) => ({ disabled: row?.original?.type !== 'item' }) },
  // Hourly cost column (items only)
  { accessorKey: 'hourlyCost', header: 'Cost orar (RON)', size: 140, Cell: ({ row, cell }) => row.original.type === 'item' ? Number(cell.getValue<number>() || 0).toFixed(2) : '—', muiEditTextFieldProps: ({ row }: any) => ({ type: 'number', inputProps: { step: 0.01 }, disabled: row?.original?.type !== 'item' }) },
  // New read-only columns
  { accessorKey: 'status', header: 'Status', size: 120, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? (row.original as any).status || '—' : '—' },
  { accessorKey: 'serialNumber', header: 'Serie', size: 160, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? (row.original as any).serialNumber || '—' : '—' },
  { accessorKey: 'referenceNumber', header: 'Nr. referință', size: 160, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? (row.original as any).referenceNumber || '—' : '—' },
  { accessorKey: 'lastRepairDate', header: 'Ult. reparație', size: 160, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).lastRepairDate ? new Date((row.original as any).lastRepairDate).toLocaleDateString() : '—') : '—' },
  { accessorKey: 'repairCost', header: 'Cost reparație', size: 140, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).repairCost != null ? Number((row.original as any).repairCost).toFixed(2) : '—') : '—' },
  { accessorKey: 'repairCount', header: 'Nr. reparații', size: 120, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).repairCount != null ? String((row.original as any).repairCount) : '—') : '—' },
  { accessorKey: 'warranty', header: 'Garanție', size: 160, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).warranty || '—') : '—' },
  { accessorKey: 'equipmentNumber', header: 'Nr. echipament', size: 160, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).equipmentNumber || '—') : '—' },
  { accessorKey: 'generation', header: 'Generație', size: 120, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).generation || '—') : '—' },
  { accessorKey: 'purchasePrice', header: 'Preț achiziție', size: 140, enableEditing: false, Cell: ({ row }) => row.original.type === 'item' ? ((row.original as any).purchasePrice != null ? Number((row.original as any).purchasePrice).toFixed(2) : '—') : '—' },
  ], []);

  // Create/Edit handlers
  const handleCreateRow: MRT_TableOptions<TreeRow>['onCreatingRowSave'] = async ({ values, row, table }) => {
    const t = row.original as TreeRow;
    if (t.type === 'category') {
      // Not creating categories directly (no separate entity). Add a child item instead via action.
      table.setCreatingRow(null);
      return;
    }
    // Item create
    const description = String(values.name || '').trim();
    const code = String(values.code || '').trim();
    const hourlyCost = Number(values.hourlyCost || 0);
    const category = String(t.parentId || '').trim();
    if (!category || !description || !code) return;
    const payload: EquipmentPayload = { category, code, description, hourlyCost };
    try {
      setSaving(true);
      await createEquipment(payload);
      table.setCreatingRow(null);
      await load();
      successNotistack('Echipament creat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut crea echipamentul');
    } finally { setSaving(false); }
  };

  const handleEditRow: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ values, row, table }) => {
    const r = row.original as TreeRow;
    if (r.type === 'category') {
      const from = r.name;
      const to = String(values.name || '').trim();
      if (!to || to === from) { table.setEditingRow(null); return; }
      try {
        setSaving(true);
        await renameEquipmentCategory(from, to);
        table.setEditingRow(null);
        await load();
        successNotistack('Categorie actualizată');
      } catch (e: any) {
        errorNotistack(e?.message || 'Nu am putut redenumi categoria');
      } finally { setSaving(false); }
      return;
    }
    // item edit
    const description = String(values.name || '').trim();
    const code = String(values.code || '').trim();
    const hourlyCost = Number(values.hourlyCost || 0);
    const category = String(r.parentId || '').trim();
    if (!category || !description || !code) return;
    const payload: EquipmentPayload = { category, code, description, hourlyCost };
    try {
      setSaving(true);
      await updateEquipment(r.id, payload);
      table.setEditingRow(null);
      await load();
      successNotistack('Echipament actualizat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut actualiza echipamentul');
    } finally { setSaving(false); }
  };

  // per-row delete handled inline via useConfirm

  // diacritic-insensitive normalizer for searching/filtering (ă â î ș ţ, etc.)
  const normalize = useCallback(
    (v: unknown) =>
      String(v ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase(),
    [],
  );

  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: tree,

    // tree
    getRowId: (row) => `${row.type}:${row.id}`,
    getSubRows: (row) => row.subRows,
    getRowCanExpand: (row) => row.original.type === 'category',
    enableExpanding: true,
    enableExpandAll: true,
    initialState: { expanded: true, showGlobalFilter: true, density: 'compact', columnVisibility: { code: false } },
    autoResetExpanded: false,

    // filtering
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    globalFilterFn: 'fuzzy' as any,
    filterFromLeafRows: true,
    filterFns: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fuzzy: (row: any, columnId: string, value: string, addMeta: (meta: any) => void) => {
        // diacritic-insensitive contains match (ă/â/î/ș/ţ)
        const hay = normalize(row.getValue(columnId));
        const needle = normalize(value);
        const passed = hay.includes(needle);
        addMeta?.({ passed });
        return passed;
      },
    },

    // editing
    enableEditing: true,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    onCreatingRowSave: handleCreateRow,
    onEditingRowSave: handleEditRow,

    // actions
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row, staticRowIndex, table }) => {
      const addChild = () => {
        const tempId = `__new__${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const insertIndex = (staticRowIndex ?? row.index) + 1;
        table.setCreatingRow(
          createRow(
            table,
            {
              type: 'item',
              id: tempId,
              parentId: row.original.id, // category name
              name: '',
              code: '',
              hourlyCost: 0,
              number: '',
            },
            insertIndex,
            row.depth + 1,
          ),
        );
      };

      return (
        <Stack direction="row" gap={1} justifyContent="flex-end">
          {row.original.type === 'category' && (
            <Tooltip title="Adaugă echipament">
              <span>
                <IconButton size="small" onClick={addChild}><AddRoundedIcon fontSize="small" /></IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Editează">
            <span>
              <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {row.original.type === 'item' && (
            <Tooltip title="Șterge">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={async () => {
                    if (row.original.type !== 'item') return;
                    const ok = await confirm({
                      title: 'Confirmare Ștergere',
                      bodyTitle: 'Ești sigur că vrei să ștergi?',
                      description: (
                        <>Echipamentul <strong>{row.original.name}</strong> va fi șters permanent.</>
                      ),
                      confirmText: 'Șterge',
                      cancelText: 'Anulează',
                      danger: true,
                    });
                    if (!ok) return;
                    try {
                      setSaving(true);
                      await deleteEquipment(row.original.id);
                      await load();
                      successNotistack('Șters');
                    } catch (e: any) {
                      errorNotistack(e?.message || 'Nu am putut șterge');
                    } finally { setSaving(false); }
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
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
      'mrt-row-actions': { header: 'Acțiuni', size: 160 },
    },

    // container sizing
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 220px)' } },

    // zebra stripes
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return { sx: { backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit' } };
    },

    // banners
    muiToolbarAlertBannerProps: error ? { color: 'error', children: error } : undefined,
    state: { isLoading: loading, showProgressBars: saving, showAlertBanner: !!error },
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Scule & Echipamente</Typography>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => load()} disabled={loading}>
              Reîncarcă
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

  {/* deletion confirmation handled by global ConfirmProvider */}
    </Box>
  );
}
