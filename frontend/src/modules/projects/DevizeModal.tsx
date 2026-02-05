import React, { useState, useMemo, useEffect } from 'react';
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
  TextField,
  Paper,
  Tooltip,
  InputAdornment,
  Alert,
  Chip,
  Checkbox,
  Divider,
  alpha,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import DiscountRoundedIcon from '@mui/icons-material/DiscountRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import type { ProjectDevizLine } from '../../api/projectDeviz';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import * as XLSX from 'xlsx';
import { fetchUniqueMaterials, type Material } from '../../api/materials';

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
  supplier?: string; // Furnizor
  packageSize?: number | null; // Mărime pachet (ex: 25 kg/buc)
  packageUnit?: string; // Unitate pachet (ex: kg, buc)
  markupUsesStandard?: boolean;
  discountUsesStandard?: boolean;
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
  markupUsesStandard?: boolean;
  discountUsesStandard?: boolean;
};

interface DevizeModalProps {
  open: boolean;
  devizLine: ProjectDevizLine | null;
  projectName: string;
  standardMarkup: number;
  standardDiscount: number;
  standardIndirectCosts?: number;
  onClose: () => void;
  onSave: (materials: MaterialItem[], labor: LaborItem[]) => void;
  initialMaterials?: MaterialItem[]; // optional seed from ProjectSheet
  initialLabor?: LaborItem[]; // optional seed from ProjectSheet
  onUpdateParameters?: (p: { standardMarkup: number; standardDiscount: number; indirectCosts: number }) => void;
}

