import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
  Box,
  Stack,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ConstructionIcon from '@mui/icons-material/Construction';
import SaveIcon from '@mui/icons-material/Save';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HistoryIcon from '@mui/icons-material/History';
import { tableLocalization } from '../../localization/tableLocalization';
import { SelectEquipmentModal } from './SelectEquipmentModal';
import { SelectLaborModal } from './SelectLaborModal';
import { SelectMaterialModal } from './SelectMaterialModal';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { useSnackbar } from 'notistack';
import type { Equipment } from '../../api/equipment';
import type { LaborLine } from '../../api/laborLines';
import type { Material } from '../../api/materials';
import * as operationSheetsApi from '../../api/operationSheets';

interface FisaOperatieModalProps {
  open: boolean;
  onClose: () => void;
  operationName: string;
  operationId?: string; // For template management
  projectId?: string; // For project-specific sheets
}

// Template type
interface OperationTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  materials: MaterialItem[];
  consumables: ConsumabilItem[];
  equipment: EchipamentItem[];
  labor: ManoperaItem[];
  createdAt: string;
  updatedAt: string;
}

// Material item type
interface MaterialItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Consumabile item type
interface ConsumabilItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Scule si echipamente item type
interface EchipamentItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Manopera item type
interface ManoperaItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Helper function to format currency safely
const formatCurrency = (value: number | null | undefined): string => {
  return value != null ? `${value.toFixed(2)} LEI` : '0.00 LEI';
};

