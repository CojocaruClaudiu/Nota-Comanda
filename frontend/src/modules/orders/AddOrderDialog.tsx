import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  MenuItem,
  Typography,
  Chip,
  Stack,
  Divider,
  IconButton,
  Button,
  Autocomplete,
  CircularProgress,
  Box,
  Fade,
  type ChipProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  createOrder,
  type CreateOrderPayload,
  type CreateOrderItemPayload,
} from '../../api/orders';
import { getEmployees, type EmployeeWithStats } from '../../api/employees';
import useNotistack from './hooks/useNotistack';
import { ORDER_STATUSES, UI_TO_BACKEND_STATUS, STATUS_COLOR_BY_LABEL } from './orderStatus';

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

const DEFAULT_STATUS_LABEL: (typeof ORDER_STATUSES)[number] = 'Neachitată';

const money = (v: number, currency = 'RON') =>
  `${(Number.isFinite(v) ? v : 0).toFixed(2)} ${currency}`;

type ProjectOption = {
  id: string;
  name: string;
  status?: string;
  location?: string;
  address?: string;
  [key: string]: any;
};

interface AddOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  projects: ProjectOption[];
  projLoading: boolean;
  ensureProjects: () => void | Promise<void>;
}

export default function AddOrderDialog({
  open,
  onClose,
  onCreated,
  projects,
  projLoading,
  ensureProjects,
}: AddOrderDialogProps) {
  const { errorNotistack, successNotistack } = useNotistack();
  const [form, setForm] = useState<CreateOrderPayload>(INIT_FORM);
  const [statusLabel, setStatusLabel] = useState<(typeof ORDER_STATUSES)[number]>(
    DEFAULT_STATUS_LABEL,
  );
  const [creating, setCreating] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [addressManuallyEdited, setAddressManuallyEdited] = useState(false);
  const employeesLoaded = useRef(false);

  // Load employees once when dialog first opens
  useEffect(() => {
    if (open && !employeesLoaded.current) {
      employeesLoaded.current = true;
      setEmpLoading(true);
      void getEmployees()
        .then((data) => setEmployees(Array.isArray(data) ? data : []))
        .catch(() => undefined)
        .finally(() => setEmpLoading(false));
    }
  }, [open]);

  // Ensure projects are fetched when dialog opens first time
  useEffect(() => {
    if (open) {
      ensureProjects();
    }
  }, [open, ensureProjects]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setForm(INIT_FORM);
      setStatusLabel(DEFAULT_STATUS_LABEL);
      setAddressManuallyEdited(false);
    }
  }, [open]);

  const addItem = useCallback(
    () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] })),
    [],
  );

  const updateItem = useCallback(
    (idx: number, patch: Partial<CreateOrderItemPayload>) =>
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
      })),
    [],
  );

  const removeItem = useCallback(
    (idx: number) =>
      setForm((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      })),
    [],
  );

  const availableProjects = useMemo(() => {
    const list = projects.filter((p) => p?.status !== 'COMPLETED');
    const current = projects.find((p) => p?.id === form.projectId);
    if (current && !list.some((p) => p?.id === current.id)) {
      list.push(current);
    }
    return list;
  }, [projects, form.projectId]);

  const requestedByValue = employees.find((e) => e.name === form.requestedBy) || null;
  const orderedByValue = employees.find((e) => e.name === form.orderedBy) || null;
  const selectedProject =
    availableProjects.find((project) => project?.id === form.projectId) || null;

  const totalPreview = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const it of form.items) {
      const qty = Number(it.qtyOrdered) || 0;
      const price = Number(it.unitPrice) || 0;
      const discFactor = 1 - (Number(it.discountPercent) || 0) / 100;
      const lineNet = Math.max(0, qty) * Math.max(0, price) * Math.max(0, discFactor);
      net += lineNet;
      vat += lineNet * ((Number(it.vatPercent) || 0) / 100);
    }
    return { net, vat, gross: net + vat };
  }, [form.items]);

  const formErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.requestedBy?.trim()) errs.push('Selectează "Solicitat de".');
    if (!form.items.length) errs.push('Adaugă cel puțin o linie.');
    form.items.forEach((it, i) => {
      if (!it.name?.trim()) errs.push(`Linia ${i + 1}: "Produs" este obligatoriu.`);
      if (!(Number(it.qtyOrdered) > 0))
        errs.push(`Linia ${i + 1}: "Cantitate" trebuie > 0.`);
      if (Number(it.unitPrice) < 0)
        errs.push(`Linia ${i + 1}: "Preț" nu poate fi negativ.`);
      if (Number(it.vatPercent) < 0)
        errs.push(`Linia ${i + 1}: "TVA%" nu poate fi negativ.`);
      if (Number(it.discountPercent) < 0)
        errs.push(`Linia ${i + 1}: "Disc%" nu poate fi negativ.`);
    });
    return errs;
  }, [form]);

  const handleCreate = useCallback(async () => {
    if (formErrors.length) {
      errorNotistack(formErrors[0]);
      return;
    }
    setCreating(true);
    try {
      const status = UI_TO_BACKEND_STATUS[statusLabel] || 'UNPAID_ORDER';
      const payload: CreateOrderPayload = {
        ...form,
        status,
      };
      await createOrder(payload);
      successNotistack('Comandă creată');
      setForm(INIT_FORM);
      setStatusLabel(DEFAULT_STATUS_LABEL);
      setAddressManuallyEdited(false);
      await onCreated();
      onClose();
    } catch (e) {
      errorNotistack(e);
    } finally {
      setCreating(false);
    }
  }, [form, formErrors, statusLabel, errorNotistack, successNotistack, onCreated, onClose]);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="lg"
      onClose={() => !creating && onClose()}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        },
      }}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          position: 'relative',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingCartRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Nouă Comandă
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Completează detaliile comenzii și liniile de produse
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={() => !creating && onClose()}
          sx={{ position: 'absolute', right: 12, top: 12, color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 3,
          '& .MuiOutlinedInput-root': { borderRadius: 2 },
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
        >
          Detalii Comandă
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Autocomplete<EmployeeWithStats>
            sx={{ flex: '1 1 220px', minWidth: 200 }}
            options={employees}
            loading={empLoading}
            getOptionLabel={(o) => o?.name ?? ''}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            value={requestedByValue}
            onChange={(_, val) =>
              setForm((prev) => ({ ...prev, requestedBy: val?.name || '' }))
            }
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

          <Autocomplete<EmployeeWithStats>
            sx={{ flex: '1 1 220px', minWidth: 200 }}
            options={employees}
            loading={empLoading}
            getOptionLabel={(o) => o?.name ?? ''}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            value={orderedByValue}
            onChange={(_, val) =>
              setForm((prev) => ({ ...prev, orderedBy: val?.name || '' }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Comandat de"
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
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                priority: e.target.value as typeof prev.priority,
              }))
            }
          >
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            sx={{ flex: '1 1 200px', minWidth: 180 }}
            select
            label="Status"
            value={statusLabel}
            onChange={(e) =>
              setStatusLabel(
                (e.target.value as (typeof ORDER_STATUSES)[number]) || DEFAULT_STATUS_LABEL,
              )
            }
            SelectProps={{
              renderValue: (value) => {
                const label = (value as string) || '—';
                const rawColor = STATUS_COLOR_BY_LABEL[label] ?? 'default';
                const color = rawColor as ChipProps['color'];
                return (
                  <Chip
                    size="small"
                    color={color}
                    variant={rawColor === 'default' ? 'outlined' : 'filled'}
                    label={label}
                  />
                );
              },
            }}
          >
            {ORDER_STATUSES.map((label) => {
              const rawColor = STATUS_COLOR_BY_LABEL[label] ?? 'default';
              const color = rawColor as ChipProps['color'];
              return (
                <MenuItem key={label} value={label}>
                  <Chip
                    size="small"
                    color={color}
                    variant={rawColor === 'default' ? 'outlined' : 'filled'}
                    label={label}
                  />
                </MenuItem>
              );
            })}
          </TextField>

          <Autocomplete
            sx={{ flex: '1 1 220px', minWidth: 200 }}
            options={availableProjects}
            loading={projLoading}
            getOptionLabel={(option: ProjectOption) => option?.name ?? ''}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedProject}
            onChange={(_, val: ProjectOption | null) => {
              setForm((prev) => {
                const next: CreateOrderPayload = {
                  ...prev,
                  projectId: val?.id,
                };
                const projAddress = val?.location || val?.address;
                if (projAddress && (!addressManuallyEdited || !prev.deliveryAddress)) {
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
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                currency: e.target.value,
              }))
            }
          >
            {['RON', 'EUR', 'USD'].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            sx={{ flex: '2 1 240px', minWidth: 220 }}
            label="Adresă livrare"
            value={form.deliveryAddress || ''}
            onChange={(e) => {
              const v = e.target.value;
              setAddressManuallyEdited(true);
              setForm((prev) => ({ ...prev, deliveryAddress: v }));
            }}
          />

          <TextField
            sx={{ flex: '1 1 100%', minWidth: 300 }}
            label="Observații"
            value={form.notes || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            multiline
            minRows={2}
          />
        </Box>

        {!!formErrors.length && (
          <Typography variant="body2" color="error">
            {formErrors[0]}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={600}>
            Linii comandă
          </Typography>
          <Button
            onClick={addItem}
            size="small"
            startIcon={<AddRoundedIcon />}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Adaugă linie
          </Button>
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
                  onChange={(e) => updateItem(idx, { name: e.target.value })}
                  required
                />
                <TextField
                  label="Categorie"
                  value={it.category || ''}
                  onChange={(e) => updateItem(idx, { category: e.target.value })}
                />
                <TextField
                  label="SKU"
                  value={it.sku || ''}
                  onChange={(e) => updateItem(idx, { sku: e.target.value })}
                />
                <TextField
                  label="U.M."
                  value={it.unit || ''}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                />
                <TextField
                  type="number"
                  label="Cant."
                  inputProps={{ min: 0, step: 1 }}
                  value={it.qtyOrdered}
                  onChange={(e) =>
                    updateItem(idx, { qtyOrdered: Number(e.target.value || 0) })
                  }
                />
                <TextField
                  type="number"
                  label="Preț"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={it.unitPrice ?? 0}
                  onChange={(e) =>
                    updateItem(idx, { unitPrice: Number(e.target.value || 0) })
                  }
                />
                <TextField
                  type="number"
                  label="TVA %"
                  inputProps={{ min: 0, step: 1 }}
                  value={it.vatPercent ?? ''}
                  onChange={(e) =>
                    updateItem(idx, {
                      vatPercent:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <TextField
                  type="number"
                  label="Disc %"
                  inputProps={{ min: 0, step: 1 }}
                  value={it.discountPercent ?? ''}
                  onChange={(e) =>
                    updateItem(idx, {
                      discountPercent:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Linie: ${money(lineGross, form.currency)}`}
                />
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

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" gap={3} flexWrap="wrap">
          <Typography variant="body2">
            Subtotal: <b>{money(totalPreview.net, form.currency)}</b>
          </Typography>
          <Typography variant="body2">
            TVA: <b>{money(totalPreview.vat, form.currency)}</b>
          </Typography>
          <Typography variant="body2">
            Total: <b>{money(totalPreview.gross, form.currency)}</b>
          </Typography>
        </Stack>
      </DialogContent>

      <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={() => onClose()}
            disabled={creating}
            variant="outlined"
            size="large"
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}
          >
            Anulează
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !!formErrors.length}
            size="large"
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              },
            }}
            startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <AddRoundedIcon />}
          >
            {creating ? 'Se salvează...' : 'Salvează'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

