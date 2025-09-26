// src/pages/clients/ClientsTable.tsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
  Box, Typography, Paper, Alert, Stack, Button,
  CircularProgress, IconButton, Tooltip
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  fetchClients,
  type Client
} from '../../api/clients';
import useNotistack from '../orders/hooks/useNotistack';
import { tableLocalization } from '../../localization/tableLocalization';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { deleteClient } from '../../api/clients';

export const ClientsTable: React.FC = () => {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Client | null>(null);

  const confirm = useConfirm();

  const { errorNotistack, successNotistack } = useNotistack();

  // Memoized columns with enhanced features
  const columns = useMemo<MRT_ColumnDef<Client>[]>(
    () => [
      { 
        accessorKey: 'name', 
        header: 'Nume Client',
        size: 180,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      { 
        accessorKey: 'location', 
        header: 'Locație',
        size: 200,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      { 
        accessorKey: 'phone', 
        header: 'Telefon',
        size: 150,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 200,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        accessorFn: (row) => row.email || '', // Ensure we return empty string instead of null
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      {
        accessorKey: 'registrulComertului',
        header: 'Registrul Comerțului',
        size: 180,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        accessorFn: (row) => row.registrulComertului || '', // Ensure we return empty string instead of null
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      {
        accessorKey: 'cui',
        header: 'CUI',
        size: 120,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        accessorFn: (row) => row.cui || '', // Ensure we return empty string instead of null
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
    ],
    [],
  );

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

  const handleClientAdded = (newClient: Client) => {
    setData(prev => [newClient, ...prev]);
    setOpenAdd(false);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setData(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
    setEditTarget(null);
  };

  const handleClientDeleted = (clientId: string) => {
    setData(prev => prev.filter(c => c.id !== clientId));
  };

  const table = useMaterialReactTable({
    columns,
    data,
    localization: tableLocalization,
    state: { isLoading: loading, showAlertBanner: !!error },
    initialState: { 
      pagination: { pageIndex: 0, pageSize: 10 },
      density: 'comfortable',
      showGlobalFilter: true,
    },
    // Enhanced search and filtering
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
    
    // Use built-in string search for reliable filtering
    globalFilterFn: 'includesString',
    
    // Enhanced pagination
    paginationDisplayMode: 'pages',
    
    positionActionsColumn: 'last',
    positionGlobalFilter: 'right',
    positionToolbarAlertBanner: 'bottom',
    
    // Styling
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
      <Stack direction="row" gap={1}>
        <Tooltip title="Editează">
          <span>
            <IconButton size="small" onClick={() => setEditTarget(row.original)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Șterge">
          <span>
            <IconButton
              color="error"
              size="small"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Confirmare Ștergere',
                  bodyTitle: 'Ești sigur că vrei să ștergi?',
                  description: (
                    <>Clientul <strong>{row.original.name}</strong> va fi șters permanent.</>
                  ),
                  confirmText: 'Șterge Client',
                  cancelText: 'Anulează',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteClient(row.original.id);
                  handleClientDeleted(row.original.id);
                  successNotistack('Șters');
                } catch (e: any) {
                  errorNotistack(e?.message || 'Nu am putut șterge clientul');
                }
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 1 }}>
          <Typography variant="h5">Lista Clienți</Typography>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => setOpenAdd(true)}>
              Adaugă client
            </Button>
            <Button onClick={load} disabled={loading} variant="contained">
              {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Add Client Modal */}
      <AddClientModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        open={!!editTarget}
        client={editTarget}
        onClose={() => setEditTarget(null)}
        onClientUpdated={handleClientUpdated}
      />

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
};
