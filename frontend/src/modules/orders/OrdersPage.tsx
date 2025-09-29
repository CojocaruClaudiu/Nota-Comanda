import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Typography, Chip, Stack, Divider, IconButton, Tooltip, Autocomplete, CircularProgress
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef
} from 'material-react-table';
import {
  listOrders, createOrder, deleteOrder,
  type PurchaseOrderDTO, type CreateOrderPayload, type CreateOrderItemPayload
} from '../../api/orders';
import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from './hooks/useNotistack';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { getEmployees, type EmployeeWithStats } from '../../api/employees';
import { projectsApi } from '../../api/projects';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const emptyItem = (): CreateOrderItemPayload => ({
  name: '',
  qtyOrdered: 1,
  unitPrice: 0,
  category: '',
  sku: '',
  unit: '',
  vatPercent: 19,
  discountPercent: 0,
});

const INIT_FORM: CreateOrderPayload = {
  items: [emptyItem()],
  priority: 'MEDIUM',
  currency: 'RON',
  notes: '',
  deliveryAddress: '',
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('ro-RO') : '—';

const money = (v: number, currency = 'RON') =>
  `${(Number.isFinite(v) ? v : 0).toFixed(2)} ${currency}`;

const priorityColor = (p?: string): ChipColor =>
  p === 'URGENT' ? 'error' :
  p === 'HIGH'   ? 'warning' :
  p === 'MEDIUM' ? 'info' :
  'default';

const statusColor = (s?: string): ChipColor =>
  s === 'APPROVED'   ? 'success' :
  s === 'PENDING'    ? 'warning' :
  s === 'CANCELLED'  ? 'error'   :
  s === 'ORDERED'    ? 'info'    :
  s === 'RECEIVED'   ? 'success' :
  s === 'PARTIAL'    ? 'secondary' :
  'default';

const paymentColor = (p?: string): ChipColor =>
  p === 'PAID'    ? 'success' :
  p === 'PARTIAL' ? 'warning' :
  p === 'UNPAID'  ? 'error'   :
  'default';

export default function OrdersPage() {
  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();

  const [rows, setRows] = useState<PurchaseOrderDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateOrderPayload>(INIT_FORM);
  const [creating, setCreating] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]); // backend returns uuid string ids
  const [projLoading, setProjLoading] = useState(false);
  // track if user manually changed the delivery address so we don't override after project change
  const [addressManuallyEdited, setAddressManuallyEdited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrders();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      errorNotistack(e);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    // preload employees once for autocomplete
    (async () => {
      setEmpLoading(true);
      try {
        const emps = await getEmployees();
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch {
        // silent
      } finally {
        setEmpLoading(false);
      }
    })();
  }, []);

  // lazy load projects when modal opens first time
  useEffect(() => {
    if (open && projects.length === 0 && !projLoading) {
      (async () => {
        try {
          setProjLoading(true);
          const data = await projectsApi.getAll();
          setProjects(Array.isArray(data) ? data : []);
        } catch { /* silent */ } finally { setProjLoading(false); }
      })();
    }
  }, [open, projects.length, projLoading]);

  const addItem = useCallback(() =>
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] })), []);

  const updateItem = useCallback((idx: number, patch: Partial<CreateOrderItemPayload>) =>
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it),
    })), []);

  const removeItem = useCallback((idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })), []);

  const totalPreview = useMemo(() => {
    let net = 0; let vat = 0;
    for (const it of form.items) {
      const qty = Number(it.qtyOrdered) || 0;
      const price = Number(it.unitPrice) || 0;
      const discFactor = 1 - (Number(it.discountPercent) || 0) / 100;
      const lineNet = Math.max(0, qty) * Math.max(0, price) * Math.max(0, discFactor);
      net += lineNet;
      const lineVat = lineNet * ((Number(it.vatPercent) || 0) / 100);
      vat += lineVat;
    }
    const gross = net + vat;
    return { net, vat, gross };
  }, [form.items]);

  const formErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.requestedBy?.trim()) errs.push('Selectează "Solicitat de".');
    if (!form.items.length) errs.push('Adaugă cel puțin o linie.');
    form.items.forEach((it, i) => {
      if (!it.name?.trim()) errs.push(`Linia ${i + 1}: "Produs" este obligatoriu.`);
      if (!(Number(it.qtyOrdered) > 0)) errs.push(`Linia ${i + 1}: "Cantitate" trebuie > 0.`);
      if (Number(it.unitPrice) < 0) errs.push(`Linia ${i + 1}: "Preț" nu poate fi negativ.`);
      if (Number(it.vatPercent) < 0) errs.push(`Linia ${i + 1}: "TVA%" nu poate fi negativ.`);
      if (Number(it.discountPercent) < 0) errs.push(`Linia ${i + 1}: "Disc%" nu poate fi negativ.`);
    });
    return errs;
  }, [form]);

  const doCreate = useCallback(async () => {
    if (formErrors.length) {
      return errorNotistack(formErrors[0]);
    }
    setCreating(true);
    try {
      await createOrder(form);
      successNotistack('Comandă creată');
      setOpen(false);
      setForm(INIT_FORM);
      await load();
    } catch (e) {
      errorNotistack(e);
    } finally {
      setCreating(false);
    }
  }, [form, formErrors, errorNotistack, successNotistack, load]);

  // table columns
  const columns = useMemo<MRT_ColumnDef<PurchaseOrderDTO>[]>(() => [
    {
      accessorKey: 'poNumber',
      header: 'PO',
      size: 140,
      Cell: ({ cell }) => <Typography fontWeight={600}>{cell.getValue<string>()}</Typography>,
    },
    {
      accessorKey: 'orderDate',
      header: 'Data',
      size: 120,
      Cell: ({ cell }) => fmtDate(cell.getValue<string>()),
    },
    {
      accessorKey: 'requestedBy',
      header: 'Solicitat de',
      size: 160,
      Cell: ({ cell }) => cell.getValue<string>() || '—',
      enableGlobalFilter: true,
    },
    {
      accessorKey: 'orderedBy',
      header: 'Comandat de',
      size: 160,
      Cell: ({ cell }) => cell.getValue<string>() || '—',
      enableGlobalFilter: true,
    },
    {
      accessorKey: 'supplierId',
      header: 'Furnizor',
      size: 160,
      Cell: ({ cell }) => cell.getValue<string>() || '—',
    },
    {
      accessorFn: (row) => {
        const distinct = new Set<string>();
        row.items?.forEach(i => i.allocations?.forEach(a => distinct.add(a.projectId)));
        return { count: distinct.size, projectId: row.projectId };
      },
      id: 'projectsSummary',
      header: 'Proiect(e)',
      size: 180,
      Cell: ({ cell, row }) => {
        const v = cell.getValue<any>();
        if (!v) return '—';
        if (v.count === 0) return row.original.projectId ? row.original.projectId : '—';
        if (v.count === 1) return row.original.projectId || '1 proiect';
        return <Tooltip title={`${v.count} proiecte alocate`}><Chip size='small' label={`Mixed (${v.count})`} /></Tooltip>;
      }
    },
    {
      accessorKey: 'priority',
      header: 'Prioritate',
      size: 120,
      Cell: ({ cell }) => {
        const v = cell.getValue<string>();
        const color = priorityColor(v);
        return <Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={v || '—'} />;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 140,
      Cell: ({ cell }) => {
        const v = cell.getValue<string>();
        const color = statusColor(v);
        return <Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={v || '—'} />;
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Plăți',
      size: 120,
      Cell: ({ cell }) => {
        const v = cell.getValue<string>();
        const color = paymentColor(v);
        return <Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={v || '—'} />;
      },
    },
    {
      accessorKey: 'totalGross',
      header: 'Total',
      size: 140,
      Cell: ({ row }) => money(Number(row.original.totalGross || 0), row.original.currency),
    },
    {
      accessorKey: 'receivedPercent',
      header: 'Recepționat %',
      size: 140,
      Cell: ({ cell }) => `${Number(cell.getValue<number>() || 0).toFixed(1)}%`,
    },
    {
      accessorFn: r => r.items?.length ?? 0,
      id: 'itemsCount',
      header: 'Linii',
      size: 100,
    },
  ], []);

  const table = useMaterialReactTable<PurchaseOrderDTO>({
    columns,
    data: rows,
    localization: tableLocalization as any,
    state: { isLoading: loading },
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={0.5}>
        <Tooltip title="Șterge">
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Confirmare Ștergere',
                  bodyTitle: 'Ștergi comanda?',
                  description: <span>Comanda <strong>{row.original.poNumber}</strong> va fi ștearsă definitiv.</span>,
                  confirmText: 'Șterge',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteOrder(row.original.id);
                  successNotistack('Comandă ștearsă');
                  await load();
                } catch (e) { errorNotistack(e); }
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
    enableColumnFilters: true,
    enableGlobalFilter: true,
    initialState: { showGlobalFilter: true, density: 'compact' },
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    enableSorting: true,
    enableRowVirtualization: true,
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 220px)' } },
    muiToolbarAlertBannerProps: rows.length ? undefined : { color: 'info', children: 'Nu există comenzi.' },
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" gap={1} alignItems="center">
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
          Nouă comandă
        </Button>
        <Tooltip title="Reîncarcă">
          <span>
            <IconButton onClick={() => void load()} disabled={loading}>
              <RefreshRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Chip label={`${rows.length} înregistrări`} size="small" />
      </Stack>
    ),
  });

  const requestedByValue = employees.find(e => e.name === form.requestedBy) || null;
  const orderedByValue = employees.find(e => e.name === form.orderedBy) || null;
  const selectedProject = projects.find(p => p.id === form.projectId) || null;

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2} height="100%" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="h5" fontWeight={600}>Comenzi</Typography>
      </Stack>

      <Divider />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MaterialReactTable table={table} />
      </Box>

      <Dialog open={open} fullWidth maxWidth="lg" onClose={() => !creating && setOpen(false)}>
        <DialogTitle>Nouă Comandă</DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Autocomplete<EmployeeWithStats>
              sx={{ flex: '1 1 220px', minWidth: 200 }}
              options={employees}
              loading={empLoading}
              getOptionLabel={(o) => o?.name ?? ''}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              value={requestedByValue}
              onChange={(_, val) => setForm(f => ({ ...f, requestedBy: val?.name || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Solicitat de"
                  placeholder="Selectează"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {empLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* Cost Center field removed as per request */}

            <Autocomplete<EmployeeWithStats>
              sx={{ flex: '1 1 220px', minWidth: 200 }}
              options={employees}
              loading={empLoading}
              getOptionLabel={(o) => o?.name ?? ''}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              value={orderedByValue}
              onChange={(_, val) => setForm(f => ({ ...f, orderedBy: val?.name || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Ordered By"
                  placeholder="Selectează"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {empLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              sx={{ flex: '1 1 140px', minWidth: 130 }}
              select
              label="Prioritate"
              value={form.priority || 'MEDIUM'}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof priorities[number] }))}
            >
              {priorities.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>

            <Autocomplete
              sx={{ flex: '1 1 220px', minWidth: 200 }}
              options={projects}
              loading={projLoading}
              getOptionLabel={(o: any) => o?.name ?? ''}
              isOptionEqualToValue={(a: any, b: any) => a.id === b.id}
              value={selectedProject}
              onChange={(_, val: any) => {
                setForm(f => {
                  const next: any = { ...f, projectId: val?.id };
                  // prefer project.location, fallback to project.address
                  const projAddress = val?.location || val?.address;
                  if (projAddress && (!addressManuallyEdited || !f.deliveryAddress)) {
                    next.deliveryAddress = projAddress;
                  }
                  return next;
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proiect (principal)"
                  placeholder="Selectează"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {projLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              sx={{ flex: '1 1 140px', minWidth: 130 }}
              select
              label="Monedă"
              value={form.currency || 'RON'}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            >
              {['RON', 'EUR', 'USD'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            <TextField
              sx={{ flex: '2 1 240px', minWidth: 220 }}
              label="Adresă livrare"
              value={form.deliveryAddress || ''}
              onChange={e => {
                const v = e.target.value;
                setAddressManuallyEdited(true);
                setForm(f => ({ ...f, deliveryAddress: v }));
              }}
            />

            <TextField
              sx={{ flex: '1 1 100%', minWidth: 300 }}
              label="Observații"
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              multiline
              minRows={2}
            />
          </Box>

          {!!formErrors.length && (
            <Typography variant="body2" color="error">
              {formErrors[0]}
            </Typography>
          )}

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={600}>Linii comandă</Typography>
            <Button onClick={addItem} size="small" startIcon={<AddRoundedIcon />}>Adaugă linie</Button>
          </Stack>

          <Box display="flex" flexDirection="column" gap={1}>
            {form.items.map((it, idx) => {
              const qty = Number(it.qtyOrdered) || 0;
              const price = Number(it.unitPrice) || 0;
              const disc = Math.max(0, 1 - (Number(it.discountPercent) || 0) / 100);
              const lineNet = Math.max(0, qty * price * disc);
              const lineVat = lineNet * ((Number(it.vatPercent) || 0) / 100);
              const lineGross = lineNet + lineVat;

              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: 'minmax(200px,2fr) repeat(7, 1fr) 140px 60px',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    label="Produs"
                    value={it.name}
                    onChange={e => updateItem(idx, { name: e.target.value })}
                    required
                  />
                  <TextField
                    label="Categorie"
                    value={it.category || ''}
                    onChange={e => updateItem(idx, { category: e.target.value })}
                  />
                  <TextField
                    label="SKU"
                    value={it.sku || ''}
                    onChange={e => updateItem(idx, { sku: e.target.value })}
                  />
                  <TextField
                    label="U.M."
                    value={it.unit || ''}
                    onChange={e => updateItem(idx, { unit: e.target.value })}
                  />
                  <TextField
                    type="number"
                    label="Cant."
                    inputProps={{ min: 0, step: 1 }}
                    value={it.qtyOrdered}
                    onChange={e => updateItem(idx, { qtyOrdered: Number(e.target.value || 0) })}
                  />
                  <TextField
                    type="number"
                    label="Preț"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={it.unitPrice ?? 0}
                    onChange={e => updateItem(idx, { unitPrice: Number(e.target.value || 0) })}
                  />
                  <TextField
                    type="number"
                    label="TVA %"
                    inputProps={{ min: 0, step: 1 }}
                    value={it.vatPercent ?? ''}
                    onChange={e => updateItem(idx, { vatPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                  <TextField
                    type="number"
                    label="Disc %"
                    inputProps={{ min: 0, step: 1 }}
                    value={it.discountPercent ?? ''}
                    onChange={e => updateItem(idx, { discountPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                  <Chip size="small" variant="outlined" label={`Linie: ${money(lineGross, form.currency)}`} />
                  <IconButton
                    color="error"
                    onClick={() => removeItem(idx)}
                    disabled={form.items.length === 1 && idx === 0}
                    aria-label="Șterge linia"
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              );
            })}
          </Box>

          <Divider />

          <Stack direction="row" gap={3} flexWrap="wrap">
            <Typography variant="body2">Subtotal: <b>{money(totalPreview.net, form.currency)}</b></Typography>
            <Typography variant="body2">TVA: <b>{money(totalPreview.vat, form.currency)}</b></Typography>
            <Typography variant="body2">Total: <b>{money(totalPreview.gross, form.currency)}</b></Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={creating}>Anulează</Button>
          <Button variant="contained" onClick={doCreate} disabled={creating || !!formErrors.length}>
            {creating ? 'Se salvează…' : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
