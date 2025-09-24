import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable, createRow, type MRT_ColumnDef, type MRT_Row, type MRT_TableOptions } from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { Box, Paper, Stack, Typography, Button, IconButton, Tooltip, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

import { listEquipment, createEquipment, updateEquipment, deleteEquipment, renameEquipmentCategory, type Equipment, type EquipmentPayload } from '../../api/equipment';

function ConfirmDialog({ open, title, message, onCancel, onConfirm }: { open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel}>Anulează</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Șterge</Button>
      </DialogActions>
    </Dialog>
  );
}

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
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MRT_Row<TreeRow> | null>(null);

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
            })),
        }));
  setTree(numberize(cats));
    } catch (e: any) {
      setError(e?.message || 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

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
        const itemsCount = t === 'category' ? sub.length : undefined;
        return (
          <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25 }}>
            {t !== 'category' && <SubdirectoryArrowRightIcon fontSize="small" />}
            <Typography variant="body1" sx={{ fontWeight: t === 'category' ? 600 : 400 }}>
              {renderedCellValue as string}
            </Typography>
            {t === 'category' && (
              <Chip size="small" variant="outlined" label={`${itemsCount ?? 0} articole`} />
            )}
          </Stack>
        );
      },
    },
    // Code column (items only)
    { accessorKey: 'code', header: 'Cod', size: 350, enableGlobalFilter: true, Cell: ({ row, cell }) => row.original.type === 'item' ? (cell.getValue<string>() || '—') : '—', muiEditTextFieldProps: ({ row }: any) => ({ disabled: row?.original?.type !== 'item' }) },
    // Hourly cost column (items only)
    { accessorKey: 'hourlyCost', header: 'Cost orar (RON)', size: 250, Cell: ({ row, cell }) => row.original.type === 'item' ? Number(cell.getValue<number>() || 0).toFixed(2) : '—', muiEditTextFieldProps: ({ row }: any) => ({ type: 'number', inputProps: { step: 0.01 }, disabled: row?.original?.type !== 'item' }) },
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
    try { setSaving(true); await createEquipment(payload); table.setCreatingRow(null); await load(); } finally { setSaving(false); }
  };

  const handleEditRow: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ values, row, table }) => {
    const r = row.original as TreeRow;
    if (r.type === 'category') {
      const from = r.name;
      const to = String(values.name || '').trim();
      if (!to || to === from) { table.setEditingRow(null); return; }
      try { setSaving(true); await renameEquipmentCategory(from, to); table.setEditingRow(null); await load(); } finally { setSaving(false); }
      return;
    }
    // item edit
    const description = String(values.name || '').trim();
    const code = String(values.code || '').trim();
    const hourlyCost = Number(values.hourlyCost || 0);
    const category = String(r.parentId || '').trim();
    if (!category || !description || !code) return;
    const payload: EquipmentPayload = { category, code, description, hourlyCost };
    try { setSaving(true); await updateEquipment(r.id, payload); table.setEditingRow(null); await load(); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const r = pendingDelete.original as TreeRow;
    setPendingDelete(null);
    if (r.type !== 'item') return; // don't delete categories in bulk
    try { setSaving(true); await deleteEquipment(r.id); await load(); } finally { setSaving(false); }
  };

  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: tree,

    // tree
    getRowId: (row) => `${row.type}:${row.id}`,
    getSubRows: (row) => row.subRows,
    getRowCanExpand: (row) => row.original.type === 'category',
    enableExpanding: true,
    enableExpandAll: true,
    initialState: { expanded: true, showGlobalFilter: true, density: 'compact' },
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
        // simple contains for now (could wire match-sorter like operations page)
        const hay = String(row.getValue(columnId) ?? '').toLowerCase();
        const needle = String(value ?? '').toLowerCase();
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
                <IconButton size="small" color="error" onClick={() => setPendingDelete(row)}>
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Confirmare ștergere"
        message="Această acțiune nu poate fi anulată."
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