export const FisaOperatieModal: React.FC<FisaOperatieModalProps> = ({
  open,
  onClose,
  operationName,
  operationId,
  projectId,
}) => {
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();
  
  // State for each table
  const [materiale, setMateriale] = useState<MaterialItem[]>([]);
  const [consumabile, setConsumabile] = useState<ConsumabilItem[]>([]);
  const [echipamente, setEchipamente] = useState<EchipamentItem[]>([]);
  const [manopera, setManopera] = useState<ManoperaItem[]>([]);

  // Template management state
  const [templates, setTemplates] = useState<OperationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);

  // State for equipment selection modal
  const [showSelectEquipment, setShowSelectEquipment] = useState(false);
  // State for labor selection modal
  const [showSelectLabor, setShowSelectLabor] = useState(false);
  // State for material selection modal
  const [showSelectMaterial, setShowSelectMaterial] = useState(false);
  // State for consumable selection modal
  const [showSelectConsumable, setShowSelectConsumable] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (open && operationId) {
      loadTemplates();
    }
  }, [open, operationId]);

  // Load existing operation sheet data for project
  useEffect(() => {
    if (open && projectId && operationId) {
      loadProjectOperationSheet();
    }
  }, [open, projectId, operationId]);

  // Load existing project operation sheet data
  const loadProjectOperationSheet = async () => {
    if (!projectId || !operationId) return;

    try {
      const sheet = await operationSheetsApi.fetchProjectOperationSheet(projectId, operationId);
      
      if (sheet.items && sheet.items.length > 0) {
        // Convert API items to frontend format
        const materials = sheet.items
          .filter(item => item.itemType === 'MATERIAL')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice,
          }));

        const consumables = sheet.items
          .filter(item => item.itemType === 'CONSUMABLE')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice,
          }));

        const equipment = sheet.items
          .filter(item => item.itemType === 'EQUIPMENT')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice,
          }));

        const labor = sheet.items
          .filter(item => item.itemType === 'LABOR')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice,
          }));

        setMateriale(materials as MaterialItem[]);
        setConsumabile(consumables as ConsumabilItem[]);
        setEchipamente(equipment as EchipamentItem[]);
        setManopera(labor as ManoperaItem[]);
      }
    } catch (error) {
      console.error('Failed to load project operation sheet:', error);
      // If no existing data, just start with empty tables
    }
  };

  // Load templates from API
  const loadTemplates = async () => {
    if (!operationId) return;

    try {
      const apiTemplates = await operationSheetsApi.fetchOperationTemplates(operationId);
      
      // Convert API format to frontend format
      const convertedTemplates: OperationTemplate[] = apiTemplates.map(apiTemplate => ({
        id: apiTemplate.id,
        name: apiTemplate.name,
        description: apiTemplate.description,
        isDefault: apiTemplate.isDefault,
        materials: apiTemplate.items
          .filter(item => item.itemType === 'MATERIAL')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice || (item.quantity * item.unitPrice),
          })),
        consumables: apiTemplate.items
          .filter(item => item.itemType === 'CONSUMABLE')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice || (item.quantity * item.unitPrice),
          })),
        equipment: apiTemplate.items
          .filter(item => item.itemType === 'EQUIPMENT')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice || (item.quantity * item.unitPrice),
          })),
        labor: apiTemplate.items
          .filter(item => item.itemType === 'LABOR')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.totalPrice || (item.quantity * item.unitPrice),
          })),
        createdAt: apiTemplate.createdAt,
        updatedAt: apiTemplate.updatedAt,
      }));

      setTemplates(convertedTemplates);
      const defaultTemplate = convertedTemplates.find(t => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
        loadTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Fallback to empty state
      setTemplates([]);
    }
  };

  // Load a template into the current state
  const loadTemplate = (template: OperationTemplate) => {
    setMateriale([...template.materials]);
    setConsumabile([...template.consumables]);
    setEchipamente([...template.equipment]);
    setManopera([...template.labor]);
  };

  // Handle template selection change
  const handleTemplateChange = (templateId: string | unknown) => {
    // Handle empty string case
    if (!templateId || templateId === '') {
      setSelectedTemplate('');
      return;
    }
    
    const id = String(templateId);
    const template = templates.find(t => t.id === id);
    
    if (template) {
      setSelectedTemplate(id);
      loadTemplate(template);
    } else {
      console.error('Template not found:', id);
    }
  };

  // Save current state as a new template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim() || !operationId) {
      return;
    }

    try {
      // Convert frontend format to API format
      const items: operationSheetsApi.CreateTemplateRequest['items'] = [
        ...materiale.map(item => ({
          type: 'MATERIAL' as const,
          name: item.denumire,
          code: item.cod,
          unit: item.um,
          quantity: item.cantitate,
          price: item.pretUnitar,
        })),
        ...consumabile.map(item => ({
          type: 'CONSUMABLE' as const,
          name: item.denumire,
          code: item.cod,
          unit: item.um,
          quantity: item.cantitate,
          price: item.pretUnitar,
        })),
        ...echipamente.map(item => ({
          type: 'EQUIPMENT' as const,
          name: item.denumire,
          code: item.cod,
          unit: item.um,
          quantity: item.cantitate,
          price: item.pretUnitar,
        })),
        ...manopera.map(item => ({
          type: 'LABOR' as const,
          name: item.denumire,
          code: item.cod,
          unit: item.um,
          quantity: item.cantitate,
          price: item.pretUnitar,
        })),
      ];

      const createRequest: operationSheetsApi.CreateTemplateRequest = {
        name: newTemplateName,
        description: newTemplateDescription || undefined,
        isDefault: makeDefault,
        items,
      };

      const savedTemplate = await operationSheetsApi.createOperationTemplate(
        operationId,
        createRequest
      );

      // Convert API response to frontend format
      const newTemplate: OperationTemplate = {
        id: savedTemplate.id,
        name: savedTemplate.name,
        description: savedTemplate.description,
        isDefault: savedTemplate.isDefault,
        materials: [...materiale],
        consumables: [...consumabile],
        equipment: [...echipamente],
        labor: [...manopera],
        createdAt: savedTemplate.createdAt,
        updatedAt: savedTemplate.updatedAt,
      };

      setTemplates(prev => [...prev, newTemplate]);
      setSelectedTemplate(newTemplate.id);
      setShowSaveTemplateDialog(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setMakeDefault(false);
      enqueueSnackbar('Template salvat cu succes!', { variant: 'success' });
    } catch (error) {
      console.error('Failed to save template:', error);
      enqueueSnackbar('Eroare la salvarea template-ului', { variant: 'error' });
    }
  };

  // Handle equipment selection
  const handleSelectEquipment = (equipment: Equipment) => {
    const newItem: EchipamentItem = {
      id: crypto.randomUUID(),
      cod: equipment.code,
      denumire: equipment.description,
      um: 'oră',
      cantitate: 1,
      pretUnitar: Number(equipment.hourlyCost),
      valoare: Number(equipment.hourlyCost),
    };
    setEchipamente((prev) => [...prev, newItem]);
  };

  // Handle labor selection
  const handleSelectLabor = (laborLine: LaborLine, qualificationName: string) => {
    const newItem: ManoperaItem = {
      id: crypto.randomUUID(),
      cod: qualificationName,
      denumire: laborLine.name,
      um: laborLine.unit,
      cantitate: 1,
      pretUnitar: laborLine.hourlyRate,
      valoare: laborLine.hourlyRate,
    };
    setManopera((prev) => [...prev, newItem]);
  };

  // Handle material selection
  const handleSelectMaterial = (material: Material) => {
    const newItem: MaterialItem = {
      id: crypto.randomUUID(),
      cod: material.code,
      denumire: material.description,
      um: material.unit,
      cantitate: 1,
      pretUnitar: Number(material.price),
      valoare: Number(material.price),
    };
    setMateriale((prev) => [...prev, newItem]);
  };

  // Handle consumable selection
  const handleSelectConsumable = (material: Material) => {
    const newItem: ConsumabilItem = {
      id: crypto.randomUUID(),
      cod: material.code,
      denumire: material.description,
      um: material.unit,
      cantitate: 1,
      pretUnitar: Number(material.price),
      valoare: Number(material.price),
    };
    setConsumabile((prev) => [...prev, newItem]);
  };

  // Delete handlers
  const handleDeleteMaterial = async (id: string) => {
    const item = materiale.find((m) => m.id === id);
    const confirmed = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi acest material?',
      description: item ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Denumire:</strong> {item.denumire}
          </Typography>
          <Typography variant="body2">
            <strong>Cod:</strong> {item.cod}
          </Typography>
        </Box>
      ) : 'Ești sigur că vrei să ștergi acest material?',
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    if (confirmed) {
      setMateriale((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleDeleteConsumabil = async (id: string) => {
    const item = consumabile.find((c) => c.id === id);
    const confirmed = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi acest consumabil?',
      description: item ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Denumire:</strong> {item.denumire}
          </Typography>
          <Typography variant="body2">
            <strong>Cod:</strong> {item.cod}
          </Typography>
        </Box>
      ) : 'Ești sigur că vrei să ștergi acest consumabil?',
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    if (confirmed) {
      setConsumabile((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleDeleteEchipament = async (id: string) => {
    const item = echipamente.find((e) => e.id === id);
    const confirmed = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi acest echipament?',
      description: item ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Denumire:</strong> {item.denumire}
          </Typography>
          <Typography variant="body2">
            <strong>Cod:</strong> {item.cod}
          </Typography>
        </Box>
      ) : 'Ești sigur că vrei să ștergi acest echipament?',
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    if (confirmed) {
      setEchipamente((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleDeleteManopera = async (id: string) => {
    const item = manopera.find((m) => m.id === id);
    const confirmed = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi această manoperă?',
      description: item ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Denumire:</strong> {item.denumire}
          </Typography>
          <Typography variant="body2">
            <strong>Cod:</strong> {item.cod}
          </Typography>
        </Box>
      ) : 'Ești sigur că vrei să ștergi această manoperă?',
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    if (confirmed) {
      setManopera((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Calculate totals
  const totalMateriale = materiale.reduce((sum, item) => sum + item.valoare, 0);
  const totalConsumabile = consumabile.reduce((sum, item) => sum + item.valoare, 0);
  const totalEchipamente = echipamente.reduce((sum, item) => sum + item.valoare, 0);
  const totalManopera = manopera.reduce((sum, item) => sum + item.valoare, 0);
  const totalGeneral = totalMateriale + totalConsumabile + totalEchipamente + totalManopera;

  // Columns for Materiale
  const materialeColumns = useMemo<MRT_ColumnDef<MaterialItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Material',
        size: 250,
        minSize: 150,
        grow: true,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 60,
        minSize: 60,
        maxSize: 60,
        grow: false,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cant.',
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 100,
        minSize: 100,
        maxSize: 100,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        grow: false,
        Cell: ({ row }) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteMaterial(row.original.id)}
            title="Șterge"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  // Columns for Consumabile (same structure)
  const consumabileColumns = useMemo<MRT_ColumnDef<ConsumabilItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Consumabil',
        size: 250,
        minSize: 150,
        grow: true,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 60,
        minSize: 60,
        maxSize: 60,
        grow: false,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cant.',
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 100,
        minSize: 100,
        maxSize: 100,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        grow: false,
        Cell: ({ row }) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteConsumabil(row.original.id)}
            title="Șterge"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  // Columns for Scule si Echipamente
  const echipamenteColumns = useMemo<MRT_ColumnDef<EchipamentItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Echipament',
        size: 250,
        minSize: 150,
        grow: true,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 60,
        minSize: 60,
        maxSize: 60,
        grow: false,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cant.',
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 100,
        minSize: 100,
        maxSize: 100,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        grow: false,
        Cell: ({ row }) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteEchipament(row.original.id)}
            title="Șterge"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  // Columns for Manopera
  const manoperaColumns = useMemo<MRT_ColumnDef<ManoperaItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Manoperă',
        size: 250,
        minSize: 150,
        grow: true,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 60,
        minSize: 60,
        maxSize: 60,
        grow: false,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cant.',
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț',
        size: 90,
        minSize: 90,
        maxSize: 90,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 100,
        minSize: 100,
        maxSize: 100,
        grow: false,
        Cell: ({ cell }) => formatCurrency(cell.getValue<number>()),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        grow: false,
        Cell: ({ row }) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteManopera(row.original.id)}
            title="Șterge"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Fișa Operație: {operationName}
          </Typography>
          <Chip
            label={`Total: ${totalGeneral.toFixed(2)} LEI`}
            color="primary"
            sx={{ fontWeight: 600, fontSize: '1rem', px: 1 }}
          />
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 3 }}>
        {/* Template Selector */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Stack spacing={2}>
            {/* Template Selector Row */}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BookmarkIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Template:
                </Typography>
              </Box>
              
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Selectează Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  label="Selectează Template"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} {template.isDefault && '⭐'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setShowSaveTemplateDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Salvează ca Template Nou
              </Button>

              {selectedTemplate && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={async () => {
                    const template = templates.find(t => t.id === selectedTemplate);
                    if (!template) return;
                    
                    const confirmed = await confirm({
                      title: 'Șterge Template',
                      bodyTitle: `Sigur doriți să ștergeți template-ul "${template.name}"?`,
                      confirmText: 'Șterge',
                      cancelText: 'Anulează',
                      danger: true,
                    });

                    if (confirmed && operationId) {
                      try {
                        await operationSheetsApi.deleteOperationTemplate(operationId, selectedTemplate);
                        enqueueSnackbar('Template șters cu succes', { variant: 'success' });
                        setSelectedTemplate('');
                        await loadTemplates();
                      } catch (error) {
                        console.error('Failed to delete template:', error);
                        enqueueSnackbar('Eroare la ștergerea template-ului', { variant: 'error' });
                      }
                    }
                  }}
                  title="Șterge Template"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}

              {projectId && (
                <Chip
                  icon={<HistoryIcon />}
                  label="Versiune Proiect"
                  color="secondary"
                  size="small"
                />
              )}
            </Stack>

            {/* Template Info Row */}
            {selectedTemplate && (() => {
              const template = templates.find(t => t.id === selectedTemplate);
              if (!template) return null;
              
              const createdDate = new Date(template.createdAt).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const updatedDate = new Date(template.updatedAt).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return (
                <Box sx={{ pl: 4, display: 'flex', gap: 3, flexWrap: 'wrap', fontSize: '0.875rem', color: 'text.secondary' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Creat:</Typography>
                    <Typography variant="caption">{createdDate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Actualizat:</Typography>
                    <Typography variant="caption">{updatedDate}</Typography>
                  </Box>
                  {template.description && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Descriere:</Typography>
                      <Typography variant="caption">{template.description}</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Stack>
        </Paper>

        {/* Summary Cards */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2', height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <InventoryIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Materiale
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {totalMateriale.toFixed(2)} LEI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {materiale.length} {materiale.length === 1 ? 'articol' : 'articole'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0', height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BuildIcon sx={{ color: '#9c27b0' }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Consumabile
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {totalConsumabile.toFixed(2)} LEI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {consumabile.length} {consumabile.length === 1 ? 'articol' : 'articole'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800', height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ConstructionIcon sx={{ color: '#ff9800' }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Echipamente
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {totalEchipamente.toFixed(2)} LEI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {echipamente.length} {echipamente.length === 1 ? 'articol' : 'articole'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50', height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EngineeringIcon sx={{ color: '#4caf50' }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Manoperă
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {totalManopera.toFixed(2)} LEI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {manopera.length} {manopera.length === 1 ? 'articol' : 'articole'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Stack>

        {/* 2x2 Grid Layout */}
        <Stack spacing={3}>
          {/* Top Row */}
          <Stack direction="row" spacing={2}>
            {/* Materiale Section */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  '&:hover': { boxShadow: 6 }
                }}
              >
                <Box sx={{ 
                  bgcolor: '#1976d2', 
                  color: 'white', 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Materiale
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    sx={{ 
                      bgcolor: 'white', 
                      color: '#1976d2',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => setShowSelectMaterial(true)}
                  >
                    Adaugă
                  </Button>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white' }}>
                  {materiale.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Nu există materiale adăugate.
                      </Typography>
                    </Box>
                  ) : (
                    <MaterialReactTable
                      columns={materialeColumns}
                      data={materiale}
                      enablePagination={false}
                      enableBottomToolbar={false}
                      enableTopToolbar={false}
                      enableColumnActions={false}
                      enableSorting={true}
                      enableColumnResizing={false}
                      layoutMode="grid"
                      localization={tableLocalization}
                      muiTableProps={{
                        sx: {
                          tableLayout: 'fixed',
                        },
                      }}
                      muiTableBodyProps={{
                        sx: {
                          '& tr': {
                            height: '52px',
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Consumabile Section */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  '&:hover': { boxShadow: 6 }
                }}
              >
                <Box sx={{ 
                  bgcolor: '#9c27b0', 
                  color: 'white', 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Consumabile
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    sx={{ 
                      bgcolor: 'white', 
                      color: '#9c27b0',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => setShowSelectConsumable(true)}
                  >
                    Adaugă
                  </Button>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white' }}>
                  {consumabile.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Nu există consumabile adăugate.
                      </Typography>
                    </Box>
                  ) : (
                    <MaterialReactTable
                      columns={consumabileColumns}
                      data={consumabile}
                      enablePagination={false}
                      enableBottomToolbar={false}
                      enableTopToolbar={false}
                      enableColumnActions={false}
                      enableSorting={true}
                      enableColumnResizing={false}
                      layoutMode="grid"
                      localization={tableLocalization}
                      muiTableProps={{
                        sx: {
                          tableLayout: 'fixed',
                        },
                      }}
                      muiTableBodyProps={{
                        sx: {
                          '& tr': {
                            height: '52px',
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          </Stack>

          {/* Bottom Row */}
          <Stack direction="row" spacing={2}>
            {/* Scule si Echipamente Section */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  '&:hover': { boxShadow: 6 }
                }}
              >
                <Box sx={{ 
                  bgcolor: '#ff9800', 
                  color: 'white', 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ConstructionIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Scule și Echipamente
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    sx={{ 
                      bgcolor: 'white', 
                      color: '#ff9800',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => setShowSelectEquipment(true)}
                  >
                    Adaugă
                  </Button>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white' }}>
                  {echipamente.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Nu există echipamente adăugate.
                      </Typography>
                    </Box>
                  ) : (
                    <MaterialReactTable
                      columns={echipamenteColumns}
                      data={echipamente}
                      enablePagination={false}
                      enableBottomToolbar={false}
                      enableTopToolbar={false}
                      enableColumnActions={false}
                      enableSorting={true}
                      enableColumnResizing={false}
                      layoutMode="grid"
                      localization={tableLocalization}
                      muiTableProps={{
                        sx: {
                          tableLayout: 'fixed',
                        },
                      }}
                      muiTableBodyProps={{
                        sx: {
                          '& tr': {
                            height: '52px',
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Manopera Section */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  '&:hover': { boxShadow: 6 }
                }}
              >
                <Box sx={{ 
                  bgcolor: '#4caf50', 
                  color: 'white', 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EngineeringIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Manoperă
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    sx={{ 
                      bgcolor: 'white', 
                      color: '#4caf50',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => setShowSelectLabor(true)}
                  >
                    Adaugă
                  </Button>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white' }}>
                  {manopera.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Nu există manoperă adăugată.
                      </Typography>
                    </Box>
                  ) : (
                    <MaterialReactTable
                      columns={manoperaColumns}
                      data={manopera}
                      enablePagination={false}
                      enableBottomToolbar={false}
                      enableTopToolbar={false}
                      enableColumnActions={false}
                      enableSorting={true}
                      enableColumnResizing={false}
                      layoutMode="grid"
                      localization={tableLocalization}
                      muiTableProps={{
                        sx: {
                          tableLayout: 'fixed',
                        },
                      }}
                      muiTableBodyProps={{
                        sx: {
                          '& tr': {
                            height: '52px',
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Button onClick={onClose} size="large">
          Anulează
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={async () => {
            // Case 1: Project-specific save (has both projectId and operationId)
            if (projectId && operationId) {
              try {
                const items = [
                  ...materiale.map(item => ({
                    type: 'MATERIAL' as const,
                    code: item.cod,
                    name: item.denumire,
                    description: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...consumabile.map(item => ({
                    type: 'CONSUMABLE' as const,
                    code: item.cod,
                    name: item.denumire,
                    description: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...echipamente.map(item => ({
                    type: 'EQUIPMENT' as const,
                    code: item.cod,
                    name: item.denumire,
                    description: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...manopera.map(item => ({
                    type: 'LABOR' as const,
                    code: item.cod,
                    name: item.denumire,
                    description: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                ];

                await operationSheetsApi.saveProjectOperationSheet(
                  projectId,
                  operationId,
                  { items }
                );

                enqueueSnackbar('Fișă operație salvată pentru proiect', { variant: 'success' });
                onClose();
              } catch (error) {
                console.error('Failed to save project operation sheet:', error);
                enqueueSnackbar('Eroare la salvare', { variant: 'error' });
              }
            }
            // Case 2: Template save (no projectId, automatically save to selected or standard template)
            else if (operationId) {
              try {
                const items = [
                  ...materiale.map(item => ({
                    type: 'MATERIAL' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...consumabile.map(item => ({
                    type: 'CONSUMABLE' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...echipamente.map(item => ({
                    type: 'EQUIPMENT' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                  ...manopera.map(item => ({
                    type: 'LABOR' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: item.cantitate,
                    price: item.pretUnitar,
                  })),
                ];

                // If a template is selected, update that template
                if (selectedTemplate) {
                  const currentTemplate = templates.find(t => t.id === selectedTemplate);
                  if (currentTemplate) {
                    await operationSheetsApi.updateOperationTemplate(
                      operationId,
                      selectedTemplate,
                      {
                        name: currentTemplate.name,
                        description: currentTemplate.description,
                        isDefault: currentTemplate.isDefault,
                        items,
                      }
                    );
                    enqueueSnackbar(`Template "${currentTemplate.name}" actualizat`, { variant: 'success' });
                    await loadTemplates();
                  }
                } else {
                  // No template selected - check if a "Rețeta Standard" exists
                  const standardTemplate = templates.find(t => t.name === 'Rețeta Standard');
                  
                  if (standardTemplate) {
                    // Update existing standard template
                    await operationSheetsApi.updateOperationTemplate(
                      operationId,
                      standardTemplate.id,
                      {
                        items,
                        isDefault: true,
                      }
                    );
                    enqueueSnackbar('Rețeta Standard actualizată', { variant: 'success' });
                    await loadTemplates();
                  } else {
                    // Create new standard template
                    await operationSheetsApi.createOperationTemplate(
                      operationId,
                      {
                        name: 'Rețeta Standard',
                        description: 'Rețetă standard pentru această operație',
                        isDefault: true,
                        items,
                      }
                    );
                    enqueueSnackbar('Rețeta Standard salvată', { variant: 'success' });
                    await loadTemplates();
                  }
                }

                onClose();
              } catch (error) {
                console.error('Failed to save template:', error);
                enqueueSnackbar('Eroare la salvarea template-ului', { variant: 'error' });
              }
            }
            // Case 3: No identifiers - just log and close
            else {
              console.log('Salvare fără identificatori - doar logging:', {
                materiale,
                consumabile,
                echipamente,
                manopera,
              });
              onClose();
            }
          }}
          sx={{ minWidth: 120 }}
        >
          Salvează
        </Button>
      </DialogActions>

      {/* Equipment Selection Modal */}
      <SelectEquipmentModal
        open={showSelectEquipment}
        onClose={() => setShowSelectEquipment(false)}
        onSelect={handleSelectEquipment}
      />

      {/* Labor Selection Modal */}
      <SelectLaborModal
        open={showSelectLabor}
        onClose={() => setShowSelectLabor(false)}
        onSelect={handleSelectLabor}
      />

      {/* Material Selection Modal */}
      <SelectMaterialModal
        open={showSelectMaterial}
        onClose={() => setShowSelectMaterial(false)}
        onSelect={handleSelectMaterial}
        type="material"
      />

      {/* Consumable Selection Modal */}
      <SelectMaterialModal
        open={showSelectConsumable}
        onClose={() => setShowSelectConsumable(false)}
        onSelect={handleSelectConsumable}
        type="consumable"
      />

      {/* Save Template Dialog */}
      <Dialog
        open={showSaveTemplateDialog}
        onClose={() => setShowSaveTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SaveIcon color="primary" />
            <Typography variant="h6">Salvează ca Template</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Nume Template"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              fullWidth
              required
              placeholder="ex: Standard, Budget, Premium"
            />
            <TextField
              label="Descriere (opțional)"
              value={newTemplateDescription}
              onChange={(e) => setNewTemplateDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Descriere scurtă a template-ului"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                id="make-default"
              />
              <label htmlFor="make-default">
                <Typography variant="body2">
                  Setează ca template implicit pentru această operație
                </Typography>
              </label>
            </Box>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Template-ul va include:
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  • {materiale.length} materiale
                </Typography>
                <Typography variant="body2">
                  • {consumabile.length} consumabile
                </Typography>
                <Typography variant="body2">
                  • {echipamente.length} echipamente
                </Typography>
                <Typography variant="body2">
                  • {manopera.length} manoperă
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Total: {totalGeneral.toFixed(2)} LEI
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveTemplateDialog(false)}>
            Anulează
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAsTemplate}
            disabled={!newTemplateName.trim()}
            startIcon={<SaveIcon />}
          >
            Salvează Template
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
