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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddProjectModal from './AddProjectModal';
import EditProjectModal from './EditProjectModal';
import { AddClientModal } from '../clients/AddClientModal';
import { fetchClients, type Client } from '../../api/clients';
import { api } from '../../api/axios';
import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from '../orders/hooks/useNotistack';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import type { Project, ProjectStatus } from '../../types/types';
import {
  fetchProjectDevizLines,
  createProjectDevizLine,
  updateProjectDevizLine,
  deleteProjectDevizLine,
  type ProjectDevizLine,
} from '../../api/projectDeviz';
import { saveProjectSheet } from '../../api/projectSheet';
import ProjectSheetModal, { type ProjectSheetData } from './ProjectSheetModal';

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
  
  // Deviz lines per project
  const [devizLines, setDevizLines] = useState<Record<string, ProjectDevizLine[]>>({});
  const [loadingDeviz, setLoadingDeviz] = useState<Record<string, boolean>>({});
  
  // Project Sheet Modal
  const [showProjectSheet, setShowProjectSheet] = useState(false);
  const [selectedDevizLine, setSelectedDevizLine] = useState<ProjectDevizLine | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  
  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();

  // Component for the detail panel
  const DevizDetailPanel: React.FC<{ projectId: string; projectName: string; isExpanded: boolean }> = ({ projectId, projectName, isExpanded }) => {
    const lines = devizLines[projectId] || [];
    const isLoading = loadingDeviz[projectId];

    // Load deviz when panel is expanded
    useEffect(() => {
      if (isExpanded && !devizLines[projectId] && !loadingDeviz[projectId]) {
        loadDevizForProject(projectId);
      }
    }, [isExpanded, projectId]);

    if (isLoading) {
      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" color="primary">
            Deviz - Lucrări de construcții
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddDevizLine(projectId)}
          >
            Adaugă linie
          </Button>
        </Stack>

        {lines.length === 0 ? (
          <Alert severity="info">Nicio linie în deviz. Adaugă prima linie!</Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '60px' }}>Cod</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: '250px' }}>Descriere</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '120px' }} align="right">LEI</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '120px' }} align="right">EURO</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '80px' }} align="center">TVA %</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '120px' }} align="right">LEI cu TVA</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '120px' }} align="right">EURO cu TVA</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '80px' }} align="center">Acțiuni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id} hover>
                    <TableCell>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenProjectSheet(line, projectName)}
                        sx={{ 
                          minWidth: '50px',
                          fontWeight: 'bold',
                          textDecoration: 'underline',
                          '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                        }}
                      >
                        {line.code}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        value={line.description}
                        onChange={(e) => handleUpdateDevizLine(projectId, line.id, { description: e.target.value })}
                        placeholder="Ex: LUCRĂRI DE TENCUIELI"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.priceLei || ''}
                        onChange={(e) => handleUpdateDevizLine(projectId, line.id, { priceLei: e.target.value ? parseFloat(e.target.value) : null })}
                        sx={{ width: '110px' }}
                        inputProps={{ style: { textAlign: 'right' }, step: '0.01' }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.priceEuro || ''}
                        onChange={(e) => handleUpdateDevizLine(projectId, line.id, { priceEuro: e.target.value ? parseFloat(e.target.value) : null })}
                        sx={{ width: '110px' }}
                        inputProps={{ style: { textAlign: 'right' }, step: '0.01' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={line.vatPercent || ''}
                        onChange={(e) => handleUpdateDevizLine(projectId, line.id, { vatPercent: e.target.value ? parseFloat(e.target.value) : null })}
                        sx={{ width: '70px' }}
                        inputProps={{ style: { textAlign: 'center' }, step: '1', min: '0', max: '100' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {line.priceWithVatLei
                          ? line.priceWithVatLei.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {line.priceWithVatEuro
                          ? line.priceWithVatEuro.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDevizLine(projectId, line.id, line.description)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary Row */}
                <TableRow sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'primary.main' }}>
                  <TableCell colSpan={2} align="right">
                    <Typography variant="subtitle1" fontWeight="bold">TOTAL:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {lines.reduce((sum, l) => sum + (l.priceLei || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {lines.reduce((sum, l) => sum + (l.priceEuro || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell />
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                      {lines.reduce((sum, l) => sum + (l.priceWithVatLei || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                      {lines.reduce((sum, l) => sum + (l.priceWithVatEuro || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    );
  };

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

  // Load deviz lines for a project
  const loadDevizForProject = useCallback(async (projectId: string) => {
    if (devizLines[projectId]) return; // Already loaded
    try {
      setLoadingDeviz(prev => ({ ...prev, [projectId]: true }));
      const lines = await fetchProjectDevizLines(projectId);
      setDevizLines(prev => ({ ...prev, [projectId]: lines }));
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la încărcarea devizului');
    } finally {
      setLoadingDeviz(prev => ({ ...prev, [projectId]: false }));
    }
  }, [devizLines, errorNotistack]);

  // Add new deviz line
  const handleAddDevizLine = async (projectId: string) => {
    const lines = devizLines[projectId] || [];
    const newOrderNum = lines.length > 0 ? Math.max(...lines.map(l => l.orderNum)) + 1 : 1;
    const code = String(newOrderNum).padStart(2, '0');
    
    try {
      const newLine = await createProjectDevizLine(projectId, {
        orderNum: newOrderNum,
        code,
        description: 'Lucrări noi',
        vatPercent: 19,
      });
      setDevizLines(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), newLine],
      }));
      successNotistack('Linie adăugată');
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la adăugarea liniei');
    }
  };

  // Update deviz line
  const handleUpdateDevizLine = async (projectId: string, lineId: string, updates: Partial<ProjectDevizLine>) => {
    try {
      const updated = await updateProjectDevizLine(projectId, lineId, updates);
      setDevizLines(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(l => l.id === lineId ? updated : l),
      }));
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la actualizare');
    }
  };

  // Delete deviz line
  const handleDeleteDevizLine = async (projectId: string, lineId: string, lineName: string) => {
    const ok = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi această linie din deviz?',
      description: <><strong>{lineName}</strong> va fi ștearsă permanent.</>,
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    if (!ok) return;
    
    try {
      await deleteProjectDevizLine(projectId, lineId);
      setDevizLines(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(l => l.id !== lineId),
      }));
      successNotistack('Linie ștearsă');
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la ștergere');
    }
  };

  // Open Project Sheet modal
  const handleOpenProjectSheet = (line: ProjectDevizLine, projectName: string) => {
    setSelectedDevizLine(line);
    setSelectedProjectName(projectName);
    setShowProjectSheet(true);
  };

  // Save project sheet data
  const handleSaveProjectSheet = async (data: ProjectSheetData) => {
    try {
      await saveProjectSheet(data.projectId, data.devizLineId, {
        initiationDate: data.initiationDate ? data.initiationDate.toISOString() : null,
        estimatedStartDate: data.estimatedStartDate ? data.estimatedStartDate.toISOString() : null,
        estimatedEndDate: data.estimatedEndDate ? data.estimatedEndDate.toISOString() : null,
        standardMarkupPercent: data.standardMarkupPercent ?? null,
        standardDiscountPercent: data.standardDiscountPercent ?? null,
        indirectCostsPercent: data.indirectCostsPercent ?? null,
        operations: data.operations.map(op => ({
          operationItemId: op.operationItemId, // Include OperationItem ID for templates
          orderNum: op.orderNum,
          operationName: op.operationName,
          unit: op.unit,
          quantity: op.quantity ?? 0,
          unitPrice: op.unitPrice ?? 0,
          totalPrice: op.totalPrice ?? 0,
          notes: op.notes ?? undefined,
        })),
      });
      successNotistack('Fișa proiect salvată cu succes');
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la salvarea fișei proiect');
      throw e;
    }
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

    // Expandable rows for deviz
    enableExpanding: true,
    getRowCanExpand: () => true,
    
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
                const p = row.original;
                const ok = await confirm({
                  title: 'Confirmare Ștergere',
                  bodyTitle: 'Ești sigur că vrei să ștergi?',
                  description: (
                    <>
                      Proiectul <strong>{p.name}</strong> va fi șters permanent.
                    </>
                  ),
                  confirmText: 'Șterge',
                  cancelText: 'Anulează',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await api.delete(`/projects/${p.id}`);
                  setData((prev) => prev.filter((x) => x.id !== p.id));
                  successNotistack('Șters');
                } catch (e: any) {
                  errorNotistack(e?.message || 'Nu am putut șterge proiectul');
                }
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),

    // Render detail panel for deviz lines
    renderDetailPanel: ({ row }) => (
      <DevizDetailPanel 
        projectId={row.original.id} 
        projectName={row.original.name}
        isExpanded={row.getIsExpanded()}
      />
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

      {/* Project Sheet Modal */}
      <ProjectSheetModal
        open={showProjectSheet}
        devizLine={selectedDevizLine}
        projectName={selectedProjectName}
        onClose={() => {
          setShowProjectSheet(false);
          setSelectedDevizLine(null);
        }}
        onSave={handleSaveProjectSheet}
      />

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
};

export default ProjectsPage;
