// src/pages/team/EchipaPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import {
  Box, Paper, Stack, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Tooltip,
  CircularProgress, Chip, Divider, List, ListItem, ListItemText, Alert
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';

import useNotistack from '../orders/hooks/useNotistack';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  addLeave, getLeaves, deleteLeave,
  type EmployeeWithStats, type EmployeePayload, type Leave, type LeavePayload
} from '../../api/employees';

// display dd/MM/yyyy
const dmy = (v?: string | Date | null) => {
  if (!v) return '—';
  const d = typeof v === 'string' ? dayjs(v) : dayjs(v);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
};
// store ISO for API
const toIsoDate = (d: Dayjs | null) => (d && d.isValid() ? d.format('YYYY-MM-DD') : '');

const columns: MRT_ColumnDef<EmployeeWithStats>[] = [
  { accessorKey: 'name', header: 'Nume' },
  {
    accessorKey: 'qualifications',
    header: 'Calificări',
    Cell: ({ cell }) => {
      const arr = (cell.getValue<string[]>() || []).filter(Boolean);
      return arr.length ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {arr.map((q, i) => <Chip key={i} label={q} size="small" />)}
        </Stack>
      ) : '—';
    },
  },
  {
    accessorKey: 'hiredAt',
    header: 'Angajat din',
    Cell: ({ cell }) => dmy(cell.getValue<string>()),
  },
  {
    accessorKey: 'birthDate',
    header: 'Data nașterii',
    Cell: ({ cell }) => dmy(cell.getValue<string | null>()),
  },
  { accessorKey: 'age', header: 'Vârstă', Cell: ({ cell }) => cell.getValue<number | null>() ?? '—' },
  { accessorKey: 'entitledDays', header: 'Zile alocate (an)' },
  { accessorKey: 'takenDays', header: 'Zile folosite (an)' },
  { accessorKey: 'remainingDays', header: 'Zile rămase (an)' },
];

