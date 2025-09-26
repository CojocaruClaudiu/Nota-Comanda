import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { Box, Paper, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, Alert } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';

import { tableLocalization } from '../../localization/tableLocalization';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import useNotistack from '../orders/hooks/useNotistack';
import { getQualifications, createQualification, updateQualification, deleteQualification, type Qualification } from '../../api/qualifications';

type UpsertState = { mode: 'add' } | { mode: 'edit'; row: Qualification } | null;

export default function QualificationsPage() {
  const { successNotistack, errorNotistack } = useNotistack();

  const [rows, setRows] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [upsert, setUpsert] = useState<UpsertState>(null);
  const [name, setName] = useState('');
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQualifications();
      setRows(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcarea calificărilor';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<MRT_ColumnDef<Qualification>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Denumire',
      size: 400,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      Cell: ({ renderedCellValue }) => renderedCellValue || '—',
    },
    {
      id: 'createdAt',
      header: 'Creat',
      size: 200,
      accessorFn: (r) => r.createdAt || '',
      Cell: ({ cell }) => (cell.getValue<string>() ? new Date(cell.getValue<string>()).toLocaleString('ro-RO') : '—'),
      enableGlobalFilter: false,
    },
  ], []);

  // CRUD
  const startAdd = () => { setName(''); setUpsert({ mode: 'add' }); };
  const startEdit = (row: Qualification) => { setName(row.name); setUpsert({ mode: 'edit', row }); };
  const doSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { errorNotistack('Denumirea este obligatorie'); return; }
    try {
      setSaving(true);
      if (upsert?.mode === 'add') {
        await createQualification({ name: trimmed });
        successNotistack('Calificare creată');
      } else if (upsert?.mode === 'edit') {
        await updateQualification(upsert.row.id, { name: trimmed });
        successNotistack('Calificare actualizată');
      }
      setUpsert(null);
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut salva');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (row: Qualification) => {
    try {
      setSaving(true);
      await deleteQualification(row.id);
      await load();
      successNotistack('Calificare ștearsă');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge');
    } finally {
      setSaving(false);
    }
  };

  const table = useMaterialReactTable<Qualification>({
    columns,
    data: rows,
    localization: tableLocalization,
    state: { isLoading: loading, showAlertBanner: !!error, showProgressBars: saving },
    initialState: { density: 'comfortable', showGlobalFilter: true, pagination: { pageIndex: 0, pageSize: 20 } },
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableSorting: true,
    enableRowSelection: false,
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" gap={1}>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={startAdd}>Adaugă</Button>
        <Button variant="outlined" onClick={() => load()} disabled={loading}>Reîncarcă</Button>
      </Stack>
    ),
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={1}>
        <Tooltip title="Editează"><span><IconButton size="small" onClick={() => startEdit(row.original)}><EditOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Șterge"><span><IconButton color="error" size="small" onClick={async () => {
          const ok = await confirm({
            title: 'Confirmare ștergere',
            bodyTitle: 'Ești sigur că vrei să ștergi?',
            description: <>Calificarea <strong>{row.original.name}</strong> va fi ștearsă permanent.</>,
            confirmText: 'Șterge',
            cancelText: 'Anulează',
            danger: true,
          });
          if (!ok) return;
          await doDelete(row.original);
        }}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
      </Stack>
    ),
    muiToolbarAlertBannerProps: error ? { color: 'error', children: error } : undefined,
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <WorkspacePremiumRoundedIcon color="primary" />
            <Typography variant="h5">Calificări</Typography>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Upsert Dialog */}
      <Dialog open={!!upsert} onClose={() => setUpsert(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{upsert?.mode === 'add' ? 'Adaugă calificare' : 'Editează calificare'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Denumire"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void doSave(); } }}
            placeholder="ex: Sudor, Electrician, Zidar"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpsert(null)}>Anulează</Button>
          <Button variant="contained" onClick={() => void doSave()} disabled={saving}>Salvează</Button>
        </DialogActions>
      </Dialog>

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
}
