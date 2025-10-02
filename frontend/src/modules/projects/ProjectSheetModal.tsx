import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import type { ProjectDevizLine } from '../../api/projectDeviz';
import SelectOperationModal from './SelectOperationModal';
import DevizeModal, { type MaterialItem, type LaborItem } from './DevizeModal';

export type ProjectSheetData = {
  id?: string;
  projectId: string;
  devizLineId: string;
  initiationDate?: Date | null;
  estimatedStartDate?: Date | null;
  estimatedEndDate?: Date | null;
  standardMarkupPercent?: number | null;
  standardDiscountPercent?: number | null;
  indirectCostsPercent?: number | null;
  operations: ProjectSheetOperation[];
};

export type ProjectSheetOperation = {
  id: string; // Required for MRT
  orderNum: number;
  operationName: string;
  unit: string;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  notes?: string | null;
};

interface ProjectSheetModalProps {
  open: boolean;
  devizLine: ProjectDevizLine | null;
  projectName: string;
  onClose: () => void;
  onSave: (data: ProjectSheetData) => Promise<void>;
}

const ProjectSheetModal: React.FC<ProjectSheetModalProps> = ({
  open,
  devizLine,
  projectName,
  onClose,
  onSave,
}) => {
  const [initiationDate, setInitiationDate] = useState<Dayjs | null>(null);
  const [estimatedStartDate, setEstimatedStartDate] = useState<Dayjs | null>(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState<Dayjs | null>(null);
  const [standardMarkup, setStandardMarkup] = useState<number>(0);
  const [standardDiscount, setStandardDiscount] = useState<number>(0);
  const [indirectCosts, setIndirectCosts] = useState<number>(0);
  const [operations, setOperations] = useState<ProjectSheetOperation[]>([]);
  const [showSelectOperation, setShowSelectOperation] = useState(false);
  const [editingOperation, setEditingOperation] = useState<ProjectSheetOperation | null>(null);
  const [showDevize, setShowDevize] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (devizLine) {
      // Reset form when modal opens
      setInitiationDate(null);
      setEstimatedStartDate(null);
      setEstimatedEndDate(null);
      setStandardMarkup(0);
      setStandardDiscount(0);
      setIndirectCosts(0);
      setOperations([]);
    }
  }, [devizLine]);

  const handleAddOperation = (item: { name: string; unit: string; categoryName: string; operationName: string }) => {
    const newOrderNum = operations.length > 0 ? Math.max(...operations.map(op => op.orderNum)) + 1 : 1;
    const newId = `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setOperations([
      ...operations,
      {
        id: newId,
        orderNum: newOrderNum,
        operationName: item.name,
        unit: item.unit,
        quantity: null,
        unitPrice: null,
        totalPrice: null,
        notes: null,
      },
    ]);
  };

  const handleSaveDevize = (materials: MaterialItem[], labor: LaborItem[]) => {
    console.log('Saving devize:', { materials, labor });
    // TODO: Implement devize save logic
  };

  const handleUpdateOperation = (id: string, updates: Partial<ProjectSheetOperation>) => {
    setOperations(prev => prev.map((op) => {
      if (op.id === id) {
        const updated = { ...op, ...updates };
        // Auto-calculate total
        const qty = updates.quantity !== undefined ? updates.quantity : updated.quantity;
        const price = updates.unitPrice !== undefined ? updates.unitPrice : updated.unitPrice;
        if (qty && price) {
          updated.totalPrice = qty * price;
        } else {
          updated.totalPrice = null;
        }
        return updated;
      }
      return op;
    }));
  };

  const handleDeleteOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const handleSave = async () => {
    if (!devizLine) return;

    const data: ProjectSheetData = {
      projectId: devizLine.projectId,
      devizLineId: devizLine.id,
      initiationDate: initiationDate ? initiationDate.toDate() : null,
      estimatedStartDate: estimatedStartDate ? estimatedStartDate.toDate() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toDate() : null,
      standardMarkupPercent: standardMarkup,
      standardDiscountPercent: standardDiscount,
      indirectCostsPercent: indirectCosts,
      operations,
    };

    try {
      setSaving(true);
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save project sheet:', error);
    } finally {
      setSaving(false);
    }
  };

  // Columns for operations table
  const operationsColumns = useMemo<MRT_ColumnDef<ProjectSheetOperation>[]>(
    () => [
      {
        accessorKey: 'orderNum',
        header: 'Nr.',
        size: 60,
        enableEditing: false,
        enableSorting: false,
      },
      {
        accessorKey: 'operationName',
        header: 'Denumire operație',
        size: 250,
        muiEditTextFieldProps: {
          required: true,
          placeholder: 'Ex: Zidărie cărămidă',
        },
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
        muiEditTextFieldProps: {
          required: true,
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Cantitate',
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
        accessorKey: 'unitPrice',
        header: 'Preț unitar',
        size: 120,
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
        accessorKey: 'totalPrice',
        header: 'Total',
        size: 120,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold">
              {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    []
  );

  const operationsTable = useMaterialReactTable({
    columns: operationsColumns,
    data: operations,
    localization: tableLocalization,
    enablePagination: false,
    enableBottomToolbar: true,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: true,
    positionActionsColumn: 'last',
    muiTableContainerProps: {
      sx: { maxHeight: '400px' },
    },
    muiEditTextFieldProps: ({ column, row }) => ({
      onBlur: (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        const rowId = row.original.id;
        const columnId = column.id;

        if (columnId === 'quantity' || columnId === 'unitPrice') {
          handleUpdateOperation(rowId, {
            [columnId]: value ? parseFloat(value) : null,
          });
        } else if (columnId === 'operationName' || columnId === 'unit') {
          handleUpdateOperation(rowId, {
            [columnId]: value,
          });
        }
      },
    }),
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={0.5}>
        <IconButton
          size="small"
          onClick={() => setEditingOperation(row.original)}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDeleteOperation(row.original.id)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          TOTAL OPERAȚII: {operations.reduce((sum, op) => sum + (op.totalPrice || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
        </Typography>
      </Box>
    ),
  });

  if (!devizLine) return null;

  const operationsTotal = operations.reduce((sum, op) => sum + (op.totalPrice || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5" component="div">
                Fișa Proiect
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Proiect: {projectName} | Cod: {devizLine.code} - {devizLine.description}
              </Typography>
            </Box>
            <Stack direction="row" gap={1} alignItems="center">
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => setShowDevize(true)}
              >
                Devize
              </Button>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {/* Project Timeline Section */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Date Proiect
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DatePicker
                label="Data inițiere proiect"
                value={initiationDate}
                onChange={(newValue) => setInitiationDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
              <DatePicker
                label="Data începere proiect (estimativ)"
                value={estimatedStartDate}
                onChange={(newValue) => setEstimatedStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
              <DatePicker
                label="Data finalizare proiect (estimativ)"
                value={estimatedEndDate}
                onChange={(newValue) => setEstimatedEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
            </Stack>
          </Paper>

          {/* Financial Parameters Section */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Parametri Financiari
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Adaos standard %"
                type="number"
                value={standardMarkup}
                onChange={(e) => setStandardMarkup(parseFloat(e.target.value) || 0)}
                inputProps={{ step: '0.1', min: '0' }}
              />
              <TextField
                fullWidth
                size="small"
                label="Discount standard %"
                type="number"
                value={standardDiscount}
                onChange={(e) => setStandardDiscount(parseFloat(e.target.value) || 0)}
                inputProps={{ step: '0.1', min: '0' }}
              />
              <TextField
                fullWidth
                size="small"
                label="Cheltuieli indirecte %"
                type="number"
                value={indirectCosts}
                onChange={(e) => setIndirectCosts(parseFloat(e.target.value) || 0)}
                inputProps={{ step: '0.1', min: '0' }}
              />
            </Stack>
          </Paper>

          {/* Operations Table Section */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} gap={2}>
              <Stack direction="row" alignItems="center" gap={2}>
                <Typography variant="h6" color="primary">
                  Operații
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Total: {operationsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
                </Typography>
              </Stack>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowSelectOperation(true)}
              >
                Adaugă operație
              </Button>
            </Stack>

            <MaterialReactTable table={operationsTable} />
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Anulează
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Se salvează...' : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Select Operation Modal */}
      <SelectOperationModal
        open={showSelectOperation}
        onClose={() => setShowSelectOperation(false)}
        onSelect={handleAddOperation}
      />
      
      {/* Edit Operation Modal */}
      <Dialog open={!!editingOperation} onClose={() => setEditingOperation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Editează Operație</Typography>
            <IconButton onClick={() => setEditingOperation(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Denumire operație"
              value={editingOperation?.operationName || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, operationName: e.target.value } : null)}
            />
            <TextField
              fullWidth
              label="Unitate măsură"
              value={editingOperation?.unit || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, unit: e.target.value } : null)}
            />
            <TextField
              fullWidth
              label="Cantitate"
              type="number"
              value={editingOperation?.quantity || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, quantity: e.target.value ? parseFloat(e.target.value) : null } : null)}
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              fullWidth
              label="Preț unitar"
              type="number"
              value={editingOperation?.unitPrice || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, unitPrice: e.target.value ? parseFloat(e.target.value) : null } : null)}
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              fullWidth
              label="Observații"
              multiline
              rows={3}
              value={editingOperation?.notes || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, notes: e.target.value } : null)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingOperation(null)} variant="outlined">
            Anulează
          </Button>
          <Button 
            onClick={() => {
              if (editingOperation) {
                handleUpdateOperation(editingOperation.id, editingOperation);
                setEditingOperation(null);
              }
            }} 
            variant="contained"
          >
            Salvează
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Devize Modal */}
      <DevizeModal
        open={showDevize}
        devizLine={devizLine}
        projectName={projectName}
        standardMarkup={standardMarkup}
        standardDiscount={standardDiscount}
        onClose={() => setShowDevize(false)}
        onSave={handleSaveDevize}
      />
    </LocalizationProvider>
  );
};

export default ProjectSheetModal;
