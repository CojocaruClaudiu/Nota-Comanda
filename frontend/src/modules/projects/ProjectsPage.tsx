import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddProjectModal from './AddProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteProjectDialog from './DeleteProjectDialog';
import { AddClientModal } from '../clients/AddClientModal';
import { fetchClients, type Client } from '../../api/clients';
import { api } from '../../api/axios';
import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from '../orders/hooks/useNotistack';
import type { Project, ProjectStatus } from '../../types/types';

const getStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case 'PLANNING': return 'default';
    case 'IN_PROGRESS': return 'primary';
    case 'ON_HOLD': return 'warning';
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'error';
    default: return 'default';
  }
};

const getStatusLabel = (status: ProjectStatus) => {
  switch (status) {
    case 'PLANNING': return 'Planificare';
    case 'IN_PROGRESS': return 'În desfășurare';
    case 'ON_HOLD': return 'În așteptare';
    case 'COMPLETED': return 'Finalizat';
    case 'CANCELLED': return 'Anulat';
    default: return status;
  }
};

const ProjectsPage: React.FC = () => {
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);
  
  // Add client dialog
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  
  // Edit dialog
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  
  // Delete dialog
  const [toDelete, setToDelete] = useState<Project | null>(null);
  
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  
  const { errorNotistack } = useNotistack();

  // Memoized columns with enhanced features
  const columns = useMemo<MRT_ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nume Proiect',
        size: 200,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ row }) => (
          <Box>
            <Typography variant="subtitle2">{row.original.name}</Typography>
            {row.original.description && (
              <Typography variant="caption" color="text.secondary">
                {row.original.description}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 150,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ renderedCellValue }) => (
          <Chip
            label={getStatusLabel(renderedCellValue as ProjectStatus)}
            color={getStatusColor(renderedCellValue as ProjectStatus)}
            size="small"
          />
        ),
      },
      {
        accessorKey: 'client.name',
        header: 'Client',
        size: 180,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        accessorFn: (row) => row.client?.name || '',
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      {
        accessorKey: 'location',
        header: 'Locație',
        size: 180,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ renderedCellValue }) => renderedCellValue || '—',
      },
      {
        accessorKey: 'startDate',
        header: 'Data Început',
        size: 140,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        Cell: ({ renderedCellValue }) =>
          renderedCellValue ? new Date(renderedCellValue as string).toLocaleDateString('ro-RO') : '—',
      },
      {
        accessorKey: 'endDate',
        header: 'Data Sfârșit',
        size: 140,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        Cell: ({ renderedCellValue }) =>
          renderedCellValue ? new Date(renderedCellValue as string).toLocaleDateString('ro-RO') : '—',
      },
      {
        accessorKey: 'budget',
        header: 'Buget',
        size: 130,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        Cell: ({ row }) => {
          const val = row.original.budget;
          if (val == null) return '—';
          const curr = (row.original as any).currency || 'RON';
          return `${val.toLocaleString('ro-RO')} ${curr}`;
        },
      },
    ],
    [],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
  const response = await api.get<Project[]>('/projects');
  setData(response.data);
    } catch (e: any) {
      const msg = e?.message || 'Eroare la încărcarea proiectelor';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const clientData = await fetchClients();
        setClients(clientData.map((c: Client) => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      }
    };
    fetchClientData();
  }, []);

  const handleProjectAdded = (newProject: Project) => {
    setData(prev => [newProject, ...prev]);
    setOpenAdd(false);
  };

  const handleClientAdded = (newClient: Client) => {
    // Add the new client to the clients list
    setClients(prev => [...prev, { id: newClient.id, name: newClient.name }]);
    setShowAddClientModal(false);
    // Note: We could also add success notification here if needed
  };

  const handleDelete = (project: Project) => {
    setToDelete(project);
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
            <IconButton color="error" size="small" onClick={() => handleDelete(row.original)}>
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
          <Stack direction="row" alignItems="center" gap={2}>
            <FolderOpenIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5">Lista Proiecte</Typography>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => setOpenAdd(true)}>
              Adaugă proiect
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

      {/* Add Project Modal */}
      <AddProjectModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={async (project) => {
          try {
            const response = await api.post('/projects', project);
            handleProjectAdded(response.data as Project);
          } catch (err) {
            console.error('Failed to create project:', err);
            errorNotistack('Eroare la crearea proiectului');
          }
        }}
        clients={clients}
        onAddClient={() => {
          setShowAddClientModal(true);
        }}
      />

      {/* Add Client Modal */}
      <AddClientModal
        open={showAddClientModal}
  onClose={() => {
          setShowAddClientModal(false);
        }}
        onClientAdded={handleClientAdded}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        open={!!editTarget}
        project={editTarget}
        clients={clients}
        onClose={() => setEditTarget(null)}
        onProjectUpdated={(p) => {
          setData(prev => prev.map(x => x.id === p.id ? p : x));
          setEditTarget(null);
        }}
        onAddClient={() => setShowAddClientModal(true)}
      />

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        open={!!toDelete}
        project={toDelete}
        onClose={() => setToDelete(null)}
        onProjectDeleted={(projectId) => {
          setData(prev => prev.filter(p => p.id !== projectId));
          setToDelete(null);
        }}
      />
    </Box>
  );
};

export default ProjectsPage;
