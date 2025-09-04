// src/pages/clients/ClientsTable.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import {
  Box, Typography, Paper, Alert, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  fetchClients, createClient, deleteClient, updateClient,
  type Client, type ClientPayload
} from '../../api/clients';
import useNotistack from '../orders/hooks/useNotistack';

const columns: MRT_ColumnDef<Client>[] = [
  { accessorKey: 'name', header: 'Nume Client' },
  { accessorKey: 'location', header: 'Locație' },
  { accessorKey: 'contact', header: 'Contact' },
  {
    accessorKey: 'registrulComertului',
    header: 'Registrul Comerțului',
    Cell: ({ cell }) => (cell.getValue<string | null>()?.trim() || '—'),
  },
  {
    accessorKey: 'cif',
    header: 'CIF',
    Cell: ({ cell }) => (cell.getValue<string | null>()?.trim() || '—'),
  },
];

export const ClientsTable: React.FC = () => {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientPayload>({
    name: '', location: '', contact: '', registrulComertului: '', cif: '',
  });

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState<ClientPayload>({
    name: '', location: '', contact: '', registrulComertului: '', cif: '',
  });

  // Delete dialog
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { successNotistack, errorNotistack } = useNotistack();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchClients();
      setData(rows);
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcarea clienților';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  // ✅ only mandatory fields
  const canSave = useMemo(
    () => form.name.trim() && form.location.trim() && form.contact.trim(),
    [form]
  );
  const canUpdate = useMemo(
    () => editForm.name.trim() && editForm.location.trim() && editForm.contact.trim(),
    [editForm]
  );

  const onAddChange = (k: keyof ClientPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const onEditChange = (k: keyof ClientPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      setError(null);
      const created = await createClient(form);
      setData(prev => [created, ...prev]);
      setOpenAdd(false);
      setForm({ name: '', location: '', contact: '', registrulComertului: '', cif: '' });
      successNotistack('Clientul a fost adăugat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut crea clientul';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (row: Client) => {
    setEditTarget(row);
    setEditForm({
      name: row.name,
      location: row.location,
      contact: row.contact,
      registrulComertului: row.registrulComertului ?? '',
      cif: row.cif ?? '',
    });
  };

  const handleUpdate = async () => {
    if (!editTarget || !canUpdate) return;
    try {
      setUpdating(true);
      setError(null);
      const updated = await updateClient(editTarget.id, editForm);
      setData(prev => prev.map(c => (c.id === updated.id ? updated : c))); // optimistic replace
      setEditTarget(null);
      successNotistack('Clientul a fost actualizat cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut actualiza clientul';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setError(null);
      await deleteClient(toDelete.id);
      setData(prev => prev.filter(c => c.id !== toDelete.id));
      successNotistack('Clientul a fost șters cu succes!');
      setToDelete(null);
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut șterge clientul';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 1 }}>
          <Typography variant="h5">Lista Clienți</Typography>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => setOpenAdd(true)}>Adaugă client</Button>
            <Button onClick={load} disabled={loading} variant="contained">
              {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable
            columns={columns}
            data={data}
            state={{ isLoading: loading, showAlertBanner: !!error, density: 'comfortable' }}
            enableSorting
            enableColumnFilters
            enableRowActions
            positionActionsColumn="last"
            renderRowActions={({ row }) => (
              <Stack direction="row" gap={1}>
                <Tooltip title="Editează">
                  <span>
                    <IconButton size="small" onClick={() => openEditDialog(row.original)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Șterge">
                  <span>
                    <IconButton color="error" size="small" onClick={() => setToDelete(row.original)} disabled={deleting}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            )}
            initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
          />
        </Box>
      </Paper>

      {/* Dialog Adăugare */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adaugă client</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2}>
            <TextField label="Nume Client" value={form.name} onChange={onAddChange('name')} required />
            <TextField label="Locație" value={form.location} onChange={onAddChange('location')} required />
            <TextField label="Contact" value={form.contact} onChange={onAddChange('contact')} required />
            <TextField label="Registrul Comerțului (opțional)" value={form.registrulComertului ?? ''} onChange={onAddChange('registrulComertului')} />
            <TextField label="CIF (opțional)" value={form.cif ?? ''} onChange={onAddChange('cif')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Anulează</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} variant="contained">
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editare */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editează client</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2}>
            <TextField label="Nume Client" value={editForm.name} onChange={onEditChange('name')} required />
            <TextField label="Locație" value={editForm.location} onChange={onEditChange('location')} required />
            <TextField label="Contact" value={editForm.contact} onChange={onEditChange('contact')} required />
            <TextField label="Registrul Comerțului (opțional)" value={editForm.registrulComertului ?? ''} onChange={onEditChange('registrulComertului')} />
            <TextField label="CIF (opțional)" value={editForm.cif ?? ''} onChange={onEditChange('cif')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Anulează</Button>
          <Button onClick={handleUpdate} disabled={!canUpdate || updating} variant="contained">
            {updating ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmare Ștergere */}
      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          Ești sigur că vrei să ștergi <strong>{toDelete?.name}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Anulează</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'Șterge'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