export default function EchipaPage() {
  const [rows, setRows] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<EmployeeWithStats | null>(null);
  const [openLeave, setOpenLeave] = useState<EmployeeWithStats | null>(null);
  const [openHistory, setOpenHistory] = useState<EmployeeWithStats | null>(null);
  // Confirmation dialog for employee delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // forms (ISO in state; DD/MM/YYYY shown via DatePicker)
  const [form, setForm] = useState<EmployeePayload>({
    name: '', qualifications: [], hiredAt: '', birthDate: null,
  });
  const [leaveForm, setLeaveForm] = useState<LeavePayload>({ startDate: '', days: 1, note: '' });
  const [history, setHistory] = useState<Leave[]>([]);
  const [saving, setSaving] = useState(false);

  const { successNotistack, errorNotistack } = useNotistack();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees();
      setRows(data);
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcarea echipei';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  const cols = useMemo(() => columns, []);
  const parseQuals = (text: string): string[] =>
    text.split(',').map(s => s.trim()).filter(Boolean);

  // Create
  const doCreate = async () => {
    try {
      setSaving(true);
      await createEmployee(form);
      setOpenAdd(false);
      setForm({ name: '', qualifications: [], hiredAt: '', birthDate: null });
      await load();
      successNotistack('Angajat adăugat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut adăuga angajatul');
    } finally {
      setSaving(false);
    }
  };

  // Update
  const doUpdate = async () => {
    if (!openEdit) return;
    try {
      setSaving(true);
      await updateEmployee(openEdit.id, form);
      setOpenEdit(null);
      await load();
      successNotistack('Angajat actualizat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut actualiza angajatul');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const doDelete = async (id: string) => {
    try {
      setSaving(true);
      await deleteEmployee(id);
      await load();
      successNotistack('Angajat șters');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge angajatul');
    } finally {
      setSaving(false);
    }
  };

  // Add Leave
  const doAddLeave = async () => {
    if (!openLeave) return;
    try {
      setSaving(true);
      await addLeave(openLeave.id, leaveForm);
      setOpenLeave(null);
      setLeaveForm({ startDate: '', days: 1, note: '' });
      await load();
      successNotistack('Concediu înregistrat');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut înregistra concediul');
    } finally {
      setSaving(false);
    }
  };

  // History
  const openHistoryDialog = async (row: EmployeeWithStats) => {
    try {
      setOpenHistory(row);
      const h = await getLeaves(row.id);
      setHistory(h);
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut încărca istoricul concediilor');
    }
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Echipă</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setOpenAdd(true)}>Adaugă angajat</Button>
            <Button variant="contained" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <MaterialReactTable
          columns={cols}
          data={rows}
          state={{ isLoading: loading }}
          enableRowActions
          positionActionsColumn="last"
          renderRowActions={({ row }) => (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Istoric concedii">
                <span>
                  <IconButton size="small" onClick={() => openHistoryDialog(row.original)}>
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Adaugă concediu">
                <span>
                  <IconButton size="small" onClick={() => {
                    setOpenLeave(row.original);
                    setLeaveForm({ startDate: '', days: 1, note: '' });
                  }}>
                    <EventAvailableIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Editează">
                <span>
                  <IconButton size="small" onClick={() => {
                    setOpenEdit(row.original);
                    setForm({
                      name: row.original.name,
                      qualifications: row.original.qualifications,
                      hiredAt: dayjs(row.original.hiredAt).isValid()
                        ? dayjs(row.original.hiredAt).format('YYYY-MM-DD')
                        : '',
                      birthDate: row.original.birthDate
                        ? dayjs(row.original.birthDate).format('YYYY-MM-DD')
                        : null,
                    });
                  }}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Șterge">
                <span>
                  <IconButton color="error" size="small" onClick={() => setConfirmDelete(row.original.id)} disabled={saving}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
          initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
        />
      </Paper>

      {/* Add Employee */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adaugă angajat</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nume" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <TextField
              label="Calificări (separate prin virgulă)"
              value={(form.qualifications || []).join(', ')}
              onChange={e => setForm(f => ({ ...f, qualifications: parseQuals(e.target.value) }))}
            />
            <DatePicker
              label="Data angajării"
              format="DD/MM/YYYY"
              value={form.hiredAt ? dayjs(form.hiredAt) : null}
              onChange={(d) => setForm(f => ({ ...f, hiredAt: toIsoDate(d) }))}
              slotProps={{ textField: { required: true, fullWidth: true } }}
            />
            <DatePicker
              label="Data nașterii (opțional)"
              format="DD/MM/YYYY"
              value={form.birthDate ? dayjs(form.birthDate) : null}
              onChange={(d) => setForm(f => ({ ...f, birthDate: toIsoDate(d) || null }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Anulează</Button>
          <Button variant="contained" onClick={doCreate} disabled={saving || !form.name || !form.hiredAt}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee */}
      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editează angajat</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Nume" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <TextField
              label="Calificări (separate prin virgulă)"
              value={(form.qualifications || []).join(', ')}
              onChange={e => setForm(f => ({ ...f, qualifications: parseQuals(e.target.value) }))}
            />
            <DatePicker
              label="Data angajării"
              format="DD/MM/YYYY"
              value={form.hiredAt ? dayjs(form.hiredAt) : null}
              onChange={(d) => setForm(f => ({ ...f, hiredAt: toIsoDate(d) }))}
              slotProps={{ textField: { required: true, fullWidth: true } }}
            />
            <DatePicker
              label="Data nașterii (opțional)"
              format="DD/MM/YYYY"
              value={form.birthDate ? dayjs(form.birthDate) : null}
              onChange={(d) => setForm(f => ({ ...f, birthDate: toIsoDate(d) || null }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(null)}>Anulează</Button>
          <Button variant="contained" onClick={doUpdate} disabled={saving || !form.name || !form.hiredAt}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Leave */}
      <Dialog open={!!openLeave} onClose={() => setOpenLeave(null)} fullWidth maxWidth="sm">
        <DialogTitle>Concediu plătit</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <DatePicker
              label="Data început"
              format="DD/MM/YYYY"
              value={leaveForm.startDate ? dayjs(leaveForm.startDate) : null}
              onChange={(d) => setLeaveForm(f => ({ ...f, startDate: toIsoDate(d) }))}
              slotProps={{ textField: { required: true, fullWidth: true } }}
            />
            <TextField
              label="Număr zile"
              type="number"
              inputProps={{ min: 1 }}
              value={leaveForm.days}
              onChange={e => setLeaveForm(f => ({ ...f, days: Number(e.target.value) }))}
              required
              fullWidth
            />
            <TextField
              label="Notă (opțional)"
              value={leaveForm.note || ''}
              onChange={e => setLeaveForm(f => ({ ...f, note: e.target.value }))}
              fullWidth
            />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            * Zilele de concediu sunt calculate pe anul curent. Fiecare 5 ani întregi în firmă adaugă +1 zi la cele 21 de bază.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeave(null)}>Anulează</Button>
          <Button variant="contained" onClick={doAddLeave} disabled={saving || !leaveForm.startDate || !leaveForm.days}>
            {saving ? <CircularProgress size={18} /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History */}
      <Dialog open={!!openHistory} onClose={() => setOpenHistory(null)} fullWidth maxWidth="sm">
        <DialogTitle>Istoric concedii — {openHistory?.name}</DialogTitle>
        <DialogContent>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nu există înregistrări.</Typography>
          ) : (
            <List dense>
              {history.map(h => (
                <ListItem
                  key={h.id}
                  secondaryAction={
                    <IconButton edge="end" color="error" onClick={async () => {
                      try {
                        await deleteLeave(h.id);
                        setHistory(prev => prev.filter(x => x.id !== h.id));
                        successNotistack('Înregistrare ștearsă');
                        await load();
                      } catch (e: any) {
                        errorNotistack(e?.message || 'Nu am putut șterge înregistrarea');
                      }
                    }}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${dmy(h.startDate)} — ${h.days} zile`}
                    secondary={h.note || undefined}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(null)}>Închide</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Employee */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirmare ștergere</DialogTitle>
        <DialogContent>
          <Typography>Sunteți sigur că doriți să ștergeți acest angajat?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Anulează</Button>
          <Button color="error" variant="contained" onClick={() => { if (confirmDelete) { doDelete(confirmDelete); setConfirmDelete(null); } }} disabled={saving}>
            Șterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
