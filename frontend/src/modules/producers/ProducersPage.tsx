import { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Paper, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, CircularProgress, Alert } from '@mui/material';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { getProducers, createProducer, updateProducer, deleteProducer, type Producer, type ProducerPayload } from '../../api/producers';
import useNotistack from '../orders/hooks/useNotistack';
import { useConfirm } from '../common/confirm/ConfirmProvider';

const STATUS_OPTIONS = ['activ', 'inactiv'] as const;

const mkCols = (): MRT_ColumnDef<Producer>[] => [
  { accessorKey: 'name', header: 'Nume', size: 260, enableGlobalFilter: true, Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'status', header: 'Status', size: 110, enableGlobalFilter: true, Cell: ({ cell }) => cell.getValue<string>() || '—' },
  { accessorKey: 'adresa', header: 'Adresă', size: 260, enableGlobalFilter: true, accessorFn: (r) => r.adresa || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'telefon', header: 'Telefon', size: 140, enableGlobalFilter: true, accessorFn: (r) => r.telefon || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'email', header: 'Email', size: 220, enableGlobalFilter: true, accessorFn: (r) => r.email || '', Cell: ({ cell }) => { const v = cell.getValue<string>(); return v ? <a href={`mailto:${v}`}>{v}</a> : '—'; } },
  { accessorKey: 'site', header: 'Site', size: 220, enableGlobalFilter: true, accessorFn: (r) => r.site || '', Cell: ({ cell }) => { const v = (cell.getValue<string>() || '').trim(); if (!v) return '—'; const href = v.startsWith('http') ? v : `https://${v}`; return <a href={href} target='_blank' rel='noopener noreferrer'>{v}</a>; } },
  { accessorKey: 'contBancar', header: 'Cont bancar', size: 220, enableGlobalFilter: true, accessorFn: (r) => r.contBancar || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'banca', header: 'Banca', size: 160, enableGlobalFilter: true, accessorFn: (r) => r.banca || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'observatii', header: 'Observații', size: 280, enableGlobalFilter: true, accessorFn: (r) => r.observatii || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
];

export default function ProducersPage() {
  const { successNotistack, errorNotistack } = useNotistack();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openUpsert, setOpenUpsert] = useState<null | { mode: 'add' | 'edit'; row?: Producer }>(null);

  const empty: ProducerPayload = { name: '', status: 'activ', adresa: '', contBancar: '', banca: '', email: '', telefon: '', site: '', observatii: '' };
  const [form, setForm] = useState<ProducerPayload>(empty);

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); const data = await getProducers(); setRows(data); }
    catch (e: any) { const msg = e?.message || 'Eroare la încărcare producători'; setError(msg); errorNotistack(msg); }
    finally { setLoading(false); }
  }, [errorNotistack]);
  useEffect(() => { void load(); }, [load]);

  const cols = useMemo(() => mkCols(), []);

  const validate = (f: ProducerPayload) => { const errs: Record<string,string|undefined> = {}; if (!f.name?.trim()) errs.name = 'Numele este obligatoriu'; return { errs, valid: Object.values(errs).every(v => !v) }; };
  const { errs, valid } = useMemo(() => validate(form), [form]);

  const startAdd = () => { setForm(empty); setOpenUpsert({ mode: 'add' }); };
  const startEdit = (row: Producer) => { setForm({ name: row.name, status: row.status as any, adresa: row.adresa || '', contBancar: row.contBancar || '', banca: row.banca || '', email: row.email || '', telefon: row.telefon || '', site: row.site || '', observatii: row.observatii || '' }); setOpenUpsert({ mode: 'edit', row }); };

  const doSave = async () => {
    try { setSaving(true); if (openUpsert?.mode === 'add') { await createProducer(form); successNotistack('Producător creat'); } else if (openUpsert?.mode === 'edit' && openUpsert.row) { await updateProducer(openUpsert.row.id, form); successNotistack('Producător actualizat'); } setOpenUpsert(null); await load(); }
    catch (e: any) { errorNotistack(e?.message || 'Nu am putut salva'); }
    finally { setSaving(false); }
  };

  const doDelete = async (row: Producer) => {
    try { setSaving(true); await deleteProducer(row.id); await load(); successNotistack('Producător șters'); }
    catch (e: any) { errorNotistack(e?.message || 'Nu am putut șterge'); }
    finally { setSaving(false); }
  };

  const table = useMaterialReactTable({
    columns: cols,
    data: rows,
    state: { isLoading: loading, showAlertBanner: !!error },
    initialState: { pagination: { pageIndex: 0, pageSize: 10 }, density: 'comfortable', showGlobalFilter: true },
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableSorting: true,
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row }) => (
      <Stack direction='row' gap={1}>
        {row.original.site ? (
          <Tooltip title='Deschide site'>
            <span>
              <IconButton size='small' component='a' href={row.original.site.startsWith('http') ? row.original.site : `https://${row.original.site}`} target='_blank' rel='noopener noreferrer'>
                <OpenInNewRoundedIcon fontSize='small' />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip title='Editează'>
          <span>
            <IconButton size='small' onClick={() => startEdit(row.original)}><EditOutlinedIcon fontSize='small' /></IconButton>
          </span>
        </Tooltip>
        <Tooltip title='Șterge'>
          <span>
            <IconButton color='error' size='small' onClick={async () => { const ok = await confirm({ title: 'Ștergere producător', bodyTitle: 'Ești sigur?', description: <>Producătorul <strong>{row.original.name}</strong> va fi șters.</>, confirmText: 'Șterge', cancelText: 'Anulează', danger: true }); if (!ok) return; await doDelete(row.original); }} disabled={saving}>
              <DeleteOutlineIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0 }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
          <Typography variant='h5'>Producători</Typography>
          <Stack direction='row' spacing={1}>
            <Button startIcon={<AddRoundedIcon />} variant='contained' onClick={startAdd}>Adaugă</Button>
            <Button variant='outlined' onClick={load} disabled={loading}>{loading ? <CircularProgress size={18} /> : 'Reîncarcă'}</Button>
          </Stack>
        </Stack>
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 150px)', overflow: 'auto' }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      <Dialog open={!!openUpsert} onClose={() => setOpenUpsert(null)} fullWidth maxWidth='sm'>
        <DialogTitle>{openUpsert?.mode === 'add' ? 'Adaugă producător' : `Editează — ${openUpsert?.row?.name}`}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label='Nume' value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required error={!!errs.name} helperText={errs.name} />
            <TextField select label='Status' value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))} fullWidth>
              {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label='Adresă' value={form.adresa || ''} onChange={(e) => setForm(f => ({ ...f, adresa: e.target.value }))} fullWidth />
            <TextField label='Cont bancar' value={form.contBancar || ''} onChange={(e) => setForm(f => ({ ...f, contBancar: e.target.value }))} fullWidth />
            <TextField label='Banca' value={form.banca || ''} onChange={(e) => setForm(f => ({ ...f, banca: e.target.value }))} fullWidth />
            <TextField label='Email' value={form.email || ''} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} fullWidth />
            <TextField label='Telefon' value={form.telefon || ''} onChange={(e) => setForm(f => ({ ...f, telefon: e.target.value }))} fullWidth />
            <TextField label='Site' value={form.site || ''} onChange={(e) => setForm(f => ({ ...f, site: e.target.value }))} fullWidth placeholder='https://exemplu.ro' />
            <TextField label='Observații' value={form.observatii || ''} onChange={(e) => setForm(f => ({ ...f, observatii: e.target.value }))} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpsert(null)}>Anulează</Button>
          <Button variant='contained' onClick={doSave} disabled={saving || !valid}>{saving ? <CircularProgress size={18} /> : 'Salvează'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
