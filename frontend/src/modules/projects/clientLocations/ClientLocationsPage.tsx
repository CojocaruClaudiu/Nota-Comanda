// src/pages/clients/locations/ClientLocationsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Place as PlaceIcon } from '@mui/icons-material';

import { useClientLocations } from './useClientLocations';
import AddLocationModal from './AddLocationModal';
import EditLocationModal from './EditLocationModal';
// removed DeleteLocationDialog in favor of global confirm dialog
import { AddClientModal } from '../../clients/AddClientModal';
import { fetchClients, type Client } from '../../../api/clients';
import type { ClientLocation } from '../../../types/types';
import { tableLocalization } from '../../../localization/tableLocalization';
import useNotistack from '../../orders/hooks/useNotistack';
import { useConfirm } from '../../common/confirm/ConfirmProvider';

const ClientLocationsPage: React.FC = () => {
  const { locations, loading, error, deleteLocation, createLocation, updateLocation, refetch } = useClientLocations();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  // removed unused local state for client name (handled in modal inputs)
  const [editTarget, setEditTarget] = useState<ClientLocation | null>(null);
  // deletion handled inline via global confirm
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();

  // Fetch clients for the "Add" modal select
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const clientData = await fetchClients();
        setClients(clientData.map((c: Client) => ({ id: c.id, name: c.name })));
      } catch (err) {
        // non-blocking
        // eslint-disable-next-line no-console
        console.error('Failed to fetch clients:', err);
      }
    };
    void fetchClientData();
  }, []);

  // delete handled per-row via confirm()

  const handleEdit = async (updates: Partial<ClientLocation>) => {
    if (!editTarget) return;
    try {
      await updateLocation(editTarget.id, updates);
      successNotistack('Locația a fost actualizată.');
      setEditTarget(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update location:', err);
      errorNotistack('Eroare la actualizarea locației.');
    }
  };

  const handleClientAdded = (newClient: Client) => {
    // Add the new client to the clients list
    setClients(prev => [...prev, { id: newClient.id, name: newClient.name }]);
  setShowAddClientModal(false);
    successNotistack('Clientul a fost adăugat cu succes!');
  };

  // Columns (MRT)
  const columns = useMemo<MRT_ColumnDef<ClientLocation>[]>(() => [
    {
      accessorKey: 'client.name',
      header: 'Client',
      size: 220,
      accessorFn: (row) => row.client?.name || '',
      enableColumnFilter: true,
      enableGlobalFilter: true,
      Cell: ({ renderedCellValue }) => renderedCellValue || '—',
    },
    {
      accessorKey: 'name',
      header: 'Nume Locație',
      size: 220,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      Cell: ({ renderedCellValue }) => renderedCellValue || '—',
    },
    {
      accessorKey: 'address',
      header: 'Adresă',
      size: 360,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      Cell: ({ renderedCellValue }) => renderedCellValue || '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Data Creării',
      size: 160,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      sortingFn: 'datetime',
      Cell: ({ renderedCellValue }) =>
        renderedCellValue ? new Date(String(renderedCellValue)).toLocaleDateString('ro-RO') : '—',
    },
  ], []);

  const table = useMaterialReactTable({
    columns,
    data: locations,
    localization: tableLocalization,
    state: { isLoading: loading, showAlertBanner: !!error },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: 'comfortable',
      showGlobalFilter: true,
    },

    // search/filter/sort
    enableGlobalFilter: true,
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    enableFacetedValues: true,
    enableSorting: true,
    enableMultiSort: true,

    // UI features
    enableRowActions: true,
    enableDensityToggle: true,
    enableFullScreenToggle: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableHiding: true,

    // Virtualization for better performance with many rows
    enableRowVirtualization: true,
    
    paginationDisplayMode: 'pages',
    positionActionsColumn: 'last',
    positionGlobalFilter: 'right',
    positionToolbarAlertBanner: 'bottom',

    // Table container props for proper scrolling
    muiTableContainerProps: {
      sx: {
        maxHeight: 'calc(100vh - 200px)', // Adjust based on header height
        overflow: 'auto',
      },
    },

    // Zebra stripes
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex(r => r.id === row.id);
      return {
        sx: {
          backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit',
        },
      };
    },

    // Ensure pinned columns also get zebra striping
    muiTableBodyCellProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex(r => r.id === row.id);
      return {
        sx: {
          backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit',
        },
      };
    },

    // Search input UX
    muiSearchTextFieldProps: {
      placeholder: 'Căutare în toate coloanele...',
      sx: { minWidth: '300px' },
      variant: 'outlined',
    },

    // Top toolbar custom actions (Add / Reload page)
  // ...existing code...

    // Row actions
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={1}>
        <Tooltip title="Editează">
          <span>
            <IconButton size="small" onClick={() => setEditTarget(row.original)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Șterge">
          <span>
            <IconButton
              color="error"
              size="small"
              onClick={async () => {
                const loc = row.original;
                const ok = await confirm({
                  title: 'Confirmare Ștergere',
                  bodyTitle: 'Ești sigur că vrei să ștergi?',
                  description: (
                    <>Locația <strong>{loc.name}</strong> va fi ștearsă permanent.</>
                  ),
                  confirmText: 'Șterge',
                  cancelText: 'Anulează',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteLocation(loc.id);
                  successNotistack('Locația a fost ștearsă.');
                } catch (err: any) {
                  errorNotistack(err?.message || 'Eroare la ștergerea locației.');
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default', overflow: 'hidden' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 1, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" gap={2}>
            <PlaceIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5">Locații Clienți</Typography>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => setShowAddModal(true)}>
              Adaugă locație
            </Button>
            <Button onClick={refetch} disabled={loading} variant="contained">
              {loading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Add Location Modal */}
      <AddLocationModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (locationInput) => {
          try {
            await createLocation(locationInput);
            setShowAddModal(false);
            successNotistack('Locația a fost adăugată.');
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to create location:', err);
            errorNotistack('Eroare la crearea locației.');
          }
        }}
        clients={clients}
        onAddClient={() => {
          setShowAddClientModal(true);
        }}
      />

      {/* Edit Location Modal */}
      <EditLocationModal
        open={!!editTarget}
        location={editTarget}
        clients={clients}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />

  {/* delete handled by global ConfirmProvider */}

      {/* Add Client Modal */}
      <AddClientModal
        open={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
        }}
        onClientAdded={handleClientAdded}
      />
    </Box>
  );
};

export default ClientLocationsPage;
