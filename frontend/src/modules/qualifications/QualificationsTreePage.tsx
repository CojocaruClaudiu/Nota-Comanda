import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable, createRow, type MRT_ColumnDef, type MRT_TableOptions } from 'material-react-table';
import { Box, Paper, Stack, Typography, Button, IconButton, Tooltip, Chip, Alert } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { useConfirm } from '../common/confirm/ConfirmProvider';

import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from '../orders/hooks/useNotistack';
import { getQualifications, createQualification, updateQualification, deleteQualification } from '../../api/qualifications';
import { createLaborLine, getLaborLines, updateLaborLine, deleteLaborLine, type LaborLinePayload } from '../../api/laborLines';

type NodeType = 'qualification' | 'line';
type TreeRow = {
  type: NodeType;
  id: string;
  parentId?: string | null; // qualificationId for lines
  name: string;
  unit?: string;
  hourlyRate?: number;
  currency?: 'RON' | 'EUR';
  active?: boolean;
  number?: string;
  subRows?: TreeRow[];
};

export default function QualificationsTreePage() {
  const { successNotistack, errorNotistack } = useNotistack();
  const confirm = useConfirm();
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingRowIndex, setCreatingRowIndex] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quals = await getQualifications();
      const nodes: TreeRow[] = [];
      for (const q of quals.sort((a, b) => a.name.localeCompare(b.name))) {
        const lines = await getLaborLines(q.id);
        nodes.push({
          type: 'qualification', id: q.id, name: q.name, parentId: null,
          subRows: lines.sort((a, b) => a.name.localeCompare(b.name)).map((l) => ({
            type: 'line', id: l.id, parentId: q.id, name: l.name, unit: l.unit, hourlyRate: l.hourlyRate, currency: l.currency, active: l.active,
          })),
        });
      }
      // add numbering
      const numbered = nodes.map((q, i) => ({ ...q, number: `${i + 1}`, subRows: (q.subRows || []).map((l, j) => ({ ...l, number: `${i + 1}.${j + 1}` })) }));
      setTree(numbered);
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcare';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(() => [
    {
      accessorKey: 'number',
      header: '#',
      size: 80,
      enableEditing: false,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => (
        <Box sx={{ fontFamily: 'ui-monospace, monospace', letterSpacing: 0.2 }}>{row.original.number}</Box>
      ),
    },
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
        const isQual = row.original.type === 'qualification';
        const count = isQual ? (row.original.subRows?.length || 0) : undefined;
        return (
          <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25 }}>
            {!isQual && <SubdirectoryArrowRightIcon fontSize="small" />}
            <Typography variant="body1" sx={{ fontWeight: isQual ? 600 : 400 }}>{renderedCellValue as string}</Typography>
            {isQual && <Chip size="small" variant="outlined" label={`${count ?? 0} linii`} />}
          </Stack>
        );
      },
    },
    {
      accessorKey: 'unit',
      header: 'Unitate',
      size: 140,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      Cell: ({ row, cell }) => (row.original.type === 'line' ? (cell.getValue<string>() || 'ora') : '—'),
      muiEditTextFieldProps: ({ row }: any) => ({ disabled: row?.original?.type !== 'line' }),
    },
    {
      accessorKey: 'hourlyRate',
      header: 'Tarif orar (RON)',
      size: 200,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      Cell: ({ row, cell }) => (row.original.type === 'line' ? Number(cell.getValue<number>() || 0).toFixed(2) : '—'),
      muiEditTextFieldProps: ({ row }: any) => ({ type: 'number', inputProps: { step: 0.01 }, disabled: row?.original?.type !== 'line' }),
    },
    {
      accessorKey: 'currency',
      header: 'Monedă',
      size: 120,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      Cell: ({ row, cell }) => (row.original.type === 'line' ? (cell.getValue<'RON' | 'EUR'>() || 'RON') : '—'),
      muiEditTextFieldProps: ({ row }: any) => ({ disabled: row?.original?.type !== 'line' }),
    },
  ], []);

  // Create/Edit saves
  const onCreate: MRT_TableOptions<TreeRow>['onCreatingRowSave'] = async ({ values, row, table }) => {
  const type = row.original.type;
    if (type === 'qualification') {
      const name = String(values.name || '').trim();
      if (!name) return;
  try { setSaving(true); await createQualification({ name }); table.setCreatingRow(null); await load(); successNotistack('Calificare creată'); }
      catch (e: any) { errorNotistack(e?.message || 'Nu am putut crea calificarea'); }
      finally { setSaving(false); }
      return;
    }
    // line
    const qualificationId = String(row.original.parentId || '');
    const payload: LaborLinePayload = {
      name: String(values.name || '').trim(),
      unit: String(values.unit || 'ora').trim(),
      hourlyRate: Number(values.hourlyRate || 0),
      currency: (String(values.currency || 'RON') as 'RON' | 'EUR'),
    };
    if (!payload.name || !qualificationId) return;
  try { setSaving(true); await createLaborLine(qualificationId, payload); table.setCreatingRow(null); await load(); successNotistack('Linie creată'); }
    catch (e: any) { errorNotistack(e?.message || 'Nu am putut crea linia'); }
    finally { setSaving(false); }
  };

  const onEdit: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ values, row, table }) => {
    const r = row.original;
    if (r.type === 'qualification') {
      const newName = String(values.name || '').trim();
      if (!newName || newName === r.name) { table.setEditingRow(null); return; }
  try { setSaving(true); await updateQualification(r.id, { name: newName }); table.setEditingRow(null); await load(); successNotistack('Calificare actualizată'); }
      catch (e: any) { errorNotistack(e?.message || 'Nu am putut redenumi calificarea'); }
      finally { setSaving(false); }
      return;
    }
    const payload: LaborLinePayload = {
      name: String(values.name || '').trim(),
      unit: String(values.unit || 'ora').trim(),
      hourlyRate: Number(values.hourlyRate || 0),
      currency: (String(values.currency || 'RON') as 'RON' | 'EUR'),
    };
    if (!payload.name) return;
  try { setSaving(true); await updateLaborLine(r.id, payload); table.setEditingRow(null); await load(); successNotistack('Linie actualizată'); }
    catch (e: any) { errorNotistack(e?.message || 'Nu am putut actualiza linia'); }
    finally { setSaving(false); }
  };

  // delete is handled via useConfirm hook

  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: tree,
    localization: tableLocalization,
    state: { isLoading: loading, showProgressBars: saving, showAlertBanner: !!error },
    initialState: { showGlobalFilter: true, density: 'compact', expanded: true },
    getRowId: (r) => `${r.type}:${r.id}`,
    getSubRows: (r) => r.subRows,
    getRowCanExpand: (r) => r.original.type === 'qualification',
    enableExpanding: true,
    enableExpandAll: true,
    enableEditing: true,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    onCreatingRowSave: onCreate,
    onEditingRowSave: onEdit,
    enableRowActions: true,
    positionActionsColumn: 'last',
    // filtering like Equipment page
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    filterFromLeafRows: true,
    globalFilterFn: 'fuzzy' as any,
    filterFns: {
      // simple contains matching
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fuzzy: (row: any, columnId: string, value: string, addMeta: (meta: any) => void) => {
        const hay = String(row.getValue(columnId) ?? '').toLowerCase();
        const needle = String(value ?? '').toLowerCase();
        const passed = hay.includes(needle);
        addMeta?.({ passed });
        return passed;
      },
    },
    // look & feel like Equipment page
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    positionExpandColumn: 'first',
    displayColumnDefOptions: {
      'mrt-row-expand': { size: 56 },
      'mrt-row-actions': { header: 'Acțiuni', size: 160 },
    },
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 220px)' } },
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return { sx: { backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit' } };
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" gap={1}>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => {
      // create new qualification at the bottom
      const insertIndex = table.getRowModel().rows.length;
      setCreatingRowIndex(insertIndex);
      table.setCreatingRow(createRow(table, { type: 'qualification', id: `__new__${Date.now()}`, parentId: null, name: '', number: '' }, insertIndex, 0));
        }}>Adaugă calificare</Button>
        <Button variant="outlined" onClick={() => load()} disabled={loading}>Reîncarcă</Button>
      </Stack>
    ),
    renderRowActions: ({ row, staticRowIndex, table }) => (
      <Stack direction="row" gap={1}>
        <Tooltip title="Editează"><span><IconButton size="small" onClick={() => table.setEditingRow(row)}><EditOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Șterge"><span><IconButton color="error" size="small" onClick={async () => {
          const isLine = row.original.type === 'line';
          const ok = await confirm({
            title: 'Confirmare Ștergere',
            bodyTitle: 'Ești sigur că vrei să ștergi?',
            description: (
              <>
                {isLine ? (
                  <>Linia de manoperă <strong>{row.original.name}</strong> va fi ștearsă permanent.</>
                ) : (
                  <>Calificarea <strong>{row.original.name}</strong> va fi ștearsă permanent.</>
                )}
              </>
            ),
            confirmText: 'Șterge',
            cancelText: 'Anulează',
            danger: true,
          });
          if (!ok) return;
          try {
            setSaving(true);
            if (isLine) await deleteLaborLine(row.original.id);
            else await deleteQualification(row.original.id);
            await load();
            successNotistack('Șters');
          } catch (e: any) {
            errorNotistack(e?.message || 'Nu am putut șterge');
          } finally {
            setSaving(false);
          }
        }}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
        {row.original.type === 'qualification' && (
          <Tooltip title="Adaugă linie"><span><IconButton size="small" onClick={() => {
    const insertIndex = (staticRowIndex ?? row.index) + 1;
    setCreatingRowIndex(insertIndex);
            table.setCreatingRow(createRow(table, { type: 'line', id: `__new__${Date.now()}`, parentId: row.original.id, name: '', unit: 'ora', hourlyRate: 0, currency: 'RON', number: '' }, insertIndex, row.depth + 1));
          }}><AddRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        )}
      </Stack>
    ),
    positionCreatingRow: creatingRowIndex,
    onCreatingRowCancel: () => setCreatingRowIndex(undefined),
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" gap={1} alignItems="center"><WorkspacePremiumRoundedIcon color="primary" /><Typography variant="h5">Calificări & Linii manoperă</Typography></Stack>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

  {/* deletion handled by global ConfirmProvider */}
    </Box>
  );
}