const DevizeModal: React.FC<DevizeModalProps> = ({
  open,
  devizLine,
  projectName,
  standardMarkup,
  standardDiscount,
  standardIndirectCosts,
  onClose,
  onSave,
  initialMaterials,
  initialLabor,
  onUpdateParameters,
}) => {
  const confirm = useConfirm();
  const [tabIndex, setTabIndex] = useState(0);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [labor, setLabor] = useState<LaborItem[]>([]);
  const [materialsByCode, setMaterialsByCode] = useState<Map<string, Material>>(new Map());
  const [materialsByDesc, setMaterialsByDesc] = useState<Map<string, Material>>(new Map());
  // Financial parameters moved into Devize
  const [stdMarkup, setStdMarkup] = useState<number>(standardMarkup || 0);
  const [stdDiscount, setStdDiscount] = useState<number>(standardDiscount || 0);
  const [stdIndirect, setStdIndirect] = useState<number>(standardIndirectCosts || 0);
  const debugDevize = import.meta.env.DEV;

  // Sync incoming props when Devize opens
  useEffect(() => {
    if (!open) return;
    setStdMarkup(standardMarkup || 0);
    setStdDiscount(standardDiscount || 0);
    setStdIndirect(standardIndirectCosts || 0);
  }, [open, standardMarkup, standardDiscount, standardIndirectCosts]);

  // Load materials index for autocomplete when modal opens
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!open) return;
      try {
        const list = await fetchUniqueMaterials();
        if (cancelled) return;
        const byCode = new Map<string, Material>();
        const byDesc = new Map<string, Material>();
        for (const m of list) {
          const codeKey = (m.code || '').trim().toUpperCase();
          const descKey = (m.description || '').trim().toUpperCase();
          
          // For materials with same code, prefer most recent purchase date
          if (codeKey) {
            const existing = byCode.get(codeKey);
            if (!existing || (m.purchaseDate && (!existing.purchaseDate || new Date(m.purchaseDate) > new Date(existing.purchaseDate)))) {
              byCode.set(codeKey, m);
            }
          }
          
          // For descriptions, only set if not already present (first wins)
          if (descKey && !byDesc.has(descKey)) byDesc.set(descKey, m);
        }
        setMaterialsByCode(byCode);
        setMaterialsByDesc(byDesc);
      } catch (e) {
        console.warn('Failed to load materials for autocomplete', e);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Helper function to calculate values - takes standard values as params to avoid stale closures
  const calculateMaterialValues = (
    item: Partial<MaterialItem>,
    standardMarkupValue: number = stdMarkup,
    standardDiscountValue: number = stdDiscount
  ): Partial<MaterialItem> => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const baseValue = qty * price;
    const usesStdMarkup = item.markupUsesStandard ?? true;
    const usesStdDiscount = item.discountUsesStandard ?? true;
    const markupValue = usesStdMarkup
      ? standardMarkupValue
      : (item.markupPercent ?? standardMarkupValue);
    const discountValue = usesStdDiscount
      ? standardDiscountValue
      : (item.discountPercent ?? standardDiscountValue);
  const valueWithMarkup = baseValue * (1 + (markupValue || 0) / 100);
    const finalValue = valueWithMarkup * (1 - (discountValue || 0) / 100);

    return {
      ...item,
      baseValue,
      markupPercent: markupValue,
      valueWithMarkup,
      discountPercent: discountValue,
      finalValue,
    };
  };

  // Seed materials when parent provides initial list
  React.useEffect(() => {
    if (!open) return;
    
    if (!initialMaterials || initialMaterials.length === 0) {
      setMaterials([]);
      return;
    }
    
    // Ensure order numbers and totals are consistent
    const seeded = initialMaterials
      .map((m, idx) => ({
        ...m,
        orderNum: idx + 1,
      }))
      .map((m) => {
        // Default to using standard values unless explicitly set to false
        // This ensures items follow the standard percentage when reopened
        const usesStdMarkup = m.markupUsesStandard !== false;
        const usesStdDiscount = m.discountUsesStandard !== false;
        
        // If using standard, update the percent values to current standard
        const materialWithStandards: MaterialItem = {
          ...m,
          markupPercent: usesStdMarkup ? stdMarkup : m.markupPercent,
          discountPercent: usesStdDiscount ? stdDiscount : m.discountPercent,
        };
        
        const calculated = calculateMaterialValues(materialWithStandards, stdMarkup, stdDiscount) as MaterialItem;
        return {
          ...calculated,
          markupUsesStandard: usesStdMarkup,
          discountUsesStandard: usesStdDiscount,
        };
      });
    
    setMaterials(seeded);
  }, [open, initialMaterials]);

  // Seed labor when parent provides initial list
  React.useEffect(() => {
    if (!open) return;
    if (!initialLabor || initialLabor.length === 0) {
      if (!open) setLabor([]);
      return;
    }
    
    // Ensure order numbers and totals are consistent
    const seeded = initialLabor
      .map((l, idx) => ({
        ...l,
        orderNum: idx + 1,
      }))
      .map((l) => {
        // Default to using standard values unless explicitly set to false
        // This ensures items follow the standard percentage when reopened
        const usesStdMarkup = l.markupUsesStandard !== false;
        const usesStdDiscount = l.discountUsesStandard !== false;
        
        // If using standard, update the percent values to current standard
        const laborWithStandards: LaborItem = {
          ...l,
          markupPercent: usesStdMarkup ? stdMarkup : l.markupPercent,
          discountPercent: usesStdDiscount ? stdDiscount : l.discountPercent,
        };
        
        const calculated = calculateLaborValues(laborWithStandards, stdMarkup, stdDiscount) as LaborItem;
        return {
          ...calculated,
          markupUsesStandard: usesStdMarkup,
          discountUsesStandard: usesStdDiscount,
        };
      });
    
    setLabor(seeded);
  }, [open, initialLabor]);

  const calculateLaborValues = (
    item: Partial<LaborItem>,
    standardMarkupValue: number = stdMarkup,
    standardDiscountValue: number = stdDiscount
  ): Partial<LaborItem> => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const baseValue = qty * price;
    const usesStdMarkup = item.markupUsesStandard ?? true;
    const usesStdDiscount = item.discountUsesStandard ?? true;
    const markupValue = usesStdMarkup
      ? standardMarkupValue
      : (item.markupPercent ?? standardMarkupValue);
    const discountValue = usesStdDiscount
      ? standardDiscountValue
      : (item.discountPercent ?? standardDiscountValue);
    const valueWithMarkup = baseValue * (1 + (markupValue || 0) / 100);
    const finalValue = valueWithMarkup * (1 - (discountValue || 0) / 100);

    return {
      ...item,
      baseValue,
      markupPercent: markupValue,
      valueWithMarkup,
      discountPercent: discountValue,
      finalValue,
    };
  };

  useEffect(() => {
    if (!debugDevize) return;
    console.groupCollapsed('[Devize] Standard change');
    console.log('stdMarkup', stdMarkup, 'stdDiscount', stdDiscount);
    console.table(
      materials.map((m) => ({
        id: m.id,
        code: m.materialCode,
        markup: m.markupPercent,
        inheritsMarkup: m.markupUsesStandard,
        discount: m.discountPercent,
        inheritsDiscount: m.discountUsesStandard,
      })),
    );
    console.table(
      labor.map((l) => ({
        id: l.id,
        description: l.laborDescription,
        markup: l.markupPercent,
        inheritsMarkup: l.markupUsesStandard,
        discount: l.discountPercent,
        inheritsDiscount: l.discountUsesStandard,
      })),
    );
    console.groupEnd();
  }, [stdMarkup, stdDiscount, materials, labor, debugDevize]);

  const materialsView = useMemo(() =>
    materials.map((m) => {
      const updated: MaterialItem = {
        ...m,
        markupUsesStandard: m.markupUsesStandard ?? true,
        discountUsesStandard: m.discountUsesStandard ?? true,
        markupPercent: (m.markupUsesStandard ?? true) ? stdMarkup : m.markupPercent,
        discountPercent: (m.discountUsesStandard ?? true) ? stdDiscount : m.discountPercent,
      };
      return calculateMaterialValues(updated, stdMarkup, stdDiscount) as MaterialItem;
    }),
    [materials, stdMarkup, stdDiscount]);

  const laborView = useMemo(() =>
    labor.map((l) => {
      const updated: LaborItem = {
        ...l,
        markupUsesStandard: l.markupUsesStandard ?? true,
        discountUsesStandard: l.discountUsesStandard ?? true,
        markupPercent: (l.markupUsesStandard ?? true) ? stdMarkup : l.markupPercent,
        discountPercent: (l.discountUsesStandard ?? true) ? stdDiscount : l.discountPercent,
      };
      return calculateLaborValues(updated, stdMarkup, stdDiscount) as LaborItem;
    }),
    [labor, stdMarkup, stdDiscount]);

  // Bubble parameter updates to parent
  useEffect(() => {
    onUpdateParameters?.({ standardMarkup: stdMarkup, standardDiscount: stdDiscount, indirectCosts: stdIndirect });
  }, [stdMarkup, stdDiscount, stdIndirect, onUpdateParameters]);

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
      markupPercent: stdMarkup,
      valueWithMarkup: null,
      discountPercent: stdDiscount,
      finalValue: null,
      supplier: '',
      packageSize: null,
      packageUnit: '',
      markupUsesStandard: true,
      discountUsesStandard: true,
    };
    setMaterials([...materials, newMaterial]);
  };

  const handleUpdateMaterial = (id: string, updates: Partial<MaterialItem>) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const updated: MaterialItem = { ...m, ...updates };

        const hasMarkupStandardUpdate = Object.prototype.hasOwnProperty.call(updates, 'markupUsesStandard');
        const hasDiscountStandardUpdate = Object.prototype.hasOwnProperty.call(updates, 'discountUsesStandard');
        const hasMarkupPercentUpdate = Object.prototype.hasOwnProperty.call(updates, 'markupPercent');
        const hasDiscountPercentUpdate = Object.prototype.hasOwnProperty.call(updates, 'discountPercent');

        if (hasMarkupStandardUpdate) {
          const usesStandard = Boolean(updates.markupUsesStandard);
          updated.markupUsesStandard = usesStandard;
          if (usesStandard) updated.markupPercent = stdMarkup;
        }
        if (hasDiscountStandardUpdate) {
          const usesStandard = Boolean(updates.discountUsesStandard);
          updated.discountUsesStandard = usesStandard;
          if (usesStandard) updated.discountPercent = stdDiscount;
        }

        if (hasMarkupPercentUpdate && !hasMarkupStandardUpdate) {
          const val = updates.markupPercent as number | null | undefined;
          const usesStandard = val == null || val === stdMarkup;
          updated.markupUsesStandard = usesStandard;
          updated.markupPercent = usesStandard ? stdMarkup : (val != null ? Number(val) : null);
        }
        if (hasDiscountPercentUpdate && !hasDiscountStandardUpdate) {
          const val = updates.discountPercent as number | null | undefined;
          const usesStandard = val == null || val === stdDiscount;
          updated.discountUsesStandard = usesStandard;
          updated.discountPercent = usesStandard ? stdDiscount : (val != null ? Number(val) : null);
        }

        const calculated = calculateMaterialValues(updated, stdMarkup, stdDiscount) as MaterialItem;
        return {
          ...calculated,
          markupUsesStandard: updated.markupUsesStandard ?? m.markupUsesStandard ?? true,
          discountUsesStandard: updated.discountUsesStandard ?? m.discountUsesStandard ?? true,
        };
      }
      return m;
    }));
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
      markupPercent: stdMarkup,
      valueWithMarkup: null,
      discountPercent: stdDiscount,
      finalValue: null,
      markupUsesStandard: true,
      discountUsesStandard: true,
    };
    setLabor([...labor, newLabor]);
  };

  const handleUpdateLabor = (id: string, updates: Partial<LaborItem>) => {
    setLabor(prev => prev.map(l => {
      if (l.id === id) {
        const updated: LaborItem = { ...l, ...updates };
        const hasMarkupStandardUpdate = Object.prototype.hasOwnProperty.call(updates, 'markupUsesStandard');
        const hasDiscountStandardUpdate = Object.prototype.hasOwnProperty.call(updates, 'discountUsesStandard');
        const hasMarkupPercentUpdate = Object.prototype.hasOwnProperty.call(updates, 'markupPercent');
        const hasDiscountPercentUpdate = Object.prototype.hasOwnProperty.call(updates, 'discountPercent');

        if (hasMarkupStandardUpdate) {
          const usesStandard = Boolean(updates.markupUsesStandard);
          updated.markupUsesStandard = usesStandard;
          if (usesStandard) updated.markupPercent = stdMarkup;
        }
        if (hasDiscountStandardUpdate) {
          const usesStandard = Boolean(updates.discountUsesStandard);
          updated.discountUsesStandard = usesStandard;
          if (usesStandard) updated.discountPercent = stdDiscount;
        }
        if (hasMarkupPercentUpdate && !hasMarkupStandardUpdate) {
          const val = updates.markupPercent as number | null | undefined;
          const usesStandard = val == null || val === stdMarkup;
          updated.markupUsesStandard = usesStandard;
          updated.markupPercent = usesStandard ? stdMarkup : (val != null ? Number(val) : null);
        }
        if (hasDiscountPercentUpdate && !hasDiscountStandardUpdate) {
          const val = updates.discountPercent as number | null | undefined;
          const usesStandard = val == null || val === stdDiscount;
          updated.discountUsesStandard = usesStandard;
          updated.discountPercent = usesStandard ? stdDiscount : (val != null ? Number(val) : null);
        }
        const calculated = calculateLaborValues(updated, stdMarkup, stdDiscount) as LaborItem;
        return {
          ...calculated,
          markupUsesStandard: updated.markupUsesStandard ?? l.markupUsesStandard ?? true,
          discountUsesStandard: updated.discountUsesStandard ?? l.discountUsesStandard ?? true,
        };
      }
      return l;
    }));
  };

  const handleDeleteLabor = (id: string) => {
    (async () => {
      const ok = await confirm({
        title: 'Ștergere manoperă',
        description: 'Ești sigur că vrei să ștergi această linie de manoperă? Operația nu poate fi anulată.',
        confirmText: 'Șterge',
        cancelText: 'Anulează',
        danger: true,
      });
      if (ok) setLabor(prev => prev.filter(l => l.id !== id));
    })();
  };

  // Generate "Necesar Aprovizionare" document
  const handleGenerateNecesarAprovizionare = () => {
    if (materials.length === 0) {
      alert('Nu există materiale pentru a genera documentul.');
      return;
    }

    // Create worksheet data
    const wsData: any[][] = [];
    
    // Header rows
    wsData.push(['NECESAR APROVIZIONARE']);
    wsData.push([`Proiect: ${projectName}`]);
    wsData.push([`Operație: ${devizLine?.code} - ${devizLine?.description}`]);
    wsData.push([`Data: ${new Date().toLocaleDateString('ro-RO')}`]);
    wsData.push([]); // Empty row
    
    // Table headers
    wsData.push([
      'Nr. Crt.',
      'Cod Material',
      'Descriere Material',
      'Furnizor',
      'UM',
      'Cantitate Necesară',
      'Mărime Pachet',
      'Nr. Pachete Necesare',
      'Preț Unitar (LEI)',
      'Valoare Totală (LEI)',
    ]);

    // Material rows
  materialsView.forEach((material, index) => {
      const quantity = material.quantity || 0;
      const packageSize = material.packageSize || 0;
      const packageUnit = material.packageUnit || '';
      
      // Calculate number of packages needed
      let packagesNeeded = '—';
      if (packageSize > 0 && quantity > 0) {
        const calculated = quantity / packageSize;
        packagesNeeded = calculated.toLocaleString('ro-RO', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        });
      }

      // Format package size display
      const packageSizeDisplay = packageSize > 0 
        ? `${packageSize.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${packageUnit || material.unit}`
        : '—';

      wsData.push([
        index + 1,
        material.materialCode || '-',
        material.materialDescription || '-',
        material.supplier || '-',
        material.unit || '-',
        quantity,
        packageSizeDisplay,
        packagesNeeded,
        material.unitPrice || 0,
        material.baseValue || 0,
      ]);
    });

    // Add empty row before totals
    wsData.push([]);

    // Totals section
    wsData.push(['', '', '', '', '', '', '', '', 'TOTAL MATERIALE:', materialsTotal]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Nr. Crt.
      { wch: 12 }, // Cod Material
      { wch: 35 }, // Descriere Material
      { wch: 20 }, // Furnizor
      { wch: 8 },  // UM
      { wch: 15 }, // Cantitate Necesară
      { wch: 15 }, // Mărime Pachet
      { wch: 18 }, // Nr. Pachete Necesare
      { wch: 16 }, // Preț Unitar
      { wch: 18 }, // Valoare Totală
    ];

    // Style the header row (row 6, index 5)
    const headerRowIndex = 6;
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'CCCCCC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Necesar Aprovizionare');

    // Generate filename with date
    const filename = `Necesar_Aprovizionare_${devizLine?.code}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  const handleGenerateManoperaProiect = () => {
    if (labor.length === 0) {
      alert('Nu există manoperă pentru a genera documentul.');
      return;
    }

    // Create worksheet data
    const wsData: any[][] = [];
    
    // Header rows
    wsData.push(['MANOPERĂ PROIECT']);
    wsData.push([`Proiect: ${projectName}`]);
    wsData.push([`Operație: ${devizLine?.code} - ${devizLine?.description}`]);
    wsData.push([`Data: ${new Date().toLocaleDateString('ro-RO')}`]);
    wsData.push([]); // Empty row
    
    // Table headers
    wsData.push([
      'Nr. Crt.',
      'Cod Operație',
      'Descriere Operație',
      'Descriere Manoperă',
      'UM',
      'Cantitate',
      'Preț Unitar (LEI)',
      'Valoare de Bază (LEI)',
      'Adaos (%)',
      'Valoare cu Adaos (LEI)',
      'Discount (%)',
      'Valoare Finală (LEI)',
    ]);

    // Labor rows
  laborView.forEach((item, index) => {
      wsData.push([
        index + 1,
        item.operationCode || '-',
        item.operationDescription || '-',
        item.laborDescription || '-',
        'ore', // Default unit for labor
        item.quantity || 0,
        item.unitPrice || 0,
        item.baseValue || 0,
        item.markupPercent || 0,
        item.valueWithMarkup || 0,
        item.discountPercent || 0,
        item.finalValue || 0,
      ]);
    });

    // Add empty row before totals
    wsData.push([]);

    // Totals section
  const totalBase = laborView.reduce((sum, l) => sum + (l.baseValue || 0), 0);
  const totalWithMarkup = laborView.reduce((sum, l) => sum + (l.valueWithMarkup || 0), 0);
    const totalMarkupAmount = totalWithMarkup - totalBase;
  const totalDiscountAmount = totalWithMarkup - laborView.reduce((sum, l) => sum + (l.finalValue || 0), 0);
    
    wsData.push(['', '', '', '', '', '', '', 'TOTAL BAZĂ:', totalBase]);
    wsData.push(['', '', '', '', '', '', '', `Adaos Mediu (${stdMarkup}%):`, totalMarkupAmount]);
    wsData.push(['', '', '', '', '', '', '', `Discount Mediu (${stdDiscount}%):`, -totalDiscountAmount]);
    wsData.push(['', '', '', '', '', '', '', 'TOTAL MANOPERĂ:', laborTotal]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Nr. Crt.
      { wch: 12 }, // Cod Operație
      { wch: 30 }, // Descriere Operație
      { wch: 35 }, // Descriere Manoperă
      { wch: 8 },  // UM
      { wch: 12 }, // Cantitate
      { wch: 16 }, // Preț Unitar
      { wch: 18 }, // Valoare de Bază
      { wch: 12 }, // Adaos (%)
      { wch: 18 }, // Valoare cu Adaos
      { wch: 12 }, // Discount (%)
      { wch: 18 }, // Valoare Finală
    ];

    // Style the header row (row 6, index 5)
    const headerRowIndex = 6;
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'CCCCCC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Manoperă Proiect');

    // Generate filename with date
    const filename = `Manopera_Proiect_${devizLine?.code}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  // Totals
  const materialsTotal = useMemo(() => materialsView.reduce((sum, m) => sum + (m.finalValue || 0), 0), [materialsView]);
  const laborTotal = useMemo(() => laborView.reduce((sum, l) => sum + (l.finalValue || 0), 0), [laborView]);
  const indirectAmount = useMemo(() => ((materialsTotal + laborTotal) * (stdIndirect || 0)) / 100, [materialsTotal, laborTotal, stdIndirect]);
  const grandTotal = useMemo(() => materialsTotal + laborTotal + indirectAmount, [materialsTotal, laborTotal, indirectAmount]);

  // Materials Table Columns - Compact design
  const materialsColumns = useMemo<MRT_ColumnDef<MaterialItem>[]>(
    () => [
      {
        id: 'operation',
        header: 'Operație',
        size: 140,
        enableEditing: false,
        accessorFn: (row) => `${row.operationCode} - ${row.operationDescription}`,
        Cell: ({ row }) => (
          <Tooltip title={row.original.operationDescription} arrow>
            <Box>
              <Typography variant="caption" fontWeight="bold" color="primary.main">
                {row.original.operationCode}
              </Typography>
              <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 120 }}>
                {row.original.operationDescription}
              </Typography>
            </Box>
          </Tooltip>
        ),
      },
      {
        id: 'material',
        header: 'Material',
        size: 180,
        accessorFn: (row) => `${row.materialCode} ${row.materialDescription}`,
        Cell: ({ row }) => (
          <Tooltip title={`${row.original.materialCode} - ${row.original.materialDescription}`} arrow>
            <Box>
              <Typography variant="caption" fontWeight="bold" color="secondary.main">
                {row.original.materialCode || '—'}
              </Typography>
              <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 160 }}>
                {row.original.materialDescription || '—'}
              </Typography>
            </Box>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Furnizor',
        size: 100,
        Cell: ({ cell }) => (
          <Tooltip title={cell.getValue<string>() || ''} arrow>
            <Typography variant="caption" noWrap sx={{ maxWidth: 90 }}>
              {cell.getValue<string>() || '—'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: 'package',
        header: 'Pachet',
        size: 100,
        enableEditing: false,
        Cell: ({ row }) => {
          const pkg = row.original.packageSize;
          const unit = row.original.packageUnit || row.original.unit;
          const qty = row.original.quantity ?? 0;
          const needed = pkg && pkg > 0 && qty > 0 ? (qty / pkg) : null;
          
          if (!pkg) return <Typography variant="caption" color="text.disabled">—</Typography>;
          
          return (
            <Tooltip title={`${pkg} ${unit} per pachet${needed ? ` • ${needed.toFixed(2)} pachete necesare` : ''}`} arrow>
              <Box>
                <Typography variant="caption" fontWeight="medium">
                  {pkg} {unit}
                </Typography>
                {needed != null && (
                  <Typography variant="caption" display="block" color="info.main" fontWeight="bold">
                    ×{needed.toFixed(2)}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        id: 'qtyUnit',
        header: 'Cant.',
        size: 100,
        accessorFn: (row) => row.quantity,
        enableEditing: false,
        Cell: ({ row }) => {
          const qty = row.original.quantity;
          const unit = row.original.packageUnit || row.original.unit || 'buc';
          return (
            <Tooltip
              title={
                `Cantitate: ${qty != null ? qty.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'} ${unit}`
              }
              arrow
            >
              <Box>
                <Typography variant="caption" fontWeight="medium">
                  {qty != null ? qty.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'} {unit}
                </Typography>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Preț',
        size: 80,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          const row = cell.row.original;
          const unit = row.packageUnit || row.unit || 'buc';
          return (
            <Box>
              <Typography variant="caption" fontWeight="medium">
                {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'} LEI
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                / {unit}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'baseValue',
        header: 'Bază',
        size: 90,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" color="text.secondary">
              {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
      {
        id: 'markupCombined',
        header: 'Adaos',
        size: 110,
        enableEditing: false,
        Cell: ({ row }) => {
          const usesStandard = row.original.markupUsesStandard ?? true;
          const value = usesStandard ? stdMarkup : (row.original.markupPercent ?? stdMarkup);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={usesStandard}
                color="success"
                onChange={(e) => {
                  handleUpdateMaterial(
                    row.original.id,
                    e.target.checked
                      ? { markupUsesStandard: true, markupPercent: stdMarkup }
                      : { markupUsesStandard: false },
                  );
                }}
                sx={{ p: 0.25 }}
              />
              {usesStandard ? (
                <Typography variant="body2" color="success.main">
                  {value?.toFixed(1)}%
                </Typography>
              ) : (
                <TextField
                  size="small"
                  type="number"
                  value={row.original.markupPercent ?? ''}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                    handleUpdateMaterial(row.original.id, { markupPercent: newVal ?? 0 });
                  }}
                  inputProps={{ step: 0.1, min: 0, style: { textAlign: 'right', padding: '4px' } }}
                  sx={{ 
                    width: 55,
                    '& .MuiInputBase-input': { fontSize: '0.875rem', fontWeight: 600, color: 'success.main' }
                  }}
                />
              )}
            </Box>
          );
        },
      },
      {
        id: 'discountCombined',
        header: 'Disc.',
        size: 110,
        enableEditing: false,
        Cell: ({ row }) => {
          const usesStandard = row.original.discountUsesStandard ?? true;
          const value = usesStandard ? stdDiscount : (row.original.discountPercent ?? stdDiscount);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={usesStandard}
                color="warning"
                onChange={(e) => {
                  handleUpdateMaterial(
                    row.original.id,
                    e.target.checked
                      ? { discountUsesStandard: true, discountPercent: stdDiscount }
                      : { discountUsesStandard: false },
                  );
                }}
                sx={{ p: 0.25 }}
              />
              {usesStandard ? (
                <Typography variant="body2" color="warning.main">
                  {value?.toFixed(1)}%
                </Typography>
              ) : (
                <TextField
                  size="small"
                  type="number"
                  value={row.original.discountPercent ?? ''}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                    handleUpdateMaterial(row.original.id, { discountPercent: newVal ?? 0 });
                  }}
                  inputProps={{ step: 0.1, min: 0, max: 100, style: { textAlign: 'right', padding: '4px' } }}
                  sx={{ 
                    width: 55,
                    '& .MuiInputBase-input': { fontSize: '0.875rem', fontWeight: 600, color: 'warning.main' }
                  }}
                />
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'finalValue',
        header: 'Total',
        size: 100,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    [stdMarkup, stdDiscount]
  );

  // Labor Table Columns - Compact design
  const laborColumns = useMemo<MRT_ColumnDef<LaborItem>[]>(
    () => [
      {
        id: 'operation',
        header: 'Operație',
        size: 140,
        enableEditing: false,
        accessorFn: (row) => `${row.operationCode} - ${row.operationDescription}`,
        Cell: ({ row }) => (
          <Tooltip title={row.original.operationDescription} arrow>
            <Box>
              <Typography variant="caption" fontWeight="bold" color="primary.main">
                {row.original.operationCode}
              </Typography>
              <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 120 }}>
                {row.original.operationDescription}
              </Typography>
            </Box>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'laborDescription',
        header: 'Descriere Manoperă',
        size: 200,
        Cell: ({ cell }) => (
          <Tooltip title={cell.getValue<string>() || ''} arrow>
            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
              {cell.getValue<string>() || '—'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Cant.',
        size: 80,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
          helperText: 'ore',
          FormHelperTextProps: {
            sx: { mt: 0.25, fontSize: 11, lineHeight: 1, color: 'text.secondary' },
          },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Box>
              <Typography variant="caption" fontWeight="medium">
                {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'} ore
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Preț',
        size: 80,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
          helperText: 'LEI / oră',
          FormHelperTextProps: {
            sx: { mt: 0.25, fontSize: 11, lineHeight: 1, color: 'text.secondary' },
          },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Box>
              <Typography variant="caption" fontWeight="medium">
                {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'} LEI
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                / ore
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'baseValue',
        header: 'Bază',
        size: 90,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" color="text.secondary">
              {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
      {
        id: 'markupCombined',
        header: 'Adaos',
        size: 110,
        enableEditing: false,
        Cell: ({ row }) => {
          const usesStandard = row.original.markupUsesStandard ?? true;
          const value = usesStandard ? stdMarkup : (row.original.markupPercent ?? stdMarkup);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={usesStandard}
                color="success"
                onChange={(e) => {
                  handleUpdateLabor(
                    row.original.id,
                    e.target.checked
                      ? { markupUsesStandard: true, markupPercent: stdMarkup }
                      : { markupUsesStandard: false },
                  );
                }}
                sx={{ p: 0.25 }}
              />
              {usesStandard ? (
                <Typography variant="body2" color="success.main">
                  {value?.toFixed(1)}%
                </Typography>
              ) : (
                <TextField
                  size="small"
                  type="number"
                  value={row.original.markupPercent ?? ''}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                    handleUpdateLabor(row.original.id, { markupPercent: newVal ?? 0 });
                  }}
                  inputProps={{ step: 0.1, min: 0, style: { textAlign: 'right', padding: '4px' } }}
                  sx={{ 
                    width: 55,
                    '& .MuiInputBase-input': { fontSize: '0.875rem', fontWeight: 600, color: 'success.main' }
                  }}
                />
              )}
            </Box>
          );
        },
      },
      {
        id: 'discountCombined',
        header: 'Disc.',
        size: 110,
        enableEditing: false,
        Cell: ({ row }) => {
          const usesStandard = row.original.discountUsesStandard ?? true;
          const value = usesStandard ? stdDiscount : (row.original.discountPercent ?? stdDiscount);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={usesStandard}
                color="warning"
                onChange={(e) => {
                  handleUpdateLabor(
                    row.original.id,
                    e.target.checked
                      ? { discountUsesStandard: true, discountPercent: stdDiscount }
                      : { discountUsesStandard: false },
                  );
                }}
                sx={{ p: 0.25 }}
              />
              {usesStandard ? (
                <Typography variant="body2" color="warning.main">
                  {value?.toFixed(1)}%
                </Typography>
              ) : (
                <TextField
                  size="small"
                  type="number"
                  value={row.original.discountPercent ?? ''}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                    handleUpdateLabor(row.original.id, { discountPercent: newVal ?? 0 });
                  }}
                  inputProps={{ step: 0.1, min: 0, max: 100, style: { textAlign: 'right', padding: '4px' } }}
                  sx={{ 
                    width: 55,
                    '& .MuiInputBase-input': { fontSize: '0.875rem', fontWeight: 600, color: 'warning.main' }
                  }}
                />
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'finalValue',
        header: 'Total',
        size: 100,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {val != null ? val.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    [stdMarkup, stdDiscount]
  );

  const materialsTable = useMaterialReactTable({
    columns: materialsColumns,
    data: materialsView,
    getRowId: (row) => row.id,
    localization: tableLocalization,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: false,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: 'compact',
    },
    muiEditTextFieldProps: ({ column, row }) => ({
      onBlur: (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        const numericCols = ['quantity', 'unitPrice', 'markupPercent', 'discountPercent', 'packageSize'];
        const basePatch: any = {
          [column.id]: numericCols.includes(column.id)
            ? (value ? parseFloat(value) : null)
            : value,
        };

        // If user edited code/description, merge auto-fill into the same update to avoid UI flicker
        if (column.id === 'materialCode' || column.id === 'materialDescription') {
          const key = (value ?? '').toString().trim().toUpperCase();
          let src: Material | undefined;
          if (column.id === 'materialCode') src = materialsByCode.get(key);
          else src = materialsByDesc.get(key);
          if (src) {
            const current = row.original;
            const autofillPatch: Partial<MaterialItem> = {};
            // Identification (normalize what user typed)
            if (column.id === 'materialCode') autofillPatch.materialCode = src.code || current.materialCode;
            if (column.id === 'materialDescription') autofillPatch.materialDescription = src.description || current.materialDescription;
            // Supplier
            if (!current.supplier) autofillPatch.supplier = src.supplierName || '';
            // Packaging
            if (current.packageSize == null || Number(current.packageSize) <= 0) {
              autofillPatch.packageSize = src.packQuantity != null ? Number(src.packQuantity) : null;
            }
            if (!current.packageUnit || !current.packageUnit.trim()) {
              autofillPatch.packageUnit = src.packUnit || '';
            }
            // Unit: Use packUnit if available (for quantity measurement), otherwise base unit
            if (!current.unit || !current.unit.trim()) {
              // If material has packaging info, use packUnit for quantity measurement
              if (src.packUnit && src.packUnit.trim()) {
                autofillPatch.unit = src.packUnit.toLowerCase();
              } else {
                autofillPatch.unit = src.unit || current.unit;
              }
            }
            // Price
            if (current.unitPrice == null && src.price != null) {
              autofillPatch.unitPrice = Number(src.price);
            }
            Object.assign(basePatch, autofillPatch);
          }
        }

        handleUpdateMaterial(row.original.id, basePatch);
      },
    }),
    renderTopToolbarCustomActions: () => (
      <Tooltip title="Generează document Necesar Aprovizionare (Excel)" arrow>
        <Button
          variant="outlined"
          size="small"
          color="success"
          startIcon={<DescriptionRoundedIcon />}
          onClick={handleGenerateNecesarAprovizionare}
          disabled={materials.length === 0}
        >
          Necesar Aprovizionare
        </Button>
      </Tooltip>
    ),
    renderBottomToolbarCustomActions: () => {
      const total = materialsTotal;
      const customMarkupCount = materialsView.filter(m => !(m.markupUsesStandard ?? true)).length;
      const customDiscountCount = materialsView.filter(m => !(m.discountUsesStandard ?? true)).length;
      const baseTotal = materialsView.reduce((sum, m) => sum + (m.baseValue || 0), 0);
      
      return (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }} flexWrap="wrap">
          <Chip 
            size="small" 
            label={`${materials.length} materiale`} 
            variant="outlined"
          />
          {customMarkupCount > 0 && (
            <Chip 
              size="small" 
              label={`${customMarkupCount} adaos custom`} 
              color="success"
              variant="outlined"
            />
          )}
          {customDiscountCount > 0 && (
            <Chip 
              size="small" 
              label={`${customDiscountCount} discount custom`} 
              color="warning"
              variant="outlined"
            />
          )}
          <Divider orientation="vertical" flexItem />
          <Typography variant="caption" color="text.secondary">
            Bază: {baseTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            TOTAL: {total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
          </Typography>
        </Stack>
      );
    },
  });

  const laborTable = useMaterialReactTable({
    columns: laborColumns,
    data: laborView,
    getRowId: (row) => row.id,
    localization: tableLocalization,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: false, // No action column for auto-aggregated labor
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
    renderTopToolbarCustomActions: () => (
      <Tooltip title="Generează document Manoperă Proiect (Excel)" arrow>
        <Button
          variant="outlined"
          size="small"
          color="success"
          startIcon={<DescriptionRoundedIcon />}
          onClick={handleGenerateManoperaProiect}
          disabled={labor.length === 0}
        >
          Manoperă Proiect
        </Button>
      </Tooltip>
    ),
    renderBottomToolbarCustomActions: () => {
      const total = laborTotal;
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5">Devize - {devizLine.code}</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {projectName} | {devizLine.description}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Materiale: ${materialsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} size="small" color="default" />
            <Chip label={`Manoperă: ${laborTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} size="small" color="default" />
            {stdIndirect > 0 && (
              <Chip label={`Indirecte (${stdIndirect}%): ${indirectAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} size="small" color="info" />
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Financial Parameters inside Devize - UPGRADED UI */}
        <Paper 
          elevation={0} 
          sx={(theme) => ({ 
            p: 3, 
            mb: 3, 
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)}, ${alpha(theme.palette.primary.main, 0.01)})`,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          })}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
            <Box 
              sx={(theme) => ({
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              })}
            >
              <SettingsRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="primary">
                Parametri Financiari
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configurare adaos, discount și cheltuieli indirecte
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            {/* Adaos Standard */}
            <Box sx={{ flex: 1 }}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 2,
                  border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.04),
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.success.main, 0.4),
                    boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.15)}`,
                  },
                })}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={(theme) => ({
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.main,
                      })}
                    >
                      <TrendingUpRoundedIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="success.dark">
                        Adaos Standard
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Marjă profit adăugată
                      </Typography>
                    </Box>
                  </Stack>
                  <TextField
                    fullWidth
                    size="medium"
                    type="number"
                    value={stdMarkup}
                    onChange={(e) => setStdMarkup(parseFloat(e.target.value) || 0)}
                    inputProps={{ step: '0.5', min: '0', max: '100' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TrendingUpRoundedIcon sx={{ color: 'success.main', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip 
                            label="%" 
                            size="small" 
                            color="success" 
                            sx={{ fontWeight: 700, minWidth: 36 }}
                          />
                        </InputAdornment>
                      ),
                      sx: { 
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        '& input': { textAlign: 'center' }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'success.main',
                          },
                        },
                      },
                    }}
                  />
                  <Alert 
                    severity="success" 
                    icon={<InfoOutlinedIcon fontSize="small" />}
                    sx={{ 
                      py: 0.5,
                      '& .MuiAlert-message': { fontSize: '0.75rem' }
                    }}
                  >
                    Se aplică tuturor liniilor; poate fi personalizat per linie
                  </Alert>
                </Stack>
              </Paper>
            </Box>

            {/* Discount Standard */}
            <Box sx={{ flex: 1 }}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 2,
                  border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  bgcolor: alpha(theme.palette.warning.main, 0.04),
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.warning.main, 0.4),
                    boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.15)}`,
                  },
                })}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={(theme) => ({
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.warning.main, 0.15),
                        color: theme.palette.warning.main,
                      })}
                    >
                      <DiscountRoundedIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                        Discount Standard
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Reducere aplicată clientului
                      </Typography>
                    </Box>
                  </Stack>
                  <TextField
                    fullWidth
                    size="medium"
                    type="number"
                    value={stdDiscount}
                    onChange={(e) => setStdDiscount(parseFloat(e.target.value) || 0)}
                    inputProps={{ step: '0.5', min: '0', max: '100' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DiscountRoundedIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip 
                            label="%" 
                            size="small" 
                            color="warning" 
                            sx={{ fontWeight: 700, minWidth: 36 }}
                          />
                        </InputAdornment>
                      ),
                      sx: { 
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        '& input': { textAlign: 'center' }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'warning.main',
                          },
                        },
                      },
                    }}
                  />
                  <Alert 
                    severity="warning" 
                    icon={<InfoOutlinedIcon fontSize="small" />}
                    sx={{ 
                      py: 0.5,
                      '& .MuiAlert-message': { fontSize: '0.75rem' }
                    }}
                  >
                    Se aplică după adaos; poate fi personalizat per linie
                  </Alert>
                </Stack>
              </Paper>
            </Box>

            {/* Cheltuieli Indirecte */}
            <Box sx={{ flex: 1 }}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 2,
                  border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  bgcolor: alpha(theme.palette.info.main, 0.04),
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.info.main, 0.4),
                    boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.15)}`,
                  },
                })}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={(theme) => ({
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.info.main, 0.15),
                        color: theme.palette.info.main,
                      })}
                    >
                      <AccountBalanceRoundedIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="info.dark">
                        Cheltuieli Indirecte
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Costuri suplimentare (general)
                      </Typography>
                    </Box>
                  </Stack>
                  <TextField
                    fullWidth
                    size="medium"
                    type="number"
                    value={stdIndirect}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const normalized = raw.replace(/^0+(?=\d)/, "");
                      const parsed = Number(normalized);
                      setStdIndirect(Number.isFinite(parsed) ? parsed : 0);
                    }}
                    inputProps={{ step: '0.5', min: '0', max: '100' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountBalanceRoundedIcon sx={{ color: 'info.main', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Chip 
                            label="%" 
                            size="small" 
                            color="info" 
                            sx={{ fontWeight: 700, minWidth: 36 }}
                          />
                        </InputAdornment>
                      ),
                      sx: { 
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        '& input': { textAlign: 'center' }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'info.main',
                          },
                        },
                      },
                    }}
                  />
                  <Alert 
                    severity="info" 
                    icon={<InfoOutlinedIcon fontSize="small" />}
                    sx={{ 
                      py: 0.5,
                      '& .MuiAlert-message': { fontSize: '0.75rem' }
                    }}
                  >
                    Aplicat la totalul (materiale + manoperă)
                  </Alert>
                </Stack>
              </Paper>
            </Box>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* Real-time Impact Summary */}
          <Box 
            sx={(theme) => ({ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            })}
          >
            <Stack direction="row" spacing={3} alignItems="center" justifyContent="center" flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Impact Adaos:
                </Typography>
                <Chip 
                  label={`+${((materialsTotal + laborTotal) * stdMarkup / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Impact Discount:
                </Typography>
                <Chip 
                  label={`-${(((materialsTotal + laborTotal) * (1 + stdMarkup / 100)) * stdDiscount / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`}
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Impact Indirecte:
                </Typography>
                <Chip 
                  label={`+${indirectAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`}
                  size="small"
                  color="info"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Stack>
          </Box>
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)}>
            <Tab label="Lista Necesar Materiale Proiect" />
            <Tab label="Manoperă Proiect" />
          </Tabs>
        </Box>

        {tabIndex === 0 && (
          <Box>
            {materials.length === 0 ? (
              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 1, mb: 2 }}>
                Nu există materiale în listă. Folosește butonul „Adaugă Material” pentru a începe.
              </Alert>
            ) : null}
            <MaterialReactTable key={`mat-${stdMarkup}-${stdDiscount}`} table={materialsTable} />
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            {labor.length === 0 ? (
              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 1, mb: 2 }}>
                Nu există linii de manoperă. Folosește butonul „Adaugă Manoperă” pentru a adăuga.
              </Alert>
            ) : null}
            <MaterialReactTable key={`lab-${stdMarkup}-${stdDiscount}`} table={laborTable} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ flex: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`Total materiale: ${materialsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} />
              <Chip size="small" label={`Total manoperă: ${laborTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} />
              {stdIndirect > 0 && (
                <Chip size="small" color="info" label={`Indirecte ${stdIndirect}%: ${indirectAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} />
              )}
              <Chip size="small" color="success" label={`Total general: ${grandTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI`} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose} variant="outlined">Anulează</Button>
            <Button
              onClick={() => {
                onSave(materialsView, laborView);
                onClose();
              }}
              variant="contained"
            >
              Salvează Devize
            </Button>
          </Stack>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default DevizeModal;






