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
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  InputAdornment,
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ConstructionIcon from '@mui/icons-material/Construction';
import SaveIcon from '@mui/icons-material/Save';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HistoryIcon from '@mui/icons-material/History';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { tableLocalization } from '../../localization/tableLocalization';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { SelectEquipmentModal } from './SelectEquipmentModal';
import { SelectLaborModal } from './SelectLaborModal';
import { SelectMaterialModal } from './SelectMaterialModal';
/* eslint-disable react-hooks/exhaustive-deps */
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { useSnackbar } from 'notistack';
import type { Equipment } from '../../api/equipment';
import type { LaborLine } from '../../api/laborLines';
import type { Material } from '../../api/materials';
import * as operationSheetsApi from '../../api/operationSheets';
import { listEquipment } from '../../api/equipment';
import { fetchUniqueMaterials } from '../../api/materials';

interface FisaOperatieModalProps {
  open: boolean;
  onClose: () => void;
  operationName: string;
  operationId?: string; // For template management
  projectId?: string; // For project-specific sheets
  onRecipeCalculated?: (unitPrice: number) => void; // Callback with calculated unit price from recipe
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
  packQuantity?: number | null; // Cantitate per ambalaj (ex: 25 KG)
  packUnit?: string | null; // Unitate ambalaj (ex: KG)
  packPrice?: number | null; // Preț per ambalaj (ex: 62.25 RON for 25 KG)
  consumNormat: number; // Consum normat (editable)
  marjaConsum: number; // Marjă consum % (can be +/-)
  cantitate: number; // Calculated: consumNormat * (1 + marjaConsum/100)
  costUnitar: number; // Calculated: packPrice / packQuantity
  valoare: number; // Calculated: cantitate * costUnitar
}

// Consumabile item type
interface ConsumabilItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  packQuantity?: number | null;
  packUnit?: string | null;
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
  consumNormat: number; // Consum normat (editable)
  marjaConsum: number; // Marjă consum % (can be +/-)
  cantitate: number; // Calculated: consumNormat * (1 + marjaConsum/100)
  pretUnitar: number;
  valoare: number; // Calculated: cantitate * pretUnitar
}

// Manopera item type
interface ManoperaItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  consumNormat: number; // Consum normat (editable)
  marjaConsum: number; // Marjă consum % (can be +/-)
  cantitate: number; // Calculated: consumNormat * (1 + marjaConsum/100)
  pretUnitar: number;
  valoare: number; // Calculated: cantitate * pretUnitar
}

type RecipeData = {
  materiale: MaterialItem[];
  consumabile: ConsumabilItem[];
  echipamente: EchipamentItem[];
  manopera: ManoperaItem[];
};

type RecipeVersion = 'STANDARD' | 'TEMPLATE' | 'PROJECT';

