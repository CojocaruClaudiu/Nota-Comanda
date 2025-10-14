import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  Chip,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import useNotistack from '../orders/hooks/useNotistack';
import * as materialsApi from '../../api/materials';
import type { Material } from '../../api/materials';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../types/types';

type ReceptionType = 'ALL' | 'MAGAZIE' | 'UNDEFINED' | string; // string for project IDs

const ReceptionsPage: React.FC = () => {
  const { successNotistack, errorNotistack } = useNotistack();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<ReceptionType>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Load materials and projects on mount
  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL materials to see complete reception registry
      const data = await materialsApi.fetchAllMaterials();
      // Filter only materials that have some reception data
      const materialsWithReceptions = data.filter(m => 
        m.invoiceNumber || m.receptionType || m.purchaseDate || m.receivedQuantity
      );
      setMaterials(materialsWithReceptions);
      successNotistack(`Încărcat ${materialsWithReceptions.length} recepții`);
    } catch (err: any) {
      const msg = err?.message || 'Eroare la încărcarea materialelor';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [successNotistack, errorNotistack]);

  const loadProjects = useCallback(async () => {
    try {
      const allProjects = await projectsApi.getAll();
      // Filter to show only active projects (not COMPLETED or CANCELLED)
      const activeProjects = allProjects.filter(
        (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
      );
      setProjects(activeProjects);
    } catch (err: any) {
      console.error('Error loading projects:', err);
    }
  }, []);

  useEffect(() => { 
    void loadMaterials();
    void loadProjects();
  }, [loadMaterials, loadProjects]);

  // Filter materials by reception type
  const filteredMaterials = useMemo(() => {
    if (filterType === 'ALL') return materials;
    if (filterType === 'UNDEFINED') return materials.filter(m => !m.receptionType);
    if (filterType === 'MAGAZIE') return materials.filter(m => m.receptionType === 'MAGAZIE');
    // For project IDs
    return materials.filter(m => m.receptionType === filterType);
  }, [materials, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = materials.length;
    const magazie = materials.filter(m => m.receptionType === 'MAGAZIE').length;
    const projectReceptions = materials.filter(m => 
      m.receptionType && m.receptionType !== 'MAGAZIE' && m.receptionType !== 'SANTIER'
    ).length;
    const fara = materials.filter(m => !m.receptionType).length;
    const withInvoice = materials.filter(m => m.invoiceNumber).length;
    const withQuantity = materials.filter(m => m.receivedQuantity && m.receivedQuantity > 0).length;
    
    const totalValue = materials.reduce((sum, m) => {
      const qty = m.receivedQuantity || 0;
      const price = typeof m.price === 'number' ? m.price : parseFloat(String(m.price)) || 0;
      return sum + (qty * price);
    }, 0);
    
    return { total, magazie, projectReceptions, fara, withInvoice, withQuantity, totalValue };
  }, [materials]);

  const columns = useMemo<MRT_ColumnDef<Material>[]>(
    () => [
      {
        accessorKey: 'purchaseDate',
        header: 'Data',
        size: 120,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        enableColumnFilterModes: true,
        Cell: ({ cell }) => {
          const date = cell.getValue<string>();
          return date ? new Date(date).toLocaleDateString('ro-RO') : '—';
        },
      },
      {
        accessorKey: 'invoiceNumber',
        header: 'Factură',
        size: 150,
        enableGlobalFilter: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'supplierName',
        header: 'Furnizor',
        size: 200,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        enableColumnFilterModes: true,
      },
      {
        accessorKey: 'manufacturer',
        header: 'Producător',
        size: 200,
        enableGlobalFilter: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'code',
        header: 'Cod',
        size: 120,
        enableGlobalFilter: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'description',
        header: 'Material',
        size: 300,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        enableColumnFilterModes: true,
        filterFn: 'fuzzy' as any,
      },
      {
        accessorKey: 'unit',
        header: 'U.M.',
        size: 80,
        enableGlobalFilter: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'receivedQuantity',
        header: 'Cantitate',
        size: 120,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        Cell: ({ cell }) => {
          const val = cell.getValue<number>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—';
        },
      },
      {
        accessorKey: 'price',
        header: 'Preț Unitar',
        size: 120,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        Cell: ({ cell, row }) => {
          const val = cell.getValue<number>();
          const currency = row.original.currency || 'RON';
          return val != null ? `${val.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}` : '—';
        },
      },
      {
        accessorKey: 'receptionType',
        header: 'Tip Recepție',
        size: 240,
        enableGlobalFilter: true,
        enableColumnFilter: true,
        enableEditing: false, // Disable default editing since we handle it in Cell
        Cell: ({ cell, row }) => {
          const type = cell.getValue<string>();
          const [localValue, setLocalValue] = React.useState(type || '');
          
          // Update local value when cell value changes
          React.useEffect(() => {
            setLocalValue(type || '');
          }, [type]);
          
          return (
            <Select
              value={localValue}
              onChange={async (e) => {
                const newValue = e.target.value as string;
                setLocalValue(newValue); // Update immediately for UI feedback
                
                try {
                  // Update the material with full required fields
                  await materialsApi.updateMaterial(row.original.id, {
                    code: row.original.code,
                    description: row.original.description,
                    unit: row.original.unit || 'buc',
                    price: row.original.price || 0,
                    currency: row.original.currency || 'RON',
                    active: row.original.active ?? true,
                    receptionType: newValue || null,
                  });
                  
                  // Update the materials state immediately without full reload
                  setMaterials(prevMaterials => 
                    prevMaterials.map(m => 
                      m.id === row.original.id 
                        ? { ...m, receptionType: newValue || null }
                        : m
                    )
                  );
                  
                  successNotistack('Tip recepție actualizat');
                } catch (err: any) {
                  console.error('Error updating material:', err);
                  setLocalValue(type || ''); // Revert on error
                  errorNotistack(err?.response?.data?.message || err?.message || 'Eroare la actualizare');
                }
              }}
              size="small"
              fullWidth
              displayEmpty
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">
                <em>Nedefinit</em>
              </MenuItem>
              <MenuItem value="MAGAZIE">
                <Chip label="Magazie" size="small" color="secondary" sx={{ minWidth: 80 }} />
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Chip label={project.name} size="small" color="primary" sx={{ minWidth: 80 }} />
                </MenuItem>
              ))}
            </Select>
          );
        },
      },
    ],
    [projects, loadMaterials, successNotistack, errorNotistack] // Dependencies for dropdown and callbacks
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredMaterials,
    localization: tableLocalization,
    state: { 
      isLoading: loading,
      showAlertBanner: !!error,
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      density: 'compact',
      sorting: [{ id: 'purchaseDate', desc: true }],
      showGlobalFilter: true,
    },
    enableRowActions: false,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableColumnFilterModes: true,
    globalFilterFn: 'fuzzy' as any,
    enableSorting: true,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    muiTableContainerProps: { sx: { maxHeight: 'calc(100vh - 420px)' } },
    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return { sx: { backgroundColor: displayIndex % 2 === 0 ? 'action.hover' : 'inherit' } };
    },
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" gap={1}>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={() => loadMaterials()} 
          disabled={loading}
        >
          Reîncarcă
        </Button>
      </Stack>
    ),
  });

  return (
    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <ReceiptLongRoundedIcon color="primary" />
            <Typography variant="h5">Registru Recepții</Typography>
          </Stack>
        </Stack>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2} sx={{ mb: 2 }}>
          {/* Filter by reception type/project */}
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>Filtrează după destinație</InputLabel>
              <Select
                value={filterType}
                label="Filtrează după destinație"
                onChange={(e) => setFilterType(e.target.value as ReceptionType)}
              >
                <MenuItem value="ALL">
                  Toate ({stats.total})
                </MenuItem>
                <MenuItem value="MAGAZIE">
                  Magazie ({stats.magazie})
                </MenuItem>
                {projects.map((project) => {
                  const count = materials.filter(m => m.receptionType === project.id).length;
                  return (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name} ({count})
                    </MenuItem>
                  );
                })}
                <MenuItem value="UNDEFINED">
                  Nedefinit ({stats.fara})
                </MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Proiecte: ${stats.projectReceptions}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Magazie: ${stats.magazie}`} 
                color="secondary" 
                variant="outlined" 
              />
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>
    </Box>
  );
};

export default ReceptionsPage;
