import { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Paper, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, CircularProgress, Alert } from '@mui/material';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import FactoryRoundedIcon from '@mui/icons-material/FactoryRounded';
import EmailIcon from '@mui/icons-material/Email';
import { getProducers, createProducer, updateProducer, deleteProducer, type Producer, type ProducerPayload } from '../../api/producers';
import useNotistack from '../orders/hooks/useNotistack';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { tableLocalization } from '../../localization/tableLocalization';

const STATUS_OPTIONS = ['activ', 'inactiv'] as const;
const DEFAULT_PAGE_SIZE = 10;
const normalizeUrl = (value: string) => {
  let url = value.trim();
  if (url.startsWith('http//')) url = url.replace(/^http\/\//, 'http://');
  if (url.startsWith('https//')) url = url.replace(/^https\/\//, 'https://');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
};
const normalizePhoneForTel = (value: string) => {
  const cleaned = value.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return value.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return `+${cleaned.slice(1).replace(/\+/g, '')}`;
  return cleaned.replace(/\+/g, '');
};

const linkPillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.4,
  borderRadius: 999,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  textDecoration: 'none',
  fontSize: '0.8rem',
  lineHeight: 1.2,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'action.hover',
    color: 'primary.main',
    transform: 'translateY(-1px)',
  },
} as const;

const mkCols = (): MRT_ColumnDef<Producer>[] => [
  { accessorKey: 'name', header: 'Nume', size: 260, enableGlobalFilter: true, Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'status', header: 'Status', size: 110, enableGlobalFilter: true, Cell: ({ cell }) => cell.getValue<string>() || '—' },
  { accessorKey: 'adresa', header: 'Adresă', size: 260, enableGlobalFilter: true, accessorFn: (r) => r.adresa || '', Cell: ({ renderedCellValue }) => renderedCellValue || '—' },
  { accessorKey: 'telefon', header: 'Telefon', size: 220, enableGlobalFilter: true, accessorFn: (r) => r.telefon || '', Cell: ({ cell }) => { const v = cell.getValue<string>(); if (!v) return '—'; const phones = v.split(/[;,]/).map((item) => item.trim()).filter(Boolean); return (
    <Stack direction='row' gap={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
      {phones.map((phone) => (
        <Tooltip key={phone} title={`Apelează ${phone}`} arrow>
          <Box
            component='a'
            href={`tel:${normalizePhoneForTel(phone)}`}
            sx={linkPillSx}
          >
            <CallRoundedIcon fontSize='small' sx={{ color: 'action.active' }} />
            <span>{phone}</span>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  ); } },
  { accessorKey: 'email', header: 'Email', size: 260, enableGlobalFilter: true, accessorFn: (r) => r.email || '', Cell: ({ cell }) => { const v = cell.getValue<string>(); if (!v) return '—'; const emails = v.split(/[;,]/).map((item) => item.trim()).filter(Boolean); return (
    <Stack direction='row' gap={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
      {emails.map((email) => (
        <Tooltip key={email} title={`Trimite email către ${email}`} arrow>
          <Box
            component='a'
            href={`mailto:${email}`}
            sx={linkPillSx}
          >
            <EmailIcon fontSize='small' sx={{ color: 'action.active' }} />
            <span>{email}</span>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  ); } },
  { accessorKey: 'site', header: 'Site', size: 260, enableGlobalFilter: true, accessorFn: (r) => r.site || '', Cell: ({ cell }) => { const v = (cell.getValue<string>() || '').trim(); if (!v) return '—'; const sites = v.split(/[;,]/).map((item) => item.trim()).filter(Boolean); return (
    <Stack direction='row' gap={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
      {sites.map((site) => {
        const href = normalizeUrl(site);
        return (
          <Tooltip key={`${site}-${href}`} title='Deschide site' arrow>
            <Box component='a' href={href} target='_blank' rel='noopener noreferrer' sx={linkPillSx}>
              <span>{site}</span>
              <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  ); } },
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
  const shouldCompactTable = rows.length <= DEFAULT_PAGE_SIZE;

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
    localization: tableLocalization,
    state: { isLoading: loading, showAlertBanner: !!error },
    initialState: { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }, density: 'comfortable', showGlobalFilter: true },
    enableGlobalFilter: true,
    enableFacetedValues: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    enableSorting: true,
    enableMultiSort: true,
    enableRowSelection: false,
    enableRowActions: true,
    enableDensityToggle: true,
    enableFullScreenToggle: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableHiding: true,
    enableStickyHeader: true,
    globalFilterFn: 'includesString',
    paginationDisplayMode: 'pages',
    positionActionsColumn: 'last',
    positionGlobalFilter: 'right',
    positionToolbarAlertBanner: 'bottom',
    muiTablePaperProps: {
      sx: {
        height: shouldCompactTable ? 'auto' : '100%',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
    },
    muiTableContainerProps: {
      sx: {
        flex: shouldCompactTable ? '0 0 auto' : 1,
        minHeight: 0,
        width: '100%',
        maxHeight: shouldCompactTable ? 'none' : '100%',
      },
    },
    muiTableProps: { sx: { width: '100%', minWidth: '100%' } },
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex(r => r.id === row.id);
      return {
        sx: {
          backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit',
        },
      };
    },
    muiSearchTextFieldProps: {
      placeholder: 'Căutare în toate coloanele...',
      sx: { minWidth: '300px' },
      variant: 'outlined',
    },
    renderRowActions: ({ row }) => (
      <Stack direction='row' gap={1}>
        {row.original.telefon ? (
          <Tooltip title='Apelează'>
            <span>
              <IconButton size='small' component='a' href={`tel:${normalizePhoneForTel(row.original.telefon.split(/[;,]/)[0] || row.original.telefon)}`}>
                <CallRoundedIcon fontSize='small' />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        {row.original.site ? (
          <Tooltip title='Deschide site'>
            <span>
              <IconButton size='small' component='a' href={normalizeUrl(row.original.site)} target='_blank' rel='noopener noreferrer'>
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
    <Box sx={{ width: '100%', height: '100%', p: 0, m: 0, bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={2} sx={{ p: 2, flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1, gap: 1 }}>
          <Stack direction='row' gap={1} alignItems='center'>
            <FactoryRoundedIcon color='primary' />
            <Typography variant='h5'>Producători</Typography>
          </Stack>
          <Stack direction='row' gap={1}>
            <Button variant='outlined' startIcon={<AddRoundedIcon />} onClick={startAdd}>Adaugă</Button>
            <Button onClick={load} disabled={loading} variant='contained'>{loading ? <CircularProgress size={18} /> : 'Reîncarcă'}</Button>
          </Stack>
        </Stack>
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
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