// Helper function to format currency safely
const formatCurrency = (value: number | null | undefined): string => {
  return value != null ? `${value.toFixed(2)} LEI` : '0.00 LEI';
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneRecipe = (recipe: RecipeData): RecipeData => ({
  materiale: recipe.materiale.map(item => ({ ...item })),
  consumabile: recipe.consumabile.map(item => ({ ...item })),
  echipamente: recipe.echipamente.map(item => ({ ...item })),
  manopera: recipe.manopera.map(item => ({ ...item })),
});

const computeUnitCost = (price?: number | null, packQuantity?: number | null): number => {
  const priceNumber = Number(price ?? 0);
  const quantityNumber = Number(packQuantity ?? 0);
  if (!Number.isFinite(priceNumber)) return 0;
  if (!quantityNumber || !Number.isFinite(quantityNumber) || quantityNumber <= 0) {
    return priceNumber;
  }
  return priceNumber / quantityNumber;
};

const normalizeMaterialItem = (item: MaterialItem): MaterialItem => {
  const packQuantity = item.packQuantity ?? null;
  let packPrice = item.packPrice ?? null;
  
  let costUnitar = 0;
  if (packPrice != null && Number.isFinite(packPrice) && packQuantity && packQuantity > 0) {
    costUnitar = packPrice / packQuantity;
  } else {
    costUnitar = item.costUnitar ?? 0;
    if ((packPrice == null || !Number.isFinite(packPrice)) && packQuantity && packQuantity > 0 && Number.isFinite(costUnitar)) {
      packPrice = costUnitar * packQuantity;
    }
  }

  // Get consum normat and marja
  const consumNormatRaw = item.consumNormat ?? 0;
  const marjaConsumRaw = item.marjaConsum ?? 0;

  const consumNormat = Number.isFinite(consumNormatRaw) && consumNormatRaw >= 0 ? consumNormatRaw : 0;
  const marjaConsum = Number.isFinite(marjaConsumRaw) ? marjaConsumRaw : 0;

  // Calculate total quantity with margin
  const cantitate = consumNormat * (1 + marjaConsum / 100);
  
  // Calculate total value
  const valoare = cantitate * costUnitar;

  return {
    ...item,
    packPrice: packPrice != null && Number.isFinite(packPrice) ? packPrice : null,
    packQuantity,
    consumNormat,
    marjaConsum,
    costUnitar: Number.isFinite(costUnitar) ? costUnitar : 0,
    cantitate: Number.isFinite(cantitate) ? cantitate : 0,
    valoare: Number.isFinite(valoare) ? valoare : 0,
  };
};

const normalizeMaterialItems = (items: MaterialItem[]): MaterialItem[] =>
  items.map(normalizeMaterialItem);

export const FisaOperatieModal: React.FC<FisaOperatieModalProps> = ({
  open,
  onClose,
  operationName,
  operationId, // NOTE: This is the OperationItem ID (templates are per operation item after migration)
  projectId,
  onRecipeCalculated,
}) => {
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();
  
  // Debug: Log the operationItem ID when modal opens
  useEffect(() => {
    if (open && operationId) {
      console.log('🔍 FisaOperatieModal opened with operationItemId:', operationId);
    }
  }, [open, operationId]);

  // Avoid resetting internal state when closing to prevent flicker.
  // We'll hydrate fresh data on open via dedicated effects.
  useEffect(() => {
    if (!open) return;
    // Optional: reset transient flags when opening
    applyingRecipeRef.current = false;
  }, [open]);

  // State for each table
  const [materiale, setMateriale] = useState<MaterialItem[]>([]);
  const [consumabile, setConsumabile] = useState<ConsumabilItem[]>([]);
  const [echipamente, setEchipamente] = useState<EchipamentItem[]>([]);
  const [manopera, setManopera] = useState<ManoperaItem[]>([]);

  const [activeVersion, setActiveVersion] = useState<RecipeVersion>('STANDARD');
  const [projectRecipe, setProjectRecipe] = useState<RecipeData | null>(null);
  const [standardRecipe, setStandardRecipe] = useState<RecipeData | null>(null);
  const [standardTemplateId, setStandardTemplateId] = useState<string | null>(null);
  const [isProjectRecipeLoaded, setIsProjectRecipeLoaded] = useState(false);
  const [templateCache, setTemplateCache] = useState<Record<string, RecipeData>>({});
  const applyingRecipeRef = useRef(false);
  const activeVersionRef = useRef<RecipeVersion>('STANDARD');
  const projectRecipeRef = useRef<RecipeData | null>(null);

  const updateMaterialItem = useCallback(
    (id: string, patch: Partial<MaterialItem> | ((item: MaterialItem) => Partial<MaterialItem>)) => {
      setMateriale((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const patchValue = typeof patch === 'function' ? patch(item) : patch;
          return normalizeMaterialItem({ ...item, ...patchValue });
        }),
      );
    },
    [],
  );

  const handleMaterialConsumNormChange = useCallback(
    (id: string, rawValue: string) => {
      const parsed = rawValue === '' ? 0 : Number(rawValue);
      if (Number.isNaN(parsed)) return;
      updateMaterialItem(id, { consumNormat: parsed });
    },
    [updateMaterialItem],
  );

  const handleMaterialMarjaChange = useCallback(
    (id: string, rawValue: string) => {
      if (rawValue === '' || rawValue === '-') {
        updateMaterialItem(id, { marjaConsum: 0 });
        return;
      }
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) return;
      updateMaterialItem(id, { marjaConsum: parsed });
    },
    [updateMaterialItem],
  );

  useEffect(() => {
    activeVersionRef.current = activeVersion;
  }, [activeVersion]);

  useEffect(() => {
    projectRecipeRef.current = projectRecipe;
  }, [projectRecipe]);

  const applyRecipeData = (recipe: RecipeData | null) => {
    applyingRecipeRef.current = true;

    if (!recipe) {
      setMateriale([]);
      setConsumabile([]);
      setEchipamente([]);
      setManopera([]);
    } else {
      const copy = cloneRecipe(recipe);
      setMateriale(normalizeMaterialItems(copy.materiale));
      setConsumabile(copy.consumabile);
      setEchipamente(copy.echipamente);
      setManopera(copy.manopera);
    }

    Promise.resolve().then(() => {
      applyingRecipeRef.current = false;
    });
  };

  const handleVersionChange = async (_event: MouseEvent<HTMLElement>, value: RecipeVersion | null) => {
    if (!value || value === activeVersion) {
      return;
    }

    if (value === 'PROJECT' && !projectId) {
      return;
    }

    if (activeVersion === 'PROJECT') {
      const snapshot = buildRecipeFromCurrentState();
      projectRecipeRef.current = snapshot;
      setProjectRecipe(snapshot);
    }

    setActiveVersion(value);

    if (value === 'PROJECT') {
      const recipe = projectRecipe ?? buildRecipeFromCurrentState();
      setProjectRecipe(recipe);
      applyRecipeData(recipe);
    } else if (value === 'STANDARD') {
      applyRecipeData(standardRecipe);
    } else if (value === 'TEMPLATE') {
      if (!selectedTemplate) {
        applyRecipeData(null);
        return;
      }

      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        applyRecipeData(null);
        return;
      }

      const cached = templateCache[selectedTemplate];
      if (cached) {
        applyRecipeData(cached);
        return;
      }

      const recipe = await refreshTemplateData(template);
      cacheTemplate(selectedTemplate, recipe);
      applyRecipeData(recipe);
    }
  };

