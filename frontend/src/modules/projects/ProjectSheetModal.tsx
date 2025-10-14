import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  CircularProgress,
  Tooltip,
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
import { fetchProjectDevizMaterials, saveProjectDevizMaterials } from '../../api/projectDevize';
import { fetchProjectSheet } from '../../api/projectSheet';
import { fetchUniqueMaterials, type Material } from '../../api/materials';
import SelectOperationModal from './SelectOperationModal';
import DevizeModal, { type MaterialItem, type LaborItem } from './DevizeModal';
import * as operationSheetsApi from '../../api/operationSheets';
import type { OperationSheetItemDTO, ProjectOperationSheetDTO } from '../../api/operationSheets';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { FisaOperatieModal } from './FisaOperatieModal';
import dayjs from 'dayjs';

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
  operationItemId?: string; // OperationItem ID for templates (optional for backward compatibility)
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
  const confirm = useConfirm();
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
  const [devizeMaterials, setDevizeMaterials] = useState<MaterialItem[] | null>(null);
  const [devizeLabor, setDevizeLabor] = useState<LaborItem[] | null>(null);
  const [showFisaOperatie, setShowFisaOperatie] = useState(false);
  const [selectedOperationForFisa, setSelectedOperationForFisa] = useState<ProjectSheetOperation | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing project sheet data when modal opens
  useEffect(() => {
    if (open && devizLine) {
      const loadData = async () => {
        try {
          setLoading(true);
          const sheet = await fetchProjectSheet(devizLine.projectId, devizLine.id);
          
          // Populate form with existing data
          setInitiationDate(sheet.initiationDate ? dayjs(sheet.initiationDate) : null);
          setEstimatedStartDate(sheet.estimatedStartDate ? dayjs(sheet.estimatedStartDate) : null);
          setEstimatedEndDate(sheet.estimatedEndDate ? dayjs(sheet.estimatedEndDate) : null);
          setStandardMarkup(sheet.standardMarkupPercent ?? 0);
          setStandardDiscount(sheet.standardDiscountPercent ?? 0);
          setIndirectCosts(sheet.indirectCostsPercent ?? 0);
          setOperations(sheet.operations?.map(op => ({
            ...op,
            id: op.id || `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          })) || []);
        } catch (error: unknown) {
          // If 404, it means no sheet exists yet - that's OK, start fresh
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status !== 404) {
              console.error('Error loading project sheet:', error);
            }
          } else {
            console.error('Unexpected error loading project sheet:', error);
          }
          // Reset to empty state
          setInitiationDate(null);
          setEstimatedStartDate(null);
          setEstimatedEndDate(null);
          setStandardMarkup(0);
          setStandardDiscount(0);
          setIndirectCosts(0);
          setOperations([]);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [open, devizLine]);

  const handleAddOperation = (item: { id: string; name: string; unit: string; categoryName: string; operationName: string }) => {
    const newId = `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setOperations((prev) => [
      ...prev,
      {
        id: newId,
        operationItemId: item.id, // Store the OperationItem ID
        orderNum: prev.length + 1,
        operationName: item.name,
        unit: item.unit,
        quantity: null,
        unitPrice: null,
        totalPrice: null,
        notes: null,
      },
    ]);
  };

  const handleSaveDevize = async (materials: MaterialItem[], labor: LaborItem[]) => {
    if (!devizLine?.projectId || !devizLine?.id) return;
    
    try {
      await saveProjectDevizMaterials(devizLine.projectId, devizLine.id, materials);
    } catch (error) {
      console.error('Failed to save devize materials:', error);
      alert('Eroare la salvare materiale');
    }
  };

  // Load or build materials list for Devize modal
  useEffect(() => {
    const load = async () => {
      if (!showDevize) return;
      if (!devizLine) return;
      if (!devizLine.projectId) return;

      try {
        // First, try to load saved materials from database
        const savedMaterials = await fetchProjectDevizMaterials(devizLine.projectId, devizLine.id);
        
        if (savedMaterials && savedMaterials.length > 0) {
          setDevizeMaterials(savedMaterials);
          return; // Use saved data, don't aggregate
        }
        
        // No saved materials - fetch materials catalog and aggregate from operation sheets
        const allMaterials = await fetchUniqueMaterials();
        const materialsByCode = new Map<string, Material>();
        for (const m of allMaterials) {
          const codeKey = (m.code || '').trim().toUpperCase();
          if (codeKey) {
            const existing = materialsByCode.get(codeKey);
            if (!existing || (m.purchaseDate && (!existing.purchaseDate || new Date(m.purchaseDate) > new Date(existing.purchaseDate)))) {
              materialsByCode.set(codeKey, m);
            }
          }
        }
        
        const ops = operations.filter(op => !!op.operationItemId && (op.quantity || 0) > 0);
        if (ops.length === 0) {
          setDevizeMaterials([]);
          return;
        }

        // Fetch all project operation sheets in parallel
      const sheets: Array<{ opId: string; qty: number; sheet: ProjectOperationSheetDTO | null }> = await Promise.all(
        ops.map(async (op) => {
          try {
            const sheet = await operationSheetsApi.fetchProjectOperationSheet(devizLine.projectId, op.operationItemId!);
            return { opId: op.operationItemId!, qty: op.quantity || 0, sheet };
          } catch (err: any) {
            if (err?.response?.status === 404) {
              return { opId: op.operationItemId!, qty: op.quantity || 0, sheet: null };
            }
            console.error('Failed to fetch operation sheet', op.operationItemId, err);
            return { opId: op.operationItemId!, qty: op.quantity || 0, sheet: null };
          }
        })
      );

      type Agg = {
        key: string;
        materialCode: string;
        materialDescription: string;
        unit: string;
        totalQty: number;
        totalBase: number;
        weightedPriceAccum: number; // sum(price * qty)
        packQuantity?: number | null;
        packUnit?: string | null;
      };
      const map = new Map<string, Agg>();

      type LaborAgg = {
        key: string;
        laborDescription: string;
        totalQty: number;
        totalBase: number;
        weightedPriceAccum: number;
      };
      const laborMap = new Map<string, LaborAgg>();

      const addItem = (item: OperationSheetItemDTO, qtyMultiplier: number) => {
        const perUnitQty = Number(item.quantity || 0);
        const totalQty = perUnitQty * qtyMultiplier;
        if (!Number.isFinite(totalQty) || totalQty <= 0) return;
        const unitPrice = Number(item.unitPrice || 0);
        const base = totalQty * (Number.isFinite(unitPrice) ? unitPrice : 0);
        
        if (item.itemType === 'MATERIAL') {
          const key = item.referenceId || item.code || `${item.description}|${item.unit}`;
          const prev = map.get(key);
          const packQuantity = item.packQuantity ?? null;
          const packUnit = item.packUnit ?? null;
          if (prev) {
            prev.totalQty += totalQty;
            prev.totalBase += base;
            prev.weightedPriceAccum += unitPrice * totalQty;
          } else {
            map.set(key, {
              key,
              materialCode: item.code || '',
              materialDescription: item.description,
              unit: item.unit,
              totalQty,
              totalBase: base,
              weightedPriceAccum: unitPrice * totalQty,
              packQuantity,
              packUnit,
            });
          }
        } else if (item.itemType === 'LABOR') {
          const key = item.description || `labor_${item.id}`;
          const prev = laborMap.get(key);
          if (prev) {
            prev.totalQty += totalQty;
            prev.totalBase += base;
            prev.weightedPriceAccum += unitPrice * totalQty;
          } else {
            laborMap.set(key, {
              key,
              laborDescription: item.description,
              totalQty,
              totalBase: base,
              weightedPriceAccum: unitPrice * totalQty,
            });
          }
        }
      };

      sheets.forEach(({ qty, sheet }) => {
        const items = sheet?.items || [];
        items.forEach((it) => addItem(it, qty));
      });

      const result: MaterialItem[] = Array.from(map.values()).map((agg, idx) => {
        const avgPrice = agg.totalQty > 0 ? agg.weightedPriceAccum / agg.totalQty : 0;
        
        // Look up material from catalog to get supplier and package info
        const codeKey = (agg.materialCode || '').trim().toUpperCase();
        const catalogMaterial = codeKey ? materialsByCode.get(codeKey) : undefined;
        
        const packsText = agg.packQuantity && agg.packQuantity > 0 && agg.packUnit
          ? ` (~${(agg.totalQty / agg.packQuantity).toFixed(2)} x ${agg.packQuantity} ${agg.packUnit})`
          : '';
        return {
          id: `agg_${idx}_${agg.key}`,
          orderNum: idx + 1,
          operationCode: devizLine.code,
          operationDescription: devizLine.description,
          materialCode: agg.materialCode,
          materialDescription: agg.materialDescription + packsText,
          unit: agg.unit,
          quantity: Number(agg.totalQty.toFixed(2)),
          unitPrice: Number(avgPrice.toFixed(4)),
          baseValue: null,
          markupPercent: null,
          valueWithMarkup: null,
          discountPercent: null,
          finalValue: null,
          // Get supplier and package info from materials catalog
          supplier: catalogMaterial?.supplierName || undefined,
          packageSize: catalogMaterial?.packQuantity != null ? Number(catalogMaterial.packQuantity) : null,
          packageUnit: catalogMaterial?.packUnit || undefined,
        } as MaterialItem;
      });

      const laborResult: LaborItem[] = Array.from(laborMap.values()).map((agg, idx) => {
        const avgPrice = agg.totalQty > 0 ? agg.weightedPriceAccum / agg.totalQty : 0;
        return {
          id: `labor_agg_${idx}_${agg.key}`,
          orderNum: idx + 1,
          operationCode: devizLine.code,
          operationDescription: devizLine.description,
          laborDescription: agg.laborDescription,
          quantity: Number(agg.totalQty.toFixed(2)),
          unitPrice: Number(avgPrice.toFixed(4)),
          baseValue: null,
          markupPercent: null,
          valueWithMarkup: null,
          discountPercent: null,
          finalValue: null,
        } as LaborItem;
      });

      setDevizeMaterials(result);
      setDevizeLabor(laborResult);
      } catch (error) {
        console.error('Error loading/building materials:', error);
        setDevizeMaterials([]);
        setDevizeLabor([]);
      }
    };
    load();
  }, [showDevize, devizLine, operations]);

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

  const handleDeleteOperation = async (id: string, operationName: string) => {
    const ok = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi această operație?',
      description: (
        <>
          Operația <strong>{operationName}</strong> va fi ștearsă din fișa de proiect.
        </>
      ),
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    
    if (!ok) return;
    
    setOperations(prev => {
      const filtered = prev.filter(op => op.id !== id);
      // Reindex orderNum to keep 1..n sequence
      return filtered.map((op, idx) => ({ ...op, orderNum: idx + 1 }));
    });
  };

  // Callback for when recipe is calculated in FisaOperatieModal
  const handleRecipeCalculated = useCallback((unitPrice: number) => {
    if (selectedOperationForFisa) {
      handleUpdateOperation(selectedOperationForFisa.id, { unitPrice });
    }
  }, [selectedOperationForFisa]);

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
        header: 'Preț unitar (din rețetă)',
        size: 150,
        enableEditing: false, // Read-only - calculated from recipe
        Cell: ({ cell, row }) => {
          const val = cell.getValue<number | null>();
          const hasRecipe = row.original.operationItemId; // Has recipe if operationItemId exists
          return (
            <Tooltip title={hasRecipe ? "Calculat din Fișa Operație" : "Fără rețetă definită"}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: hasRecipe ? 'success.main' : 'text.secondary',
                  fontStyle: hasRecipe ? 'normal' : 'italic'
                }}
              >
                {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
              </Typography>
            </Tooltip>
          );
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
        <Tooltip 
          title={
            row.original.operationItemId 
              ? "Editează Fișa Operație" 
              : "Fișa Operație disponibilă doar pentru operații din catalog"
          }
        >
          <span>
            <IconButton
              size="small"
              onClick={() => {
                setSelectedOperationForFisa(row.original);
                setShowFisaOperatie(true);
              }}
              disabled={!row.original.operationItemId}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Șterge operație">
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteOperation(row.original.id, row.original.operationName)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
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

          {/* Financial Parameters moved to Devize modal */}

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
            </>
          )}
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
        standardIndirectCosts={indirectCosts}
        initialMaterials={devizeMaterials || []}
        initialLabor={devizeLabor || []}
        onClose={() => setShowDevize(false)}
        onSave={handleSaveDevize}
        onUpdateParameters={({ standardMarkup: m, standardDiscount: d, indirectCosts: i }) => {
          setStandardMarkup(m);
          setStandardDiscount(d);
          setIndirectCosts(i);
        }}
      />

      {/* Fisa Operatie Modal */}
      {showFisaOperatie && selectedOperationForFisa && (
        <FisaOperatieModal
          open={showFisaOperatie}
          onClose={() => {
            // Unmount first to avoid intermediate state flicker
            setShowFisaOperatie(false);
            setSelectedOperationForFisa(null);
          }}
          operationId={selectedOperationForFisa.operationItemId}
          operationName={selectedOperationForFisa.operationName}
          projectId={devizLine?.projectId}
          onRecipeCalculated={handleRecipeCalculated}
        />
      )}
    </LocalizationProvider>
  );
};

export default ProjectSheetModal;
