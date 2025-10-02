import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import type { ProjectDevizLine } from '../../api/projectDeviz';

// Material List Types
export type MaterialItem = {
  id: string;
  orderNum: number;
  operationCode: string;
  operationDescription: string;
  materialCode: string;
  materialDescription: string;
  unit: string;
  quantity: number | null;
  unitPrice: number | null;
  baseValue: number | null;
  markupPercent: number | null;
  valueWithMarkup: number | null;
  discountPercent: number | null;
  finalValue: number | null;
};

// Labor (Manopera) Types
export type LaborItem = {
  id: string;
  orderNum: number;
  operationCode: string;
  operationDescription: string;
  laborDescription: string;
  quantity: number | null;
  unitPrice: number | null;
  baseValue: number | null;
  markupPercent: number | null;
  valueWithMarkup: number | null;
  discountPercent: number | null;
  finalValue: number | null;
};

interface DevizeModalProps {
  open: boolean;
  devizLine: ProjectDevizLine | null;
  projectName: string;
  standardMarkup: number;
  standardDiscount: number;
  onClose: () => void;
  onSave: (materials: MaterialItem[], labor: LaborItem[]) => void;
}

const DevizeModal: React.FC<DevizeModalProps> = ({
  open,
  devizLine,
  projectName,
  standardMarkup,
  standardDiscount,
  onClose,
  onSave,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [labor, setLabor] = useState<LaborItem[]>([]);

  // Helper function to calculate values
  const calculateMaterialValues = (item: Partial<MaterialItem>): Partial<MaterialItem> => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const baseValue = qty * price;
    const markup = item.markupPercent !== undefined && item.markupPercent !== null ? item.markupPercent : standardMarkup;
    const discount = item.discountPercent !== undefined && item.discountPercent !== null ? item.discountPercent : standardDiscount;
    const valueWithMarkup = baseValue * (1 + (markup || 0) / 100);
    const finalValue = valueWithMarkup * (1 - (discount || 0) / 100);

    return {
      ...item,
      baseValue,
      markupPercent: markup,
      valueWithMarkup,
      discountPercent: discount,
      finalValue,
    };
  };

  const calculateLaborValues = (item: Partial<LaborItem>): Partial<LaborItem> => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const baseValue = qty * price;
    const markup = item.markupPercent !== undefined && item.markupPercent !== null ? item.markupPercent : standardMarkup;
    const discount = item.discountPercent !== undefined && item.discountPercent !== null ? item.discountPercent : standardDiscount;
    const valueWithMarkup = baseValue * (1 + (markup || 0) / 100);
    const finalValue = valueWithMarkup * (1 - (discount || 0) / 100);

    return {
      ...item,
      baseValue,
      markupPercent: markup,
      valueWithMarkup,
      discountPercent: discount,
      finalValue,
    };
  };

  // Materials handlers
  const handleAddMaterial = () => {
    const newOrderNum = materials.length > 0 ? Math.max(...materials.map(m => m.orderNum)) + 1 : 1;
    const newId = `temp_mat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const newMaterial: MaterialItem = {
      id: newId,
      orderNum: newOrderNum,
      operationCode: devizLine?.code || '',
      operationDescription: devizLine?.description || '',
      materialCode: '',
      materialDescription: '',
      unit: 'buc',
      quantity: null,
      unitPrice: null,
      baseValue: null,
      markupPercent: standardMarkup,
      valueWithMarkup: null,
      discountPercent: standardDiscount,
      finalValue: null,
    };
    setMaterials([...materials, newMaterial]);
  };

  const handleUpdateMaterial = (id: string, updates: Partial<MaterialItem>) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, ...updates };
        return calculateMaterialValues(updated) as MaterialItem;
      }
      return m;
    }));
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  // Labor handlers
  const handleAddLabor = () => {
    const newOrderNum = labor.length > 0 ? Math.max(...labor.map(l => l.orderNum)) + 1 : 1;
    const newId = `temp_lab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const newLabor: LaborItem = {
      id: newId,
      orderNum: newOrderNum,
      operationCode: devizLine?.code || '',
      operationDescription: devizLine?.description || '',
      laborDescription: '',
      quantity: null,
      unitPrice: null,
      baseValue: null,
      markupPercent: standardMarkup,
      valueWithMarkup: null,
      discountPercent: standardDiscount,
      finalValue: null,
    };
    setLabor([...labor, newLabor]);
  };

  const handleUpdateLabor = (id: string, updates: Partial<LaborItem>) => {
    setLabor(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, ...updates };
        return calculateLaborValues(updated) as LaborItem;
      }
      return l;
    }));
  };

  const handleDeleteLabor = (id: string) => {
    setLabor(prev => prev.filter(l => l.id !== id));
  };

  // Materials Table Columns
  const materialsColumns = useMemo<MRT_ColumnDef<MaterialItem>[]>(
    () => [
      {
        accessorKey: 'operationCode',
        header: 'Cod Operație',
        size: 100,
        enableEditing: false,
      },
      {
        accessorKey: 'operationDescription',
        header: 'Descriere Operație',
        size: 150,
        enableEditing: false,
      },
      {
        accessorKey: 'materialCode',
        header: 'Cod Material',
        size: 120,
      },
      {
        accessorKey: 'materialDescription',
        header: 'Descriere Material',
        size: 200,
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'quantity',
        header: 'Cantitate',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Preț Unitar',
        size: 110,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'baseValue',
        header: 'Valoare Bază',
        size: 120,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'markupPercent',
        header: 'Adaos %',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.1, min: 0 },
        },
      },
      {
        accessorKey: 'valueWithMarkup',
        header: 'Valoare cu Adaos',
        size: 130,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'discountPercent',
        header: 'Discount %',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.1, min: 0, max: 100 },
        },
      },
      {
        accessorKey: 'finalValue',
        header: 'Valoare Finală',
        size: 130,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    []
  );

  // Labor Table Columns
  const laborColumns = useMemo<MRT_ColumnDef<LaborItem>[]>(
    () => [
      {
        accessorKey: 'operationCode',
        header: 'Cod Operație',
        size: 100,
        enableEditing: false,
      },
      {
        accessorKey: 'operationDescription',
        header: 'Descriere Operație',
        size: 180,
        enableEditing: false,
      },
      {
        accessorKey: 'laborDescription',
        header: 'Descriere Linie Manoperă',
        size: 250,
      },
      {
        accessorKey: 'quantity',
        header: 'Cantitate',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Preț Unitar',
        size: 110,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'baseValue',
        header: 'Valoare Bază',
        size: 120,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'markupPercent',
        header: 'Adaos %',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.1, min: 0 },
        },
      },
      {
        accessorKey: 'valueWithMarkup',
        header: 'Valoare cu Adaos',
        size: 130,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
        accessorKey: 'discountPercent',
        header: 'Discount %',
        size: 100,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.1, min: 0, max: 100 },
        },
      },
      {
        accessorKey: 'finalValue',
        header: 'Valoare Finală',
        size: 130,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    []
  );

  const materialsTable = useMaterialReactTable({
    columns: materialsColumns,
    data: materials,
    localization: tableLocalization,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: true,
    positionActionsColumn: 'last',
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: 'compact',
    },
    muiEditTextFieldProps: ({ column, row }) => ({
      onBlur: (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        handleUpdateMaterial(row.original.id, {
          [column.id]: ['quantity', 'unitPrice', 'markupPercent', 'discountPercent'].includes(column.id)
            ? (value ? parseFloat(value) : null)
            : value,
        });
      },
    }),
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={0.5}>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDeleteMaterial(row.original.id)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    ),
    renderTopToolbarCustomActions: () => (
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={handleAddMaterial}
      >
        Adaugă Material
      </Button>
    ),
    renderBottomToolbarCustomActions: () => {
      const total = materials.reduce((sum, m) => sum + (m.finalValue || 0), 0);
      return (
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            TOTAL MATERIALE: {total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
          </Typography>
        </Box>
      );
    },
  });

  const laborTable = useMaterialReactTable({
    columns: laborColumns,
    data: labor,
    localization: tableLocalization,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: true,
    positionActionsColumn: 'last',
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: 'compact',
    },
    muiEditTextFieldProps: ({ column, row }) => ({
      onBlur: (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        handleUpdateLabor(row.original.id, {
          [column.id]: ['quantity', 'unitPrice', 'markupPercent', 'discountPercent'].includes(column.id)
            ? (value ? parseFloat(value) : null)
            : value,
        });
      },
    }),
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={0.5}>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDeleteLabor(row.original.id)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    ),
    renderTopToolbarCustomActions: () => (
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={handleAddLabor}
      >
        Adaugă Manoperă
      </Button>
    ),
    renderBottomToolbarCustomActions: () => {
      const total = labor.reduce((sum, l) => sum + (l.finalValue || 0), 0);
      return (
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            TOTAL MANOPERĂ: {total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
          </Typography>
        </Box>
      );
    },
  });

  if (!devizLine) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5">Devize - {devizLine.code}</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {projectName} | {devizLine.description}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)}>
            <Tab label="Lista Necesar Materiale Proiect" />
            <Tab label="Manoperă Proiect" />
          </Tabs>
        </Box>

        {tabIndex === 0 && (
          <Box>
            <MaterialReactTable table={materialsTable} />
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <MaterialReactTable table={laborTable} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Anulează
        </Button>
        <Button
          onClick={() => {
            onSave(materials, labor);
            onClose();
          }}
          variant="contained"
        >
          Salvează Devize
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevizeModal;