const handleApplyPriceToProject = () => {
  if (!onRecipeCalculated) {
    return;
  }
  onRecipeCalculated(totalRecipeCost);
};

// Template management state
const [templates, setTemplates] = useState<OperationTemplate[]>([]);
const [selectedTemplate, setSelectedTemplate] = useState<string>('');
const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
const [newTemplateName, setNewTemplateName] = useState('');
const [newTemplateDescription, setNewTemplateDescription] = useState('');
const [makeDefault, setMakeDefault] = useState(false);

const cacheTemplate = (templateId: string, data: RecipeData) => {
  setTemplateCache(prev => ({
    ...prev,
    [templateId]: cloneRecipe(data),
  }));
};

const buildRecipeFromCurrentState = (): RecipeData => ({
  materiale: materiale.map(item => ({ ...item })),
  consumabile: consumabile.map(item => ({ ...item })),
  echipamente: echipamente.map(item => ({ ...item })),
  manopera: manopera.map(item => ({ ...item })),
});

  const renderTemplateMeta = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return (
        <Alert severity="warning" variant="outlined">
          Template-ul selectat nu mai este disponibil. Reimprospatati lista de template-uri.
        </Alert>
      );
    }

    const createdDate = new Date(template.createdAt).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const updatedDate = new Date(template.updatedAt).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <HistoryIcon color="action" />
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {template.name}
            {template.isDefault ? ' (Standard)' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Creat: {createdDate} | Actualizat: {updatedDate}
          </Typography>
          {template.description && (
            <Typography variant="caption" color="text.secondary">
              {template.description}
            </Typography>
          )}
        </Stack>
      </Stack>
    );
  };

  // State for equipment selection modal
  const [showSelectEquipment, setShowSelectEquipment] = useState(false);
  // State for labor selection modal
  const [showSelectLabor, setShowSelectLabor] = useState(false);
  // State for material selection modal
  const [showSelectMaterial, setShowSelectMaterial] = useState(false);
  // State for consumable selection modal
  const [showSelectConsumable, setShowSelectConsumable] = useState(false);

  // Calculate total recipe cost (sum of all items)
  const totalRecipeCost = useMemo(() => {
    const materialTotal = materiale.reduce((sum, item) => sum + toNumber(item.valoare), 0);
    const consumableTotal = consumabile.reduce((sum, item) => sum + toNumber(item.valoare), 0);
    const equipmentTotal = echipamente.reduce((sum, item) => sum + toNumber(item.valoare), 0);
    const laborTotal = manopera.reduce((sum, item) => sum + toNumber(item.valoare), 0);
    return materialTotal + consumableTotal + equipmentTotal + laborTotal;
  }, [materiale, consumabile, echipamente, manopera]);

  useEffect(() => {
    if (activeVersion === 'PROJECT' && !applyingRecipeRef.current) {
      setProjectRecipe({
        materiale: materiale.map(item => ({ ...item })),
        consumabile: consumabile.map(item => ({ ...item })),
        echipamente: echipamente.map(item => ({ ...item })),
        manopera: manopera.map(item => ({ ...item })),
      });
    }
  }, [materiale, consumabile, echipamente, manopera, activeVersion]);

  // Notify parent component when recipe total changes (for project sheet unit price)
  // Only update when items actually change, not on every render

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
        const materials = sheet.items
          .filter(item => item.itemType === 'MATERIAL')
          .map(item => {
            const packQty = item.packQuantity ?? null;
            const costUnitar = item.unitPrice;
            const packPrice = (packQty && packQty > 0) ? costUnitar * packQty : null;
            
            return {
              id: String(item.id),
              cod: item.code || '',
              denumire: item.description,
              um: item.unit,
              packQuantity: packQty,
              packUnit: item.packUnit ?? null,
              packPrice: packPrice,
              consumNormat: item.quantity, // Initialize from loaded quantity
              marjaConsum: 0, // Default to 0, no way to reverse-engineer this
              cantitate: item.quantity,
              costUnitar: costUnitar,
              valoare: item.quantity * costUnitar,
            };
          });

        const consumables = sheet.items
          .filter(item => item.itemType === 'CONSUMABLE')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            packQuantity: item.packQuantity ?? null,
            packUnit: item.packUnit ?? null,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          }));

        const equipment = sheet.items
          .filter(item => item.itemType === 'EQUIPMENT')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            consumNormat: item.quantity, // Initialize from loaded quantity
            marjaConsum: 0, // Default to 0
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          }));

        const labor = sheet.items
          .filter(item => item.itemType === 'LABOR')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            consumNormat: item.quantity, // Initialize from loaded quantity
            marjaConsum: 0, // Default to 0
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          }));

        const recipe: RecipeData = {
          materiale: materials as MaterialItem[],
          consumabile: consumables as ConsumabilItem[],
          echipamente: equipment as EchipamentItem[],
          manopera: labor as ManoperaItem[],
        };

        projectRecipeRef.current = recipe;
        setProjectRecipe(recipe);
        setIsProjectRecipeLoaded(true);

        const currentVersion = activeVersionRef.current;
        if (currentVersion === 'STANDARD') {
          applyRecipeData(recipe);
          setActiveVersion('PROJECT');
        } else if (currentVersion === 'PROJECT') {
          applyRecipeData(recipe);
        }
      } else {
        projectRecipeRef.current = null;
        setProjectRecipe(null);
        setIsProjectRecipeLoaded(true);
        const currentVersion = activeVersionRef.current;
        if (currentVersion === 'PROJECT') {
          applyRecipeData(null);
          setActiveVersion('STANDARD');
        }
      }
    } catch (error) {
      console.error('Failed to load project operation sheet:', error);
      projectRecipeRef.current = null;
      setProjectRecipe(null);
      setIsProjectRecipeLoaded(true);
      const currentVersion = activeVersionRef.current;
      if (currentVersion === 'PROJECT') {
        applyRecipeData(null);
        setActiveVersion('STANDARD');
      }
    }
  };

  // Load templates from API
  const loadTemplates = async () => {
    if (!operationId) return;

    try {
      const apiTemplates = await operationSheetsApi.fetchOperationTemplates(operationId);

      const convertedTemplates: OperationTemplate[] = apiTemplates.map(apiTemplate => ({
        id: apiTemplate.id,
        name: apiTemplate.name,
        description: apiTemplate.description,
        isDefault: apiTemplate.isDefault,
        materials: apiTemplate.items
          .filter(item => item.itemType === 'MATERIAL')
          .map(item => {
            const packQty = item.packQuantity ?? null;
            const costUnitar = item.unitPrice;
            const packPrice = (packQty && packQty > 0) ? costUnitar * packQty : null;
            
            return {
              id: String(item.id),
              cod: item.code || '',
              denumire: item.description,
              um: item.unit,
              packQuantity: packQty,
              packUnit: item.packUnit ?? null,
              packPrice: packPrice,
              consumNormat: item.quantity, // Initialize from loaded quantity
              marjaConsum: 0, // Default to 0
              cantitate: item.quantity,
              costUnitar: costUnitar,
              valoare: item.quantity * costUnitar,
            };
          }),
        consumables: apiTemplate.items
          .filter(item => item.itemType === 'CONSUMABLE')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            packQuantity: item.packQuantity ?? null,
            packUnit: item.packUnit ?? null,
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          })),
        equipment: apiTemplate.items
          .filter(item => item.itemType === 'EQUIPMENT')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            consumNormat: item.quantity, // Initialize from loaded quantity
            marjaConsum: 0, // Default to 0
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          })),
        labor: apiTemplate.items
          .filter(item => item.itemType === 'LABOR')
          .map(item => ({
            id: String(item.id),
            cod: item.code || '',
            denumire: item.description,
            um: item.unit,
            consumNormat: item.quantity, // Initialize from loaded quantity
            marjaConsum: 0, // Default to 0
            cantitate: item.quantity,
            pretUnitar: item.unitPrice,
            valoare: item.quantity * item.unitPrice,
          })),
        createdAt: apiTemplate.createdAt,
        updatedAt: apiTemplate.updatedAt,
      }));

      setTemplates(convertedTemplates);

      const defaultTemplate =
        convertedTemplates.find(t => t.isDefault) ?? convertedTemplates[0] ?? null;

      setStandardTemplateId(defaultTemplate?.id ?? null);

      let defaultRecipe: RecipeData | null = null;
      if (defaultTemplate) {
        const cached = templateCache[defaultTemplate.id];
        defaultRecipe = cached ?? (await refreshTemplateData(defaultTemplate));
        cacheTemplate(defaultTemplate.id, defaultRecipe);
      }
      setStandardRecipe(defaultRecipe);

      let nextSelected = selectedTemplate;
      if (nextSelected && !convertedTemplates.some(t => t.id === nextSelected)) {
        nextSelected = defaultTemplate?.id ?? '';
      } else if (!nextSelected && defaultTemplate) {
        nextSelected = defaultTemplate.id;
      }
      setSelectedTemplate(nextSelected);

      const currentVersion = activeVersionRef.current;
      const hasProjectRecipe = !!projectRecipeRef.current;

      if (currentVersion === 'STANDARD' && !hasProjectRecipe) {
        applyRecipeData(defaultRecipe);
      } else if (currentVersion === 'TEMPLATE' && nextSelected) {
        const selected = convertedTemplates.find(t => t.id === nextSelected);
        if (selected) {
          const cachedTemplate = templateCache[nextSelected];
          const recipe =
            cachedTemplate ?? (await refreshTemplateData(selected));
          cacheTemplate(nextSelected, recipe);
          applyRecipeData(recipe);
        } else {
          applyRecipeData(null);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
      setStandardTemplateId(null);
      setStandardRecipe(null);
      if (activeVersionRef.current === 'STANDARD' && !projectRecipeRef.current) {
        applyRecipeData(null);
      }
    }
  };

  // Load a template into memory with refreshed prices
  const refreshTemplateData = async (template: OperationTemplate): Promise<RecipeData> => {
    try {
      const [allEquipment, allMaterials] = await Promise.all([
        listEquipment(),
        fetchUniqueMaterials(),
      ]);

      const refreshedEquipment = template.equipment.map(item => {
        const currentEquipment = allEquipment.find(eq => eq.code === item.cod);
        if (currentEquipment) {
          const newUnitPrice = Number(currentEquipment.hourlyCost);
          return {
            ...item,
            pretUnitar: newUnitPrice,
            valoare: newUnitPrice * item.cantitate,
          };
        }
        return { ...item };
      });

      const refreshedMaterials = template.materials.map(item => {
        const currentMaterial = allMaterials.find(mat => mat.code === item.cod);
        if (currentMaterial) {
          const newUnitPrice = Number(currentMaterial.price);
          return {
            ...item,
            pretUnitar: newUnitPrice,
            valoare: newUnitPrice * item.cantitate,
            packQuantity: currentMaterial.packQuantity ?? null,
            packUnit: currentMaterial.packUnit ?? null,
          };
        }
        return { ...item };
      });

      const refreshedConsumables = template.consumables.map(item => {
        const currentMaterial = allMaterials.find(mat => mat.code === item.cod);
        if (currentMaterial) {
          const newUnitPrice = Number(currentMaterial.price);
          return {
            ...item,
            pretUnitar: newUnitPrice,
            valoare: newUnitPrice * item.cantitate,
            packQuantity: currentMaterial.packQuantity ?? null,
            packUnit: currentMaterial.packUnit ?? null,
          };
        }
        return { ...item };
      });

      return {
        materiale: refreshedMaterials as MaterialItem[],
        consumabile: refreshedConsumables as ConsumabilItem[],
        echipamente: refreshedEquipment as EchipamentItem[],
        manopera: template.labor.map(item => ({ ...item })) as ManoperaItem[],
      };
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      return {
        materiale: template.materials.map(item => ({ ...item })),
        consumabile: template.consumables.map(item => ({ ...item })),
        echipamente: template.equipment.map(item => ({ ...item })),
        manopera: template.labor.map(item => ({ ...item })),
      };
    }
  };

  // Handle template selection change
  const handleTemplateChange = async (templateId: string | unknown) => {
    // Handle empty string case
    if (!templateId || templateId === '') {
      setSelectedTemplate('');
      if (activeVersion === 'TEMPLATE') {
        applyRecipeData(null);
      }
      return;
    }

    const id = String(templateId);
    const template = templates.find(t => t.id === id);

    if (!template) {
      console.error('Template not found:', id);
      return;
    }

    setSelectedTemplate(id);
    if (activeVersion !== 'TEMPLATE') {
      setActiveVersion('TEMPLATE');
    }

    const cached = templateCache[id];
    const recipe = cached ?? (await refreshTemplateData(template));
    cacheTemplate(id, recipe);
    applyRecipeData(recipe);
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
          price: item.costUnitar,
          packQuantity: item.packQuantity ?? null,
          packUnit: item.packUnit ?? null,
        })),
        ...consumabile.map(item => ({
          type: 'CONSUMABLE' as const,
          name: item.denumire,
          code: item.cod,
          unit: item.um,
          quantity: item.cantitate,
          price: item.pretUnitar,
          packQuantity: item.packQuantity ?? null,
          packUnit: item.packUnit ?? null,
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
      consumNormat: 1, // Default to 1, user can edit
      marjaConsum: 0, // Default to 0%, user can edit
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
      consumNormat: 1, // Default to 1, user can edit
      marjaConsum: 0, // Default to 0%, user can edit
      cantitate: 1,
      pretUnitar: laborLine.hourlyRate,
      valoare: laborLine.hourlyRate,
    };
    setManopera((prev) => [...prev, newItem]);
  };

  // Update equipment field and recalculate dependent values
  const updateEquipmentField = (id: string, field: 'consumNormat' | 'marjaConsum', value: number) => {
    setEchipamente(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate cantitate: consumNormat * (1 + marjaConsum/100)
      updated.cantitate = updated.consumNormat * (1 + updated.marjaConsum / 100);
      
      // Recalculate valoare: cantitate * pretUnitar
      updated.valoare = updated.cantitate * updated.pretUnitar;
      
      return updated;
    }));
  };

  // Update labor field and recalculate dependent values
  const updateLaborField = (id: string, field: 'consumNormat' | 'marjaConsum', value: number) => {
    setManopera(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate cantitate: consumNormat * (1 + marjaConsum/100)
      updated.cantitate = updated.consumNormat * (1 + updated.marjaConsum / 100);
      
      // Recalculate valoare: cantitate * pretUnitar
      updated.valoare = updated.cantitate * updated.pretUnitar;
      
      return updated;
    }));
  };

  // Handle material selection
  const handleSelectMaterial = (material: Material) => {
    const packPrice = material.price ? Number(material.price) : null;
    const packQty = material.packQuantity ? Number(material.packQuantity) : null;
    const costUnitar = computeUnitCost(packPrice, packQty);

    const newItem: MaterialItem = {
      id: crypto.randomUUID(),
      cod: material.code,
      denumire: material.description,
      um: material.unit,
      packQuantity: material.packQuantity ?? null,
      packUnit: material.packUnit ?? null,
      packPrice: packPrice,
      consumNormat: 1, // Default to 1, user can edit
      marjaConsum: 0, // Default to 0%, user can edit
      cantitate: 1,
      costUnitar: costUnitar,
      valoare: costUnitar,
    };
    setMateriale((prev) => [...prev, normalizeMaterialItem(newItem)]);
  };

  // Handle consumable selection
  const handleSelectConsumable = (material: Material) => {
    const newItem: ConsumabilItem = {
      id: crypto.randomUUID(),
      cod: material.code,
      denumire: material.description,
      um: material.unit,
      packQuantity: material.packQuantity ?? null,
      packUnit: material.packUnit ?? null,
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
  const totalMateriale = materiale.reduce((sum, item) => sum + toNumber(item.valoare), 0);
  const totalConsumabile = consumabile.reduce((sum, item) => sum + toNumber(item.valoare), 0);
  const totalEchipamente = echipamente.reduce((sum, item) => sum + toNumber(item.valoare), 0);
  const totalManopera = manopera.reduce((sum, item) => sum + toNumber(item.valoare), 0);
  const totalGeneral = totalMateriale + totalConsumabile + totalEchipamente + totalManopera;

  // Columns for Materiale
  const materialeColumns = useMemo<MRT_ColumnDef<MaterialItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Descriere',
        size: 200,
        minSize: 150,
        grow: true,
      },
      {
        accessorKey: 'consumNormat',
        header: 'Consum Normat',
        size: 110,
        minSize: 100,
        maxSize: 130,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.consumNormat;
          return (
            <TextField
              type="number"
              value={Number.isFinite(value) ? value : 0}
              onChange={(e) => handleMaterialConsumNormChange(row.original.id, e.target.value)}
              size="small"
              inputProps={{
                step: '0.01',
                style: { textAlign: 'right', fontSize: '0.875rem' }
              }}
              InputProps={{
                endAdornment: row.original.um ? (
                  <InputAdornment
                    position="end"
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    {row.original.um}
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'costUnitar',
        header: 'Cost Unitar',
        size: 100,
        minSize: 90,
        maxSize: 110,
        grow: false,
        enableEditing: false,
        Cell: ({ cell, row }) => {
          const costUnitar = cell.getValue<number>();
          const packQty = row.original.packQuantity;
          const packUnit = row.original.packUnit;
          const packPrice = row.original.packPrice;
          
          return (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {formatCurrency(costUnitar)}
              </Typography>
              {packQty && packUnit && packPrice && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  ({formatCurrency(packPrice)}/{packQty}{packUnit})
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'marjaConsum',
        header: 'Marjă %',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.marjaConsum;
          return (
            <TextField
              type="number"
              value={Number.isFinite(value) ? value : 0}
              onChange={(e) => handleMaterialMarjaChange(row.original.id, e.target.value)}
              size="small"
              inputProps={{
                step: '1',
                style: {
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: value >= 0 ? 'green' : 'red'
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    %
                  </InputAdornment>
                ),
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ cell, row }) => {
          const cantitate = cell.getValue<number>();
          const consumNormat = row.original.consumNormat;
          const marja = row.original.marjaConsum;
          
          return (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {cantitate.toFixed(4)}
              </Typography>
              {marja !== 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  ({consumNormat.toFixed(2)} × {(1 + marja/100).toFixed(3)})
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 100,
        minSize: 100,
        maxSize: 120,
        grow: false,
        enableEditing: false,
        Cell: ({ cell }) => (
          <Typography variant="body2" fontWeight="bold" color="primary">
            {formatCurrency(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        grow: false,
        enableEditing: false,
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
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Echipament',
        size: 200,
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
        accessorKey: 'consumNormat',
        header: 'Consum Normat',
        size: 110,
        minSize: 100,
        maxSize: 130,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.consumNormat;
          return (
            <TextField
              type="number"
              value={value}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                updateEquipmentField(row.original.id, 'consumNormat', newValue);
              }}
              size="small"
              inputProps={{
                step: '0.01',
                style: { textAlign: 'right', fontSize: '0.875rem' }
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'marjaConsum',
        header: 'Marjă %',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.marjaConsum;
          return (
            <TextField
              type="number"
              value={value}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                updateEquipmentField(row.original.id, 'marjaConsum', newValue);
              }}
              size="small"
              inputProps={{
                step: '1',
                style: { 
                  textAlign: 'right', 
                  fontSize: '0.875rem',
                  color: value >= 0 ? 'green' : 'red'
                }
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ cell, row }) => {
          const cantitate = cell.getValue<number>();
          const consumNormat = row.original.consumNormat;
          const marja = row.original.marjaConsum;
          
          return (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {cantitate.toFixed(4)}
              </Typography>
              {marja !== 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  ({consumNormat.toFixed(2)} × {(1 + marja/100).toFixed(3)})
                </Typography>
              )}
            </Box>
          );
        },
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
        Cell: ({ cell }) => (
          <Typography variant="body2" fontWeight="bold" color="primary">
            {formatCurrency(cell.getValue<number>())}
          </Typography>
        ),
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
        size: 80,
        minSize: 80,
        maxSize: 80,
        grow: false,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Manoperă',
        size: 200,
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
        accessorKey: 'consumNormat',
        header: 'Consum Normat',
        size: 110,
        minSize: 100,
        maxSize: 130,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.consumNormat;
          return (
            <TextField
              type="number"
              value={value}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                updateLaborField(row.original.id, 'consumNormat', newValue);
              }}
              size="small"
              inputProps={{
                step: '0.01',
                style: { textAlign: 'right', fontSize: '0.875rem' }
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'marjaConsum',
        header: 'Marjă %',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ row }) => {
          const value = row.original.marjaConsum;
          return (
            <TextField
              type="number"
              value={value}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                updateLaborField(row.original.id, 'marjaConsum', newValue);
              }}
              size="small"
              inputProps={{
                step: '1',
                style: { 
                  textAlign: 'right', 
                  fontSize: '0.875rem',
                  color: value >= 0 ? 'green' : 'red'
                }
              }}
              sx={{ width: '100%' }}
            />
          );
        },
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 90,
        minSize: 80,
        maxSize: 100,
        grow: false,
        enableEditing: false,
        Cell: ({ cell, row }) => {
          const cantitate = cell.getValue<number>();
          const consumNormat = row.original.consumNormat;
          const marja = row.original.marjaConsum;
          
          return (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {cantitate.toFixed(4)}
              </Typography>
              {marja !== 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  ({consumNormat.toFixed(2)} × {(1 + marja/100).toFixed(3)})
                </Typography>
              )}
            </Box>
          );
        },
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
        Cell: ({ cell }) => (
          <Typography variant="body2" fontWeight="bold" color="primary">
            {formatCurrency(cell.getValue<number>())}
          </Typography>
        ),
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

  // Fullscreen state (persist across sessions)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fisaOperatie.fullScreen') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('fisaOperatie.fullScreen', isFullScreen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isFullScreen]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth fullScreen={isFullScreen} maxWidth={isFullScreen ? false : 'xl'}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Fișa Operație: {operationName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Total: ${totalGeneral.toFixed(2)} LEI`}
              color="primary"
              sx={{ fontWeight: 600, fontSize: '1rem', px: 1 }}
            />
            <IconButton
              size="small"
              onClick={() => setIsFullScreen(v => !v)}
              title={isFullScreen ? 'Iesire ecran complet' : 'Ecran complet'}
            >
              {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 3, ...(isFullScreen ? { height: 'calc(100vh - 140px)' } : {}) }}>
        {/* Version Selector */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BookmarkIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Versiune reteta
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  color="primary"
                  exclusive
                  value={activeVersion}
                  onChange={handleVersionChange}
                  size="small"
                >
                  <ToggleButton value="STANDARD">Reteta Standard</ToggleButton>
                  <ToggleButton value="TEMPLATE">Template-uri</ToggleButton>
                  <ToggleButton value="PROJECT" disabled={!projectId}>
                    Reteta Proiect
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              {onRecipeCalculated && activeVersion === 'PROJECT' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachMoneyIcon />}
                  onClick={handleApplyPriceToProject}
                  sx={{ textTransform: 'none' }}
                >
                  Aplica totalul in Fisa Proiect
                </Button>
              )}
            </Stack>

            {activeVersion === 'STANDARD' && (
              standardTemplateId ? (
                renderTemplateMeta(standardTemplateId)
              ) : (
                <Alert severity="info" variant="outlined">
                  Nu exista inca o reteta standard. Intra in modul Template pentru a o defini.
                </Alert>
              )
            )}

            {activeVersion === 'TEMPLATE' && (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 250 }}>
                    <InputLabel>Selecteaza Template</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      label="Selecteaza Template"
                    >
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                          {template.isDefault ? ' (implicit)' : ''}
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
                    Salveaza ca Template Nou
                  </Button>

                  {selectedTemplate && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={async () => {
                        const template = templates.find(t => t.id === selectedTemplate);
                        if (!template) {
                          return;
                        }

                        const confirmed = await confirm({
                          title: 'Sterge Template',
                          bodyTitle: `Sigur doresti sa stergi template-ul "${template.name}"?`,
                          confirmText: 'Sterge',
                          cancelText: 'Anuleaza',
                          danger: true,
                        });

                        if (confirmed && operationId) {
                          try {
                            await operationSheetsApi.deleteOperationTemplate(operationId, selectedTemplate);
                            enqueueSnackbar('Template sters cu succes', { variant: 'success' });
                            setSelectedTemplate('');
                            await loadTemplates();
                          } catch (error) {
                            console.error('Failed to delete template:', error);
                            enqueueSnackbar('Eroare la stergerea template-ului', { variant: 'error' });
                          }
                        }
                      }}
                      title="Sterge Template"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {templates.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    Nu exista template-uri definite inca. Creeaza unul nou pentru aceasta operatie.
                  </Alert>
                ) : selectedTemplate ? (
                  renderTemplateMeta(selectedTemplate)
                ) : (
                  <Alert severity="info" variant="outlined">
                    Selecteaza un template pentru a incarca detaliile lui.
                  </Alert>
                )}
              </Stack>
            )}

            {activeVersion === 'PROJECT' && (
              isProjectRecipeLoaded ? (
                projectRecipe ? (
                  <Alert severity="success" variant="outlined">
                    Lucrezi pe reteta proiectului. Modificarile de aici afecteaza doar acest proiect.
                  </Alert>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Proiectul nu are inca o reteta salvata. Porneste de la o reteta existenta sau construieste una noua, apoi salveaz-o pentru proiect.
                  </Alert>
                )
              ) : (
                <Alert severity="info" variant="outlined">
                  Se incarca reteta proiectului...
                </Alert>
              )
            )}
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
          disabled={!!(projectId && !operationId)} // Disable if project context but no operation ID
          onClick={async () => {
            // Validation: Ensure we have operationId when saving to a project
            if (projectId && !operationId) {
              enqueueSnackbar('Eroare: ID operație lipsește', { variant: 'error' });
              return;
            }

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
            quantity: toNumber(item.cantitate),
            price: toNumber(item.costUnitar),
            packQuantity: item.packQuantity ?? null,
            packUnit: item.packUnit ?? null,
          })),
          ...consumabile.map(item => ({
            type: 'CONSUMABLE' as const,
            code: item.cod,
            name: item.denumire,
            description: item.denumire,
            unit: item.um,
            quantity: toNumber(item.cantitate),
            price: toNumber(item.pretUnitar),
            packQuantity: item.packQuantity ?? null,
            packUnit: item.packUnit ?? null,
          })),
          ...echipamente.map(item => ({
            type: 'EQUIPMENT' as const,
            code: item.cod,
            name: item.denumire,
            description: item.denumire,
            unit: item.um,
            quantity: toNumber(item.cantitate),
            price: toNumber(item.pretUnitar),
          })),
          ...manopera.map(item => ({
            type: 'LABOR' as const,
            code: item.cod,
            name: item.denumire,
            description: item.denumire,
            unit: item.um,
            quantity: toNumber(item.cantitate),
            price: toNumber(item.pretUnitar),
          })),
        ];

                console.log('Saving project operation sheet with items:', items);
                
                await operationSheetsApi.saveProjectOperationSheet(
                  projectId,
                  operationId,
                  { items }
                );

                enqueueSnackbar('Fișă operație salvată pentru proiect', { variant: 'success' });
                
                // Call callback with calculated unit price if provided
                if (onRecipeCalculated && totalRecipeCost > 0) {
                  onRecipeCalculated(totalRecipeCost);
                }
                
                onClose();
              } catch (error: unknown) {
                console.error('Failed to save project operation sheet:', error);
                let errorMsg = 'Eroare la salvare';
                if (error && typeof error === 'object' && 'response' in error) {
                  const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
                  console.error('Error response:', axiosError.response?.data);
                  errorMsg = axiosError.response?.data?.error ?? axiosError.message ?? errorMsg;
                } else if (error instanceof Error) {
                  errorMsg = error.message;
                }
                enqueueSnackbar(errorMsg, { variant: 'error' });
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
                    quantity: toNumber(item.cantitate),
                    price: toNumber(item.costUnitar),
                  })),
                  ...consumabile.map(item => ({
                    type: 'CONSUMABLE' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: toNumber(item.cantitate),
                    price: toNumber(item.pretUnitar),
                  })),
                  ...echipamente.map(item => ({
                    type: 'EQUIPMENT' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: toNumber(item.cantitate),
                    price: toNumber(item.pretUnitar),
                  })),
                  ...manopera.map(item => ({
                    type: 'LABOR' as const,
                    code: item.cod,
                    name: item.denumire,
                    unit: item.um,
                    quantity: toNumber(item.cantitate),
                    price: toNumber(item.pretUnitar),
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

                // Call callback with calculated unit price if provided
                if (onRecipeCalculated && totalRecipeCost > 0) {
                  onRecipeCalculated(totalRecipeCost);
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
/* eslint-enable react-hooks/exhaustive-deps */

