import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, MenuItem,
  Typography, Chip, Stack, Divider, IconButton, Tooltip,
  type ChipProps,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import {
  listOrders, deleteOrder, updateOrderStatus,
  type PurchaseOrderDTO,
} from '../../api/orders';
import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from './hooks/useNotistack';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { projectsApi } from '../../api/projects';
import AddOrderDialog from './AddOrderDialog';
import {
  ORDER_STATUSES,
  BACKEND_TO_UI_STATUS,
  UI_TO_BACKEND_STATUS,
  STATUS_COLOR_BY_LABEL,
} from './orderStatus';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('ro-RO') : '—';

const money = (v: number, currency = 'RON') =>
  `${(Number.isFinite(v) ? v : 0).toFixed(2)} ${currency}`;



const priorityColor = (p?: string): ChipColor =>
  p === 'URGENT' ? 'error'
    : p === 'HIGH' ? 'warning'
    : p === 'MEDIUM' ? 'info'
    : 'default';

const statusColor = (value?: string): ChipColor => {
  if (!value) return 'default';
  const mapped = BACKEND_TO_UI_STATUS[value];
  if (mapped && STATUS_COLOR_BY_LABEL[mapped]) return STATUS_COLOR_BY_LABEL[mapped] as ChipColor;
  if (STATUS_COLOR_BY_LABEL[value]) return STATUS_COLOR_BY_LABEL[value] as ChipColor;
  return 'default';
};

const paymentColor = (p?: string): ChipColor =>
  p === 'PAID' ? 'success'
    : p === 'PARTIAL' ? 'warning'
    : p === 'UNPAID' ? 'error'
    : 'default';

export default function OrdersPage() {
  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();

  const [rows, setRows] = useState<PurchaseOrderDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projLoading, setProjLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

  const fetchProjects = useCallback(async () => {
    if (projLoading) return;
    try {
      setProjLoading(true);
      const data = await projectsApi.getAll();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setProjLoading(false);
    }
  }, [projLoading]);

  useEffect(() => {
    if (open && projects.length === 0) {
      void fetchProjects();
    }
  }, [open, projects.length, fetchProjects]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const projectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) {
      if (project?.id) {
        map[project.id] = project?.name ?? String(project.id);
      }
    }
    return map;
  }, [projects]);

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
        row.items?.forEach((item) => item.allocations?.forEach((a) => a?.projectId && distinct.add(a.projectId)));
        const ids = Array.from(distinct);
        return { count: ids.length, ids, projectId: row.projectId || ids[0] || null };
      },
      id: 'projectsSummary',
      header: 'Proiect(e)',
      size: 180,
      Cell: ({ cell, row }) => {
        const value = cell.getValue<any>() as { count: number; ids: string[]; projectId?: string | null };
        if (!value) return '—';
        if (value.count === 0) {
          const id = row.original.projectId;
          return id ? (projectNameById[id] || id) : '—';
        }
        if (value.count === 1) {
          const id = value.projectId;
          return id ? (projectNameById[id] || id) : '—';
        }
        const names = value.ids.map((id) => projectNameById[id] || id).join(', ');
        return (
          <Tooltip title={names || `${value.count} proiecte alocate`}>
            <Chip size="small" label={`Mixed (${value.count})`} />
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Prioritate',
      size: 120,
      Cell: ({ cell }) => {
        const value = cell.getValue<string>();
        const color = priorityColor(value);
        return (
          <Chip
            size="small"
            color={color}
            variant={color === 'default' ? 'outlined' : 'filled'}
            label={value || '—'}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 220,
      Cell: ({ row }) => {
        const backend = row.original.status || '';
        const uiValue = BACKEND_TO_UI_STATUS[backend] ?? backend ?? '';
        const disabled = updatingStatusId === row.original.id;
        return (
          <TextField
            select
            size="small"
            value={uiValue}
            onChange={async (e) => {
              const nextLabel = e.target.value as (typeof ORDER_STATUSES)[number];
              const nextBackend = UI_TO_BACKEND_STATUS[nextLabel] || backend;
              if (!nextBackend || nextBackend === backend) return;
              setUpdatingStatusId(row.original.id);
              try {
                await updateOrderStatus(row.original.id, nextBackend);
                setRows((prev) =>
                  prev.map((order) =>
                    order.id === row.original.id ? { ...order, status: nextBackend } : order,
                  ),
                );
                successNotistack('Status actualizat');
              } catch (err) {
                errorNotistack(err);
              } finally {
                setUpdatingStatusId(null);
              }
            }}
            SelectProps={{
              renderValue: (value) => {
                const label = (value as string) || '—';
                const color = statusColor(label);
                return (
                  <Chip
                    size="small"
                    color={color}
                    variant={color === 'default' ? 'outlined' : 'filled'}
                    label={label}
                  />
                );
              },
            }}
            disabled={disabled}
            sx={{ minWidth: 200 }}
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
        );
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Plăți',
      size: 120,
      Cell: ({ cell }) => {
        const value = cell.getValue<string>();
        const color = paymentColor(value);
        return (
          <Chip
            size="small"
            color={color}
            variant={color === 'default' ? 'outlined' : 'filled'}
            label={value || '—'}
          />
        );
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
      accessorFn: (row) => row.items?.length ?? 0,
      id: 'itemsCount',
      header: 'Linii',
      size: 100,
    },
  ], [projectNameById, updatingStatusId, errorNotistack, successNotistack]);

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
                  title: 'Confirmare ștergere',
                  bodyTitle: 'Ștergi comanda?',
                  description: (
                    <span>
                      Comanda <strong>{row.original.poNumber}</strong> va fi ștearsă definitiv.
                    </span>
                  ),
                  confirmText: 'Șterge',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteOrder(row.original.id);
                  successNotistack('Comandă ștearsă');
                  await load();
                } catch (e) {
                  errorNotistack(e);
                }
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
    muiToolbarAlertBannerProps: rows.length
      ? undefined
      : { color: 'info', children: 'Nu există comenzi.' },
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

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2} height="100%" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="h5" fontWeight={600}>
          Comenzi
        </Typography>
      </Stack>

      <Divider />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MaterialReactTable table={table} />
      </Box>

      <AddOrderDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={load}
        projects={projects}
        projLoading={projLoading}
        ensureProjects={fetchProjects}
      />
    </Box>
  );
}
