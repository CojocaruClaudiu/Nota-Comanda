import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  Alert, Chip, Badge, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  Skeleton
} from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import EventIcon from '@mui/icons-material/Event';
import UpdateIcon from '@mui/icons-material/Update';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BuildIcon from '@mui/icons-material/Build';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import { API_BASE_URL } from '../../api/baseUrl';

import {
  MaterialReactTable,
  useMaterialReactTable,
  createRow,
  type MRT_ColumnDef,
  type MRT_TableOptions,
} from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { rankItem } from '@tanstack/match-sorter-utils';
import { unitSelectOptions, isValidUnit, getMatchingUnit } from '../../utils/units';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import useNotistack from '../orders/hooks/useNotistack';
import { PriceHistoryModal } from './PriceHistoryModal';
import { UploadTechnicalSheetDialog } from './UploadTechnicalSheetDialog';

import {
  fetchUniqueMaterials,
  fetchMaterialFamiliesPreview,

  createMaterialWithoutGroup,
  updateMaterial,
  deleteMaterial,
  createMaterialFamily,
  updateMaterialFamily,
  deleteMaterialFamily,
  fetchMaterialFamilies,
  assignMaterialsToFamily,
  type MaterialFamilyRecord,
} from '../../api/materials';

const trim = (v?: string | null) => (v == null ? '' : String(v).trim());

// Smart parser to extract pack quantity and unit from material name/description
// Patterns: (1.03KG), (500G), (2.5L), (10BUC), (1,5KG), etc.
const parsePackFromName = (name: string): { quantity: number | null; unit: string | null } => {
  if (!name) return { quantity: null, unit: null };
  
  // Match patterns like (1.03KG), (500G), (2.5L), (10BUC), [1.5KG], etc.
  // Support both . and , as decimal separators
  const patterns = [
    /\((\d+[.,]\d+)\s*([a-zA-Z]+)\)/i,  // (1.03KG) or (1,5KG)
    /\[(\d+[.,]\d+)\s*([a-zA-Z]+)\]/i,  // [1.03KG]
    /\((\d+)\s*([a-zA-Z]+)\)/i,         // (500G) or (10BUC)
    /\[(\d+)\s*([a-zA-Z]+)\]/i,         // [500G]
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const quantityStr = match[1].replace(',', '.'); // Normalize decimal separator
      const quantity = parseFloat(quantityStr);
      const unitStr = match[2].toLowerCase();
      
      // Try to match the unit
      const matchedUnit = getMatchingUnit(unitStr);
      
      if (!isNaN(quantity) && quantity > 0 && matchedUnit) {
        return { quantity, unit: matchedUnit };
      }
    }
  }
  
  return { quantity: null, unit: null };
};

// Format date helper
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

/* ---------------- Types for the unified tree rows ---------------- */
type NodeType = 'group' | 'variant' | 'material';
interface TreeRow {
  type: NodeType;
  id: string;
  parentId?: string | null;
  familyId?: string | null;
  name: string;
  code?: string | null;
  supplierName?: string | null;
  supplierId?: string | null;
  unit?: string | null;
  packQuantity?: number | null;
  packUnit?: string | null;
  price?: number | null;
  currency?: 'RON' | 'EUR' | null;
  purchaseDate?: string | null;
  technicalSheet?: string | null;
  number: string;              // 1 / 1.1
  subRows?: TreeRow[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;               // Group > Material (for fuzzy/global filter)
  // Enriched fields
  purchaseCount?: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  suppliers?: string[];
}

/* ---------------- Build tree from API data ---------------- */
async function buildTree(): Promise<TreeRow[]> {
  // Prefer server-provided families preview (families + variants). Fall back to unique materials listing.
  try {
    const resp = await fetchMaterialFamiliesPreview();
    const families = resp.families || [];
    // If families feature isn't enabled or has no data, fall back to legacy unique materials
    if (!families.length) {
      const materials = await fetchUniqueMaterials();
      const byGroup = new Map<string, TreeRow[]>();
      materials.forEach((m) => {
        const key = (m.groupId || '').trim() || '(Fara grup)';
        const arr = byGroup.get(key) || [];
        arr.push({
          type: 'material' as const,
          id: m.id,
          parentId: key,
          name: m.description,
          code: m.code,
          supplierName: m.supplierName,
          supplierId: m.supplierId,
          unit: m.unit,
          packQuantity: m.packQuantity != null ? Number(m.packQuantity) : null,
          packUnit: m.packUnit,
          price: Number(m.price),
          currency: m.currency,
          purchaseDate: m.purchaseDate,
          technicalSheet: m.technicalSheet,
          number: '',
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          purchaseCount: m.purchaseCount,
          avgPrice: m.avgPrice ? Number(m.avgPrice) : undefined,
          minPrice: m.minPrice ? Number(m.minPrice) : undefined,
          maxPrice: m.maxPrice ? Number(m.maxPrice) : undefined,
          suppliers: m.suppliers,
        });
        byGroup.set(key, arr);
      });
      const groups: TreeRow[] = Array.from(byGroup.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([groupName, items]) => ({
          type: 'group' as const,
          id: groupName,
          parentId: null,
          name: groupName,
          number: '',
          subRows: items.sort((x, y) => (x.name || '').localeCompare(y.name || '')),
        }));
      return groups;
    }

    // Build 3-level tree: family -> product -> variants
    const nodes: TreeRow[] = families.map((f, fi) => {
      const variants = (f.variants || []) as any[];

      // Heuristic: derive a product key by stripping trailing pack-size tokens
      const normalizeProduct = (name: string) => {
        if (!name) return 'Unknown';
        let s = String(name).trim();
        // remove common pack-size patterns like '2KG', '2 KG', '5kg', '5 KG', '5 L', '5L', '2x5KG'
        s = s.replace(/(\b\d+(?:[.,]\d+)?\s?(kg|g|l|ml|buc|bucati|buc)\b)/ig, '').trim();
        // remove trailing parentheses content e.g. '(2KG)'
        s = s.replace(/\([^)]*\)/g, '').trim();
        // collapse multiple spaces
        s = s.replace(/\s{2,}/g, ' ');
        return s || name;
      };

      const productsByKey = new Map<string, TreeRow[]>();
      variants.forEach((v) => {
        const productKey = normalizeProduct(v.name || 'Variant');
        const arr = productsByKey.get(productKey) || [];
        arr.push({
          type: 'material' as const,
          id: v.materialId || v.id,
          parentId: `${f.summary.id}::product::${productKey}`,
          familyId: f.summary.id,
          name: v.name,
          code: (v as any).code || undefined,
          supplierName: v.defaultSupplier || undefined,
          unit: v.packUnit || undefined,
          packQuantity: v.packValue != null ? Number(v.packValue) : null,
          packUnit: v.packUnit,
          price: v.latestPrice ?? null,
          currency: 'RON',
          purchaseDate: (v as any).purchaseDate || undefined,
          technicalSheet: undefined,
          number: '', // Will be set after grouping
          createdAt: v.updatedAt,
          updatedAt: v.updatedAt,
          purchaseCount: v.purchasesCount,
          suppliers: v.defaultSupplier ? [v.defaultSupplier] : [],
          path: `${f.summary.name} > ${productKey} > ${v.name}`,
        });
        productsByKey.set(productKey, arr);
      });

      // Build product-level nodes (intermediate level)
      const productNodes: TreeRow[] = Array.from(productsByKey.entries()).map(([productKey, items], pi) => {
        // Sort variants and assign hierarchical numbers within this product
        const sortedItems = items.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
        sortedItems.forEach((item, itemIdx) => {
          item.number = `${fi + 1}.${pi + 1}.${itemIdx + 1}`;
        });
        
        return {
          type: 'variant' as const,
          id: `${f.summary.id}::product::${productKey}`,
          parentId: f.summary.id,
          familyId: f.summary.id,
          name: productKey,
          number: `${fi + 1}.${pi + 1}`,
          subRows: sortedItems,
          // aggregated stats could be attached here if needed
        };
      });

      return {
        type: 'group' as const,
        id: f.summary.id,
        parentId: null,
        name: f.summary.name,
        number: String(fi + 1),
        subRows: productNodes,
  createdAt: undefined,
  updatedAt: f.summary.lastPurchaseAt || undefined,
      };
    });

    // Also include materials that are NOT assigned to any family under a special "Fara familie" group
    try {
      const familyMaterialIds = new Set<string>();
      // nodes -> productNodes -> material variants. Collect material ids from two levels deep
      nodes.forEach((g) => {
        (g.subRows || []).forEach((p: TreeRow) => {
          (p.subRows || []).forEach((v: TreeRow) => {
            if (v && v.id) familyMaterialIds.add(v.id);
          });
        });
      });

      const unique = await fetchUniqueMaterials();
      const uniqueByCode = new Map<string, any>();
      unique.forEach((m) => { if ((m as any).code) uniqueByCode.set((m as any).code, m as any); });

      // Merge unique stats into family variants based on material code
      nodes.forEach((g) => {
        (g.subRows || []).forEach((p: TreeRow) => {
          p.subRows = (p.subRows || []).map((v) => {
            if (v.code && uniqueByCode.has(v.code)) {
              const um = uniqueByCode.get(v.code);
              return {
                ...v,
                price: v.price ?? (um.price != null ? Number(um.price) : null),
                currency: (um as any).currency || v.currency,
                purchaseDate: v.purchaseDate || (um as any).purchaseDate || null,
                purchaseCount: (um as any).purchaseCount ?? v.purchaseCount,
                avgPrice: (um as any).avgPrice != null ? Number((um as any).avgPrice) : v.avgPrice,
                minPrice: (um as any).minPrice != null ? Number((um as any).minPrice) : v.minPrice,
                maxPrice: (um as any).maxPrice != null ? Number((um as any).maxPrice) : v.maxPrice,
                suppliers: Array.isArray((um as any).suppliers) && (um as any).suppliers.length ? (um as any).suppliers : v.suppliers,
              } as any;
            }
            return v;
          }) as any;
        });
      });
      const unassignedItems: TreeRow[] = unique
        .filter((m) => !familyMaterialIds.has(m.id))
        .map((m) => ({
          type: 'material' as const,
          id: m.id,
          parentId: 'UNASSIGNED',
          name: m.description,
          code: m.code,
          supplierName: m.supplierName,
          supplierId: m.supplierId,
          unit: m.unit,
          packQuantity: m.packQuantity != null ? Number(m.packQuantity) : null,
          packUnit: m.packUnit,
          price: Number(m.price),
          currency: m.currency,
          purchaseDate: m.purchaseDate,
          technicalSheet: m.technicalSheet,
          number: '',
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          purchaseCount: m.purchaseCount,
          avgPrice: m.avgPrice ? Number(m.avgPrice) : undefined,
          minPrice: m.minPrice ? Number(m.minPrice) : undefined,
          maxPrice: m.maxPrice ? Number(m.maxPrice) : undefined,
          suppliers: m.suppliers,
        }));

      if (unassignedItems.length > 0) {
        nodes.push({
          type: 'group' as const,
          id: 'UNASSIGNED',
          parentId: null,
          name: 'Fără familie',
          number: '',
          subRows: unassignedItems.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
          createdAt: undefined,
          updatedAt: undefined,
        });
      }
    } catch {
      // If fetching unique materials fails, still return family nodes
    }

    return nodes;
  } catch (err) {
    // Fallback: older endpoint returning unique materials
    const materials = await fetchUniqueMaterials();

    // Group by groupId (existing MaterialGroup) so we show a 2-level tree even if families are not available
    const byGroup = new Map<string, TreeRow[]>();
    materials.forEach((m) => {
      const key = (m.groupId || '').trim() || '(Fara grup)';
      const arr = byGroup.get(key) || [];
      arr.push({
        type: 'material' as const,
        id: m.id,
        parentId: key,
        name: m.description,
        code: m.code,
        supplierName: m.supplierName,
        supplierId: m.supplierId,
        unit: m.unit,
        packQuantity: m.packQuantity != null ? Number(m.packQuantity) : null,
        packUnit: m.packUnit,
        price: Number(m.price),
        currency: m.currency,
        purchaseDate: m.purchaseDate,
        technicalSheet: m.technicalSheet,
        number: '',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        purchaseCount: m.purchaseCount,
        avgPrice: m.avgPrice ? Number(m.avgPrice) : undefined,
        minPrice: m.minPrice ? Number(m.minPrice) : undefined,
        maxPrice: m.maxPrice ? Number(m.maxPrice) : undefined,
        suppliers: m.suppliers,
      });
      byGroup.set(key, arr);
    });

    const groups: TreeRow[] = Array.from(byGroup.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, items]) => ({
        type: 'group' as const,
        id: groupName,
        parentId: null,
        name: groupName,
        number: '',
        subRows: items.sort((x, y) => (x.name || '').localeCompare(y.name || '')),
      }));

    return groups;
  }
}

// Numbering helper (will add simple numbering for group/item)
function numberize(tree: TreeRow[]): TreeRow[] {
  return tree.map((group, i) => {
    const groupNum = `${i + 1}`;
    const items = (group.subRows || []).map((it, j) => ({ ...it, number: `${groupNum}.${j + 1}` }));
    return { ...group, number: groupNum, subRows: items };
  });
}

/* ---------------- Add path for better searching ---------------- */
function addPaths(nodes: TreeRow[], parentPath = ''): TreeRow[] {
  return nodes.map((n) => {
    const self = n.supplierName ? `${n.name} ${n.supplierName}` : n.name;
    const path = parentPath ? `${parentPath} > ${self}` : self;
    const subRows = n.subRows ? addPaths(n.subRows, path) : undefined;
    return { ...n, path, subRows };
  });
}

/* ---------------- Little persist helper ---------------- */
const STORAGE_KEY = 'materials-table-state-v1';
type PersistState = Partial<{
  columnPinning: any;
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  density: 'compact' | 'comfortable' | 'spacious';
  pagination: { pageIndex: number; pageSize: number };
  sorting: any;
  globalFilter: string;
}>;

const loadPersist = (): PersistState => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};
const savePersist = (patch: PersistState) => {
  const prev = loadPersist();
  const next = { ...prev, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

/* ---------------- Page ---------------- */
// Create QueryClient outside component to avoid recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

function MaterialsPageContent() {
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [families, setFamilies] = useState<MaterialFamilyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticTree, setOptimisticTree] = useState<TreeRow[] | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignFamilyId, setAssignFamilyId] = useState<string | null>(null);
  const [makeVariantDialogOpen, setMakeVariantDialogOpen] = useState(false);
  const [makeVariantTargetId, setMakeVariantTargetId] = useState<string | null>(null);
  const [makeVariantValues, setMakeVariantValues] = useState<{ familyId?: string | null; variantName?: string; packQuantity?: number | null; packUnit?: string | null }>({});
  const confirm = useConfirm();
  const { successNotistack, errorNotistack } = useNotistack();

  // Price history modal state
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{ code: string; description: string } | null>(null);

  // Upload technical sheet dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedForUpload, setSelectedForUpload] = useState<{ id: string; name: string; currentFile?: string | null } | null>(null);

  // Delete family dialog state (strong confirmation)
  const [deleteFamilyOpen, setDeleteFamilyOpen] = useState(false);
  const [deleteFamilyTarget, setDeleteFamilyTarget] = useState<{ id: string; name: string; materialCount: number } | null>(null);
  const [deleteFamilyInput, setDeleteFamilyInput] = useState('');


  // where the creating row appears
  const [createPos, setCreatePos] = useState<'top' | 'bottom' | number>('top');

  // state persistence
  const persisted = loadPersist();
  // controlled sorting state
  const [sorting, setSorting] = useState<any>(
    Array.isArray(persisted.sorting) ? persisted.sorting : []
  );
  // controlled pagination state
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>(
    persisted.pagination ?? { pageIndex: 0, pageSize: 50 }
  );
  // controlled global filter state (fix search without refresh)
  const [globalFilter, setGlobalFilter] = useState<string>(
    typeof persisted.globalFilter === 'string' ? persisted.globalFilter : ''
  );

  // Optimistic update helper
  const applyOptimisticUpdate = useCallback((updater: (current: TreeRow[]) => TreeRow[]) => {
    setOptimisticTree(prev => updater(prev || tree));
  }, [tree]);

  const rollbackOptimistic = useCallback(() => {
    setOptimisticTree(null);
  }, []);

  const commitOptimistic = useCallback(() => {
    if (optimisticTree) {
      setTree(optimisticTree);
      setOptimisticTree(null);
    }
  }, [optimisticTree]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await buildTree();
      setTree(addPaths(numberize(t)));
    } catch (e: any) {
      setError(e?.message || 'Eroare la încarcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMaterialFamilies();
        setFamilies(list);
      } catch {
        setFamilies([]);
      }
    })();
  }, []);

  // Count material leaf nodes in the built tree (family -> product -> variant)
  const countMaterialLeaves = (t: TreeRow[] = []): number => {
    if (!t || !t.length) return 0;
    let c = 0;
    const walk = (nodes: TreeRow[]) => {
      nodes.forEach(n => {
        if (n.type === 'material') c += 1;
        if (n.subRows && n.subRows.length) walk(n.subRows);
      });
    };
    walk(t);
    return c;
  };

  const countMaterialsForRow = (row?: TreeRow | null): number => {
    if (!row?.subRows?.length) return 0;
    return countMaterialLeaves(row.subRows);
  };


  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(() => [
    // Hidden PATH column for powerful fuzzy/global filtering across hierarchy
    {
      id: 'path',
      header: 'Cautare',
      accessorKey: 'path',
      enableGlobalFilter: true,
      enableColumnFilter: true,
      filterFn: 'fuzzy' as any,
      size: 200,
      enableHiding: true,
      Cell: () => null,
    },
    // NUMBER column
    {
      accessorKey: 'number',
      header: '#',
      size: 80,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      muiTableHeadCellProps: { align: 'left' },
      muiTableBodyCellProps: { align: 'left', sx: { pl: 1.5, whiteSpace: 'nowrap' } },
      Cell: ({ row }) => (
        <Box
          sx={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.2,
          }}
        >
          {row.original.number || '—'}
        </Box>
      ),
      enableEditing: false,
    },
    // NAME column
    {
      accessorKey: 'name',
      header: 'Denumire',
      size: 520,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      enableColumnFilterModes: true,
      filterFn: 'fuzzy' as any,
      muiEditTextFieldProps: { required: true, autoFocus: true },
      Cell: ({ row, renderedCellValue }) => {
        const t = row.original.type;
        const sub = row.original.subRows || [];
        const indent = row.depth * 20;
        
        if (t === 'material') {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: `${indent}px` }}>
              <LabelIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />
              <Typography variant="body2">{renderedCellValue as string}</Typography>
            </Box>
          );
        }
        
        const itemsCount = sub.length;
        const isFamily = t === 'group';
        
        return (
          <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25, pl: `${indent}px` }}>
            {isFamily ? (
              <FolderOpenIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
            ) : (
              <CategoryIcon sx={{ color: 'info.main', fontSize: '1rem' }} />
            )}
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: isFamily ? 700 : 600,
                fontSize: isFamily ? '0.95rem' : '0.875rem',
              }}
            >
              {renderedCellValue as string}
            </Typography>
            <Chip 
              size="small" 
              variant="outlined" 
              label={itemsCount ?? 0}
              color={isFamily ? 'primary' : 'info'}
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
            />
          </Stack>
        );
      },
    },
    // FAMILY column (material rows only)
    {
      accessorKey: 'familyId',
      header: 'Familie',
      size: 220,
      enableGlobalFilter: true,
      enableColumnFilter: true,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '-';
        const famId = row.original.familyId ?? (row.original.parentId === 'UNASSIGNED' ? null : row.original.parentId);
        if (!famId) return 'Fara familie';
        const fam = families.find((f) => f.id === famId);
        return fam?.name || 'Fara familie';
      },
      muiEditTextFieldProps: ({ row }: any) => ({
        select: true,
        disabled: row?.original?.type !== 'material',
        children: [
          <MenuItem key="none" value="">Fara familie</MenuItem>,
          ...families.map((f) => (
            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
          )),
        ],
      }),
    },
    // CODE column (editable only for materials)
    {
      accessorKey: 'code',
      header: 'Cod',
      size: 140,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      muiEditTextFieldProps: ({ row }: any) => ({
        required: row?.original?.type === 'material',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row, renderedCellValue }) => {
  return row.original.type === 'material' ? renderedCellValue : '-';
      },
    },
    // SUPPLIER column
    {
      accessorKey: 'supplierName',
      header: 'Furnizor',
      size: 280,
      enableColumnFilter: true,
      enableGlobalFilter: true,
      enableEditing: false,
      Cell: ({ row, renderedCellValue }) => {
        return row.original.type === 'material' && renderedCellValue ? (
          <Tooltip title={row.original.supplierId ? `ID: ${row.original.supplierId}` : ''}>
            <Chip size="small" label={renderedCellValue as string} variant="outlined" color="primary" />
          </Tooltip>
        ) : '-';
      },
    },
    // UNIT column (editable only for materials)
    {
      id: 'unit',
      // Normalize the unit value so it matches select options
      accessorFn: (row) => getMatchingUnit(row.unit) || row.unit || '',
      header: 'UM',
      size: 120,
      enableColumnFilter: true,
      filterVariant: 'select',
      filterSelectOptions: unitSelectOptions as any,
      filterFn: 'equalsString' as any,
      editVariant: 'select',
      editSelectOptions: unitSelectOptions as any,
      muiEditTextFieldProps: ({ row }: any) => ({
        select: true,
        placeholder: 'Alege unitatea',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row, renderedCellValue }) => {
        const val = trim(renderedCellValue as string);
        return row.original.type === 'material' && val ? (
          <Chip size="small" variant="outlined" label={val} />
        ) : (
          '-'
        );
      },
    },
    // PACK QUANTITY column (editable only for materials)
    {
      accessorKey: 'packQuantity',
      header: 'Cant. pachet',
      size: 140,
      enableColumnFilter: false,
      muiEditTextFieldProps: ({ row }: any) => ({
        type: 'number',
        inputProps: { step: 0.001, min: 0 },
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '-';
        const value = row.original.packQuantity;
        if (value == null) return '-';
        const formatted = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 4 }).format(value);
        const packUnit = (row.original.packUnit || '').toLowerCase();
        // Detect suspicious values - likely data entry errors
        // E.g., value of 103 when name contains "(1.03KG)" - user probably meant 1.03
        const name = (row.original.name || '').toUpperCase();
        let isSuspicious = false;
        let suspicionReason = '';
        // Check if value is suspiciously high for weight/volume units
        if (value >= 100 && ['kg', 'g', 'l', 'ml'].includes(packUnit)) {
          // For ml: 300, 500, 750, 1000ml are normal bottle sizes
          const normalMlSizes = [100, 150, 200, 250, 300, 330, 350, 400, 500, 600, 750, 1000, 1500, 2000, 3000, 5000];
          const isNormalMlSize = packUnit === 'ml' && normalMlSizes.includes(value);
          
          if (!isNormalMlSize) {
            // Check if there's a smaller number in the name that might be the intended value
            const possibleDecimal = value / 100;
            const nameHasSmaller = name.includes(possibleDecimal.toFixed(2).replace('.', ',')) || 
                                    name.includes(possibleDecimal.toFixed(2)) ||
                                    name.includes(`(${possibleDecimal}`) ||
                                    name.includes(`/${possibleDecimal}`);
            if (nameHasSmaller) {
              isSuspicious = true;
              suspicionReason = `Valoare suspectă - poate ați vrut ${possibleDecimal.toFixed(2)} ${packUnit.toUpperCase()}?`;
            }
          }
        }
        // Check if value looks like it was extracted from a non-quantity part of name (e.g., "100LM" lumens)
        const numericPatterns = name.match(/\d+(?:LM|W|V|A|MM|CM)\b/gi);
        if (numericPatterns && numericPatterns.some(p => parseInt(p) === value)) {
          isSuspicious = true;
          suspicionReason = 'Valoare suspectă - pare extrasă din specificații tehnice, nu din cantitatea reală';
        }
        return (
          <Tooltip title={isSuspicious ? suspicionReason : ''} arrow>
            <Typography 
              variant="body2" 
              sx={isSuspicious ? { 
                color: 'warning.main', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              } : undefined}
            >
              {formatted}
              {isSuspicious && ' ⚠️'}
            </Typography>
          </Tooltip>
        );
      },
    },
    // PACK UNIT column (editable only for materials)
    {
      id: 'packUnit',
      // Normalize the packUnit value so it matches select options (handles "M." -> "m", etc.)
      accessorFn: (row) => getMatchingUnit(row.packUnit) || row.packUnit || '',
      header: 'UM pachet',
      size: 140,
      enableColumnFilter: true,
      filterVariant: 'select',
      filterSelectOptions: unitSelectOptions as any,
      filterFn: 'equalsString' as any,
      editVariant: 'select',
      editSelectOptions: unitSelectOptions as any,
      muiEditTextFieldProps: ({ row }: any) => ({
        select: true,
        placeholder: 'Alege unitatea pachetului',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row, renderedCellValue }) => {
        const val = trim(renderedCellValue as string);
        return row.original.type === 'material' && val ? (
          <Chip size="small" variant="outlined" color="secondary" label={val} />
        ) : (
          '-'
        );
      },
    },
    // PRICE column with trend indicator (editable only for materials)
    {
      accessorKey: 'price',
  header: 'Preț',
      size: 180,
      enableColumnFilter: false,
      muiEditTextFieldProps: ({ row }: any) => ({
        type: 'number',
        disabled: row?.original?.type !== 'material',
      }),
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '-';
        const price = row.original.price ?? 0;
        const avgPrice = row.original.avgPrice ?? price;
        const minPrice = row.original.minPrice ?? price;
        const maxPrice = row.original.maxPrice ?? price;
        const currency = row.original.currency ?? 'RON';
        
        // Determine price trend
        let TrendIcon = TrendingFlatIcon;
        let trendColor: 'success' | 'error' | 'inherit' = 'inherit';
        if (price < avgPrice * 0.95) {
          TrendIcon = TrendingDownIcon;
          trendColor = 'success'; // Lower price is good
        } else if (price > avgPrice * 1.05) {
          TrendIcon = TrendingUpIcon;
          trendColor = 'error'; // Higher price is bad
        }
        
        const tooltipText = `Curent: ${price.toFixed(2)} ${currency}\nMediu: ${avgPrice.toFixed(2)} ${currency}\nMin: ${minPrice.toFixed(2)} ${currency}\nMax: ${maxPrice.toFixed(2)} ${currency}`;
        
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2">{price.toFixed(2)} {currency}</Typography>
            {row.original.purchaseCount && row.original.purchaseCount > 1 && (
              <Tooltip title={tooltipText} arrow>
                <TrendIcon fontSize="small" color={trendColor} />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    // PURCHASE DATE column
    {
      accessorKey: 'purchaseDate',
  header: 'Data Achiziție',
      size: 150,
      enableColumnFilter: true,
      filterVariant: 'date-range',
      enableEditing: false,
      Cell: ({ row }) => {
  if (row.original.type !== 'material') return '-';
        const date = row.original.purchaseDate;
        if (!date) return <Chip size="small" label="N/A" variant="outlined" />;
        
        return (
          <Tooltip title={`Achiziționat: ${formatDate(date)}`}>
            <Chip 
              size="small" 
              icon={<EventIcon />} 
              label={formatDate(date)}
              variant="outlined"
              color="info"
            />
          </Tooltip>
        );
      },
    },
    // PURCHASE COUNT column
    {
      accessorKey: 'purchaseCount',
  header: 'Achiziții',
      size: 110,
      enableColumnFilter: true,
      filterVariant: 'range',
      enableEditing: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '-';
  // tolerate different backend shapes / types: purchaseCount, purchasesCount, purchase_count
  const raw = (row.original as any).purchaseCount ?? (row.original as any).purchasesCount ?? (row.original as any).purchase_count;
  const parsed = Number(raw);
  const count = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  const suppliers = row.original.suppliers ?? [];

  // show '-' when there are no purchases
  if (count <= 0) return '-';

        const tooltipText = `${count} achiziții\n${suppliers.length} furnizori: ${suppliers.slice(0, 3).join(', ')}${suppliers.length > 3 ? '...' : ''}`;

        return (
          <Tooltip title={tooltipText} arrow>
            <Badge badgeContent={count} color="primary" max={99}>
              <Chip size="small" label={`${count}`} color="primary" variant="outlined" />
            </Badge>
          </Tooltip>
        );
      },
    },
    // TECHNICAL SHEET column
    {
  accessorKey: 'technicalSheet',
  header: 'Fișă Tehnică',
      size: 150,
      enableEditing: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
  if (row.original.type !== 'material') return '-';
        const sheet = row.original.technicalSheet;
        
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {sheet ? (
              <>
                <Tooltip title="Descarcă fișă tehnică">
                  <Chip 
                    size="small" 
                    icon={<DownloadIcon />} 
                    label="Disponibil" 
                    color="success"
                    variant="filled"
                    onClick={() => {
                      const downloadUrl = `${API_BASE_URL}/materials/${row.original.id}/download-sheet`;
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      link.download = sheet.split('/').pop() || 'fisa-tehnica';
                      link.click();
                    }}
                    sx={{ fontWeight: 500, cursor: 'pointer' }}
                  />
                </Tooltip>
                <Tooltip title="Înlocuiește fișa tehnică">
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSelectedForUpload({
                        id: row.original.id,
                        name: row.original.name,
                        currentFile: sheet,
                      });
                      setUploadDialogOpen(true);
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
                <Button
                size="small" 
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => {
                  setSelectedForUpload({
                    id: row.original.id,
                    name: row.original.name,
                    currentFile: null,
                  });
                  setUploadDialogOpen(true);
                }}
                sx={{ 
                  borderStyle: 'dashed',
                  '&:hover': {
                    borderStyle: 'solid',
                  }
                }}
                >
                Încarca
              </Button>
            )}
          </Stack>
        );
      },
    },
    // LAST UPDATED column (hidden by default)
    {
      accessorKey: 'updatedAt',
      header: 'Actualizat',
      size: 150,
      enableEditing: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => {
        if (row.original.type !== 'material') return '-';
        const date = row.original.updatedAt;
        
        return (
          <Tooltip title={`Ultima modificare: ${formatDate(date)}`} arrow>
            <Chip 
              size="small" 
              icon={<UpdateIcon />} 
              label={formatDate(date)}
              variant="outlined"
            />
          </Tooltip>
        );
      },
    },
  ], [families]);

  /* -------- CRUD Handlers -------- */
  const handleCreateRow: MRT_TableOptions<TreeRow>['onCreatingRowSave'] = async ({ values, row, table }) => {
    setSaving(true);
    try {
      if ((row as any)?.original?.type === 'group') {
        const name = trim(values.name);
        if (!name) throw new Error('Denumirea este obligatorie');
        await createMaterialFamily(name);
        successNotistack('Familie creata cu succes!');
        await load();
        table.setCreatingRow(null);
        return;
      }
      const code = trim(values.code);
      const description = trim(values.name);
      const unit = getMatchingUnit(values.unit) || 'buc';
      const price = Number(values.price) || 0;
      
      // Smart parsing: extract pack quantity and unit from description if not provided
      const rawPackQuantity = values.packQuantity;
      let packQuantity =
        rawPackQuantity === undefined || rawPackQuantity === null || rawPackQuantity === ''
          ? null
          : Number(rawPackQuantity);
      
      const rawPackUnit = trim(values.packUnit);
      let packUnit = rawPackUnit ? getMatchingUnit(rawPackUnit) : '';
      
      // If pack info is not provided, try to parse from description
      if (!packQuantity && !packUnit) {
        const parsed = parsePackFromName(description);
        if (parsed.quantity && parsed.unit) {
          packQuantity = parsed.quantity;
          packUnit = parsed.unit;
        }
      }

      if (!code || !description) throw new Error('Codul si descrierea sunt obligatorii');
      if (!isValidUnit(unit)) throw new Error('Unitate invalida: ' + unit);
      if (packQuantity != null && (!Number.isFinite(packQuantity) || packQuantity <= 0)) {
        throw new Error('Cantitatea pachetului trebuie sa fie un numar pozitiv');
      }
      // Only validate if there's a raw value but it didn't match any valid unit
      if (rawPackUnit && !packUnit) {
        throw new Error('Unitate pachet invalida: ' + rawPackUnit);
      }
      const hasPackQuantity = packQuantity != null;
      const hasPackUnit = !!packUnit;
      if (hasPackQuantity !== hasPackUnit) {
        throw new Error('Completeaza atat cantitatea, cat si unitatea pachetului');
      }

      // include familyId if the creating row was placed under a family (parentId)
      const payload: any = {
        code,
        description,
        unit,
        price,
        currency: 'RON',
        packQuantity,
        packUnit: packUnit || null,
      };
      const parentId = (row as any)?.original?.parentId;
      if (parentId && parentId !== 'UNASSIGNED') {
        const pid = String(parentId);
        // if created under a product node, product id format: `${familyId}::product::${productKey}`
        if (pid.includes('::product::')) {
          payload.familyId = pid.split('::product::')[0];
        } else {
          // parentId may already be the family id
          payload.familyId = pid;
        }
      }

      // Optimistic update: add temporary material immediately
      const tempId = `temp_${Date.now()}`;
      applyOptimisticUpdate(current => {
        const newMaterial: TreeRow = {
          type: 'material',
          id: tempId,
          name: description,
          code,
          unit,
          price,
          currency: 'RON',
          packQuantity,
          packUnit: packUnit || null,
          number: '0',
        };
        return [...current, newMaterial];
      });
      
      try {
        await createMaterialWithoutGroup(payload as any);
        successNotistack('Material creat cu succes!');
        await load();
        commitOptimistic();
        table.setCreatingRow(null);
      } catch (error) {
        rollbackOptimistic();
        throw error;
      }
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la creare');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRow: MRT_TableOptions<TreeRow>['onEditingRowSave'] = async ({ row, values, table }) => {
    setSaving(true);
    try {
      if (row.original.type === 'group') {
        const name = trim(values.name);
        if (!name) throw new Error('Denumirea este obligatorie');
        
        // Optimistic update for family
        applyOptimisticUpdate(current => {
          return current.map(item => 
            item.id === row.original.id && item.type === 'group'
              ? { ...item, name }
              : item
          );
        });
        
        try {
          await updateMaterialFamily(row.original.id, name);
          successNotistack('Familie actualizata!');
          await load();
          commitOptimistic();
          table.setEditingRow(null);
        } catch (error) {
          rollbackOptimistic();
          throw error;
        }
        return;
      }
      const code = trim(values.code);
      const description = trim(values.name);
      const unit = getMatchingUnit(values.unit) || 'buc';
      const price = Number(values.price) || 0;
      
      // Smart parsing: extract pack quantity and unit from description if not provided
      const rawPackQuantity = values.packQuantity;
      let packQuantity =
        rawPackQuantity === undefined || rawPackQuantity === null || rawPackQuantity === ''
          ? null
          : Number(rawPackQuantity);
      
      const rawPackUnit = trim(values.packUnit);
      let packUnit = rawPackUnit ? getMatchingUnit(rawPackUnit) : '';
      
      // If pack info is not provided or user left it empty, try to parse from description
      if (!packQuantity && !packUnit) {
        const parsed = parsePackFromName(description);
        if (parsed.quantity && parsed.unit) {
          packQuantity = parsed.quantity;
          packUnit = parsed.unit;
        }
      }

      if (!code || !description) throw new Error('Codul si descrierea sunt obligatorii');
      if (!isValidUnit(unit)) throw new Error('Unitate invalida: ' + unit);
      if (packQuantity != null && (!Number.isFinite(packQuantity) || packQuantity <= 0)) {
        throw new Error('Cantitatea pachetului trebuie sa fie un numar pozitiv');
      }
      // Only validate if there's a raw value but it didn't match any valid unit
      if (rawPackUnit && !packUnit) {
        throw new Error('Unitate pachet invalida: ' + rawPackUnit);
      }
      const hasPackQuantity = packQuantity != null;
      const hasPackUnit = !!packUnit;
      if (hasPackQuantity !== hasPackUnit) {
        throw new Error('Completeaza atat cantitatea, cat si unitatea pachetului');
      }

      const nextFamilyId = (values as any).familyId;
      const patch: any = {
        code,
        description,
        unit,
        price,
        currency: row.original.currency || 'RON',
        technicalSheet: row.original.technicalSheet,
        packQuantity,
        packUnit: packUnit || null,
      };
      if (typeof nextFamilyId !== 'undefined') {
        patch.familyId = nextFamilyId ? String(nextFamilyId) : null;
      }

      // Optimistic update for material
      applyOptimisticUpdate(current => {
        const updateRow = (items: TreeRow[]): TreeRow[] => {
          return items.map(item => {
            if (item.id === row.original.id && item.type === 'material') {
              return { ...item, code, name: description, unit, price, packQuantity, packUnit: packUnit || null };
            }
            if (item.subRows) {
              return { ...item, subRows: updateRow(item.subRows) };
            }
            return item;
          });
        };
        return updateRow(current);
      });

      try {
        await updateMaterial(row.original.id, patch);
        successNotistack('Material actualizat cu succes!');
        await load();
        commitOptimistic();
        table.setEditingRow(null);
      } catch (error) {
        rollbackOptimistic();
        throw error;
      }
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la actualizare');
    } finally {
      setSaving(false);
    }
  };

  /* -------- Table -------- */
  const table = useMaterialReactTable<TreeRow>({
    columns,
    data: optimisticTree || tree,

  // row identification (prefix with type to avoid collisions)
  getRowId: (row) => `${row.type}:${row.id}`,

  // tree
  getSubRows: (row) => row.subRows,
  getRowCanExpand: (row) => row.original?.type !== 'material',
  enableExpanding: true,
  enableExpandAll: true,
  // Performance optimizations
    enableRowVirtualization: true,
    enablePagination: true,
    enableBottomToolbar: true,
  enableRowSelection: true,
    
    // filtering & sorting
    enableGlobalFilter: true,
    // include subRows (materials) when filtering groups by global/search
    filterFromLeafRows: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    enableFilterMatchHighlighting: true,  // Re-enabled for yellow highlighting
    enableFacetedValues: false,
    enableSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: true,
    globalFilterFn: 'fuzzy' as any,
    filterFns: {
      fuzzy: (row: any, columnId: string, value: string, addMeta: (meta: any) => void) => {
        if (!value) return true;
        const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
        const searchValue = String(value).toLowerCase();
        // Simple case-insensitive search for better performance
        if (cellValue.includes(searchValue)) {
          addMeta?.({ rank: 1 });
          return true;
        }
        // Fall back to fuzzy match for more sophisticated searches
        const itemRank = rankItem(cellValue, searchValue);
        addMeta?.(itemRank);
        return itemRank.passed;
      },
    },

    // editing
    enableEditing: true,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    onCreatingRowSave: handleCreateRow,
    onEditingRowSave: handleEditRow,
    positionCreatingRow: createPos,

    // row actions
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row, table }) => {
      const isContainer = row.original.type !== 'material';
      return (
        <Stack direction="row" gap={1} justifyContent="flex-end">
          {!isContainer ? null : null}
          {/* show history/edit/delete for material rows only (non-containers) */}
          {!isContainer && (
            <Tooltip title="Istoric Prețuri">
              <span>
                <IconButton
                  size="small"
                  color="info"
                  onClick={() => {
                    setSelectedMaterial({
                      code: row.original.code || '',
                      description: row.original.name,
                    });
                    setPriceHistoryOpen(true);
                  }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {isContainer && (
            <>
              <Tooltip title="Adaugă variantă">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const tempId = `__new__${Date.now()}_${Math.random().toString(16).slice(2)}`;
                      const insertIndex = (row.index ?? 0) + 1;
                      table.setCreatingRow(
                        createRow(
                          table,
                          {
                            type: 'material',
                            id: tempId,
                            parentId: row.original.id,
                            name: '',
                            code: '',
                            unit: 'buc',
                            packQuantity: null,
                            packUnit: '',
                            price: 0,
                            currency: 'RON',
                            number: '',
                          },
                          insertIndex,
                          row.depth + 1,
                        ),
                      );
                    }}
                  >
                    <AddRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Șterge familie">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={row.original.id === 'UNASSIGNED' || countMaterialsForRow(row.original) > 0}
                    onClick={() => {
                      const materialCount = countMaterialsForRow(row.original);
                      setDeleteFamilyTarget({
                        id: row.original.id,
                        name: row.original.name,
                        materialCount,
                      });
                      setDeleteFamilyInput('');
                      setDeleteFamilyOpen(true);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}

          {!isContainer && (
            <>
              <Tooltip title="Mută în variantă / Asignează familie">
                <span>
                  <IconButton size="small" onClick={() => {
                    setMakeVariantTargetId(row.original.id);
                    setMakeVariantValues({ familyId: row.original.familyId ?? null, variantName: row.original.name, packQuantity: row.original.packQuantity ?? null, packUnit: row.original.packUnit ?? '' });
                    setMakeVariantDialogOpen(true);
                  }}>
                    <FolderOpenIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Editeaza">
                <span>
                  <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Șterge">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      const r = row.original;
                      const title = 'Confirmare ștergere';
                      const bodyTitle = 'Ești sigur că vrei să ștergi?';
                      const desc = (<span>Materialul <strong>{r.name}</strong> va fi șters permanent.</span>);
                      const ok = await confirm({ title, bodyTitle, description: desc, confirmText: 'Șterge', cancelText: 'Anulează', danger: true });
                      if (!ok) return;
                      
                      setSaving(true);
                      
                      // Optimistic delete: remove immediately from UI
                      applyOptimisticUpdate(current => {
                        const removeFromTree = (items: TreeRow[]): TreeRow[] => {
                          return items.filter(item => {
                            if (item.id === r.id) return false;
                            if (item.subRows) {
                              item.subRows = removeFromTree(item.subRows);
                            }
                            return true;
                          });
                        };
                        return removeFromTree(current);
                      });
                      
                      try {
                        await deleteMaterial(r.id);
                        successNotistack('Material șters cu succes!');
                        await load();
                        commitOptimistic();
                      } catch (e: any) {
                        rollbackOptimistic();
                        errorNotistack(e?.message || 'Eroare la ștergere');
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </Stack>
      );
    },

    // top toolbar
    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" gap={1}>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            const tempId = `__new__${Date.now()}_${Math.random().toString(16).slice(2)}`;
            setCreatePos(0);
            table.setCreatingRow(
              createRow(
                table,
                { type: 'group', id: tempId, parentId: null, name: '', number: '', subRows: [] },
                0,
                0,
              ),
            );
          }}
        >
          Adauga familie
        </Button>
        <Button
          variant="outlined"
          onClick={() => setAssignDialogOpen(true)}
          disabled={table.getSelectedRowModel().flatRows.filter(r => r.original?.type === 'material').length === 0}
        >
          Asignează familie
        </Button>
        <Button
          variant="outlined"
          onClick={async () => {
            const selected = table.getSelectedRowModel().flatRows.map(r => r.original).filter((o: any) => o.type === 'material');
            if (!selected.length) return;
            const ok = await confirm({ title: 'Scoate din familie', description: `Sunteți sigur că doriți să scoateți ${selected.length} materiale din familiile lor?`, confirmText: 'Scoate', cancelText: 'Anulează' });
            if (!ok) return;
            try {
              setSaving(true);
              await Promise.all(selected.map((m: any) => updateMaterial(m.id, { familyId: null } as any)));
              successNotistack(`${selected.length} materiale scoase din familie`);
              await load();
            } catch (e: any) {
              errorNotistack(e?.message || 'Eroare la scoatere din familie');
            } finally {
              setSaving(false);
            }
          }}
          disabled={table.getSelectedRowModel().flatRows.filter(r => r.original?.type === 'material').length === 0}
        >
          Scoate din familie
        </Button>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            setCreatePos(0);
            table.setCreatingRow(
              createRow(table, {
                type: 'material',
                id: `__new__${Date.now()}`,
                name: '',
                code: '',
                unit: 'buc',
                packQuantity: null,
                packUnit: '',
                price: 0,
                currency: 'RON',
                number: '',
              }, 0, 0),
            );
          }}
        >
          Adauga Material
        </Button>
        <Tooltip title="Detectează și corectează automat cantitățile/unitățile de ambalare extrase din numele materialelor">
          <Button 
            variant="outlined" 
            color="warning"
            startIcon={<BuildIcon />}
            onClick={handleBulkFixPackInfo}
            disabled={loading || saving}
            sx={{ fontWeight: 600 }}
          >
            Corectează valori
          </Button>
        </Tooltip>
        <Tooltip title="Grupează automat materialele în familii bazat pe prefixele din nume (ex: CHIT, VOPSEA, etc.)">
          <Button 
            variant="contained" 
            color="success"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleIntelligentAutoGroup}
            disabled={loading || saving}
            sx={{ fontWeight: 600 }}
          >
            Auto-grupare
          </Button>
        </Tooltip>
        <Tooltip title="Reîncarcă datele">
          <IconButton onClick={() => load()} disabled={loading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    ),

    // localization
    localization: MRT_Localization_RO,

    // look & feel like Qualifications page
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    displayColumnDefOptions: {
      'mrt-row-actions': { header: 'Acțiuni', size: 180 },
    },
    muiTablePaperProps: {
      sx: {
        height: '100%',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
    },
    muiTableContainerProps: {
      sx: {
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxHeight: '100%',
        overflow: 'auto',
      },
    },
    rowVirtualizerOptions: { overscan: 10 },
    muiTableBodyRowProps: ({ row }) => {
      const rowType = row.original?.type;
      let bgColor = 'inherit';
      let borderLeft = 'none';
      
      // Distinct color coding by hierarchy level
      if (rowType === 'group') {
        bgColor = 'rgba(25, 118, 210, 0.08)'; // Blue for families
        borderLeft = '4px solid rgba(25, 118, 210, 0.5)';
      } else if (rowType === 'variant') {
        bgColor = 'rgba(33, 150, 243, 0.04)'; // Light blue for products
        borderLeft = '3px solid rgba(33, 150, 243, 0.3)';
      }
      
      return { 
        sx: { 
          backgroundColor: bgColor,
          borderLeft,
          '&:hover': {
            backgroundColor: rowType === 'group' ? 'rgba(25, 118, 210, 0.15)' : 
                            rowType === 'variant' ? 'rgba(33, 150, 243, 0.08)' : 
                            'rgba(0, 0, 0, 0.04)',
          },
          transition: 'all 0.15s ease',
        } 
      };
    },

    // state persistence
    initialState: {
      ...persisted,
      columnVisibility: { 
        ...persisted.columnVisibility, 
        path: false,
        updatedAt: false  // Hide "Last Updated" column by default
      },
      density: (persisted.density as any) ?? 'compact',
      showGlobalFilter: true,
      // Expand all rows by default so the full tree (families -> products -> variants) is visible
      expanded: true,
      pagination: { pageIndex: 0, pageSize: 1000 },  // Default to large page so expanded tree shows many materials
      globalFilter: typeof persisted.globalFilter === 'string' ? persisted.globalFilter : '',
    },
    autoResetExpanded: false,
    onColumnVisibilityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().columnVisibility) : updater;
      savePersist({ columnVisibility: value as any });
    },
    onDensityChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().density) : updater;
      savePersist({ density: value as any });
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ pagination: next as any });
        return next;
      });
    },
    onSortingChange: (updater) => {
      setSorting((prev: any) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        savePersist({ sorting: next as any });
        return next;
      });
    },
    onGlobalFilterChange: (updater) => {
      const value = typeof updater === 'function' ? updater(table.getState().globalFilter) : updater;
      setGlobalFilter(String(value ?? ''));
      savePersist({ globalFilter: value as any });
    },

    // controlled loading banners
    state: {
      isLoading: loading,
      showProgressBars: saving,
      showAlertBanner: !!error,
      sorting,
      pagination,
      globalFilter,
    },
  });

  // Dialog handlers (component-scope) — ensure these are defined before JSX uses them
  const getSelectedMaterialIds = () => {
    try {
      return table.getSelectedRowModel().flatRows
        .map((r: any) => r.original)
        .filter((o: any) => o.type === 'material')
        .map((m: any) => m.id);
    } catch {
      return [] as string[];
    }
  };

  const handleAssignConfirm = async () => {
    const ids = getSelectedMaterialIds();
    if (!ids.length || !assignFamilyId) return;
    try {
      setSaving(true);
      await assignMaterialsToFamily(String(assignFamilyId), ids);
      successNotistack(`${ids.length} materiale atribuite familiei`);
      setAssignDialogOpen(false);
      setAssignFamilyId(null);
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la asignare');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeVariantConfirm = async () => {
    if (!makeVariantTargetId) return;
    const target = makeVariantTargetId;
    const values = makeVariantValues || {};
    try {
      setSaving(true);
      if (values.familyId) {
        await assignMaterialsToFamily(String(values.familyId), [target]);
      }
      const patch: any = {};
      if (values.variantName) patch.name = values.variantName;
      if (typeof values.packQuantity !== 'undefined') patch.packQuantity = values.packQuantity ?? null;
      if (typeof values.packUnit !== 'undefined') patch.packUnit = values.packUnit || null;
      if (Object.keys(patch).length > 0) {
        await updateMaterial(target, patch as any);
      }
      successNotistack('Material actualizat ca variantă');
      setMakeVariantDialogOpen(false);
      setMakeVariantTargetId(null);
      setMakeVariantValues({});
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la setare variantă');
    } finally {
      setSaving(false);
    }
  };

  // Bulk fix materials with incorrect pack quantity/unit
  const handleBulkFixPackInfo = async () => {
    const allMaterials = tree.flatMap(item => {
      const materials: TreeRow[] = [];
      const walk = (node: TreeRow) => {
        if (node.type === 'material') materials.push(node);
        if (node.subRows) node.subRows.forEach(walk);
      };
      walk(item);
      return materials;
    });

    // Find materials that need fixing
    const toFix: Array<{ id: string; name: string; code: string; currentQty: number | null; currentUnit: string | null; newQty: number; newUnit: string }> = [];
    
    for (const material of allMaterials) {
      const parsed = parsePackFromName(material.name);
      if (parsed.quantity && parsed.unit) {
        const needsUpdate = 
          material.packQuantity !== parsed.quantity ||
          material.packUnit !== parsed.unit;
        
        if (needsUpdate) {
          toFix.push({
            id: material.id,
            name: material.name,
            code: material.code || '',
            currentQty: material.packQuantity,
            currentUnit: material.packUnit,
            newQty: parsed.quantity,
            newUnit: parsed.unit,
          });
        }
      }
    }

    if (toFix.length === 0) {
      successNotistack('Nu sunt materiale care necesită corecții!');
      return;
    }

    const ok = await confirm({
      title: 'Corectare automată',
      description: (
        <div>
          <div style={{ marginBottom: '8px' }}>Găsite {toFix.length} materiale cu informații de ambalare incorecte.</div>
          <div style={{ fontSize: '0.75rem', marginTop: '8px', marginBottom: '4px', opacity: 0.7 }}>
            Exemple:
          </div>
          <ul style={{ marginTop: '4px', paddingLeft: '16px', maxHeight: '200px', overflow: 'auto' }}>
            {toFix.slice(0, 5).map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                <strong>{item.name.substring(0, 50)}...</strong>
                <br />
                {item.currentQty || '—'} {item.currentUnit || '—'} → {item.newQty} {item.newUnit}
              </li>
            ))}
            {toFix.length > 5 && <li style={{ fontSize: '0.75rem' }}>...și încă {toFix.length - 5}</li>}
          </ul>
        </div>
      ),
      confirmText: 'Corectează',
      cancelText: 'Anulează',
    });

    if (!ok) return;

    setSaving(true);
    try {
      let fixed = 0;
      for (const item of toFix) {
        await updateMaterial(item.id, {
          code: item.code,
          description: item.name,
          packQuantity: item.newQty,
          packUnit: item.newUnit,
        });
        fixed++;
      }
      successNotistack(`${fixed} materiale corectate cu succes!`);
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la corectare');
    } finally {
      setSaving(false);
    }
  };

  // Intelligent auto-grouping: analyzes all materials and groups by detected prefixes
  const handleIntelligentAutoGroup = async () => {
    const allMaterials = tree.flatMap(item => {
      const materials: TreeRow[] = [];
      const walk = (node: TreeRow) => {
        if (node.type === 'material') materials.push(node);
        if (node.subRows) node.subRows.forEach(walk);
      };
      walk(item);
      return materials;
    });

    // Filter unassigned materials only
    const unassigned = allMaterials.filter(m => !m.familyId);

    if (unassigned.length === 0) {
      successNotistack('Toate materialele sunt deja asignate în familii!');
      return;
    }

    // Normalize prefix to handle plurals and variations (ANCORA/ANCORE -> ANCOR)
    const normalizePrefix = (prefix: string): string => {
      const upper = prefix.toUpperCase();
      // Remove common Romanian plural/variation suffixes
      return upper
        .replace(/URI$/, '')      // VOPSELE -> VOPSEL, MATERIALE -> MATERIAL
        .replace(/LE$/, '')       // ANCORE -> ANCOR
        .replace(/[EI]$/, '')     // ANCORA -> ANCOR, VOPSI -> VOPS
        .replace(/([^AEIOU])\1+$/, '$1'); // Remove duplicate consonants at end
    };

    // Extract meaningful prefix from material name (skip product codes like C265-)
    const extractPrefix = (name: string): string | null => {
      // Find all words (letter sequences)
      const words = name.match(/[A-ZĂÂÎȘȚa-zăâîșț]+/g);
      if (!words || words.length === 0) return null;

      // Try to find the first "meaningful" word (at least 4 characters)
      // Skip short codes like "C", "ICA", etc. if followed by longer words
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // If word is 4+ chars, use it
        if (word.length >= 4) {
          return word.toUpperCase();
        }
        // If it's the last word and 3+ chars, use it
        if (i === words.length - 1 && word.length >= 3) {
          return word.toUpperCase();
        }
        // If word is very short (1-2 chars) followed by numbers, skip it (likely a code)
        if (word.length <= 2) {
          const afterWord = name.substring(name.indexOf(word) + word.length);
          if (/^\d/.test(afterWord)) {
            continue; // Skip codes like "C265", "A123", etc.
          }
        }
        // If word is 3 chars and there are longer words after it, skip
        if (word.length === 3 && words.slice(i + 1).some(w => w.length >= 4)) {
          continue;
        }
      }
      // Fallback to first word if nothing better found
      return words[0].toUpperCase();
    };

    // Extract first word/prefix from each material name
    const rawPrefixGroups = new Map<string, { normalized: string; materials: TreeRow[] }>();
    
    for (const material of unassigned) {
      const rawPrefix = extractPrefix(material.name);
      if (rawPrefix) {
        const normalized = normalizePrefix(rawPrefix);
        
        if (!rawPrefixGroups.has(rawPrefix)) {
          rawPrefixGroups.set(rawPrefix, { normalized, materials: [] });
        }
        rawPrefixGroups.get(rawPrefix)!.materials.push(material);
      }
    }

    // Merge groups with same normalized prefix
    const prefixGroups = new Map<string, TreeRow[]>();
    const normalizedToDisplay = new Map<string, string>(); // Track which display name to use
    
    for (const [rawPrefix, { normalized, materials }] of rawPrefixGroups.entries()) {
      if (!prefixGroups.has(normalized)) {
        prefixGroups.set(normalized, []);
        // Use the longest raw prefix as display name (ANCORA preferred over ANCOR)
        normalizedToDisplay.set(normalized, rawPrefix);
      } else {
        // Update display name if this variant is longer
        const currentDisplay = normalizedToDisplay.get(normalized)!;
        if (rawPrefix.length > currentDisplay.length) {
          normalizedToDisplay.set(normalized, rawPrefix);
        }
      }
      prefixGroups.get(normalized)!.push(...materials);
    }

    // Filter groups with at least 2 materials (min group size)
    const validGroups = Array.from(prefixGroups.entries())
      .filter(([_, materials]) => materials.length >= 2)
      .sort((a, b) => b[1].length - a[1].length); // Sort by size descending

    if (validGroups.length === 0) {
      successNotistack('Nu s-au detectat grupuri cu prefixe comune (minim 2 materiale per grup)');
      return;
    }

    const totalMaterials = validGroups.reduce((sum, [_, mats]) => sum + mats.length, 0);

    const ok = await confirm({
      title: 'Grupare automată inteligentă',
      description: `Detectate ${validGroups.length} grupuri (${totalMaterials} materiale):\n\n` +
        validGroups.slice(0, 10).map(([normalized, materials]) => {
          const displayName = normalizedToDisplay.get(normalized)!;
          return `• ${displayName}: ${materials.length} materiale (Ex: ${materials[0].name.substring(0, 40)}...)`;
        }).join('\n') +
        (validGroups.length > 10 ? `\n...și încă ${validGroups.length - 10} grupuri` : ''),
      confirmText: 'Grupează automat',
      cancelText: 'Anulează',
    });

    if (!ok) return;

    setSaving(true);
    try {
      const families = await fetchMaterialFamilies();
      
      // First, merge duplicate families (e.g., ANCORA and ANCORE)
      const normalizedMap = new Map<string, MaterialFamilyRecord[]>();
      for (const family of families) {
        const normalized = normalizePrefix(family.name);
        if (!normalizedMap.has(normalized)) {
          normalizedMap.set(normalized, []);
        }
        normalizedMap.get(normalized)!.push(family);
      }

      // Handle duplicates: keep the longest name, merge others into it
      let merged = 0;
      for (const [normalized, duplicates] of normalizedMap.entries()) {
        if (duplicates.length > 1) {
          // Sort by name length (longest first) and by material count
          duplicates.sort((a, b) => b.name.length - a.name.length);
          const primary = duplicates[0];
          const toMerge = duplicates.slice(1);

          for (const duplicate of toMerge) {
            // Get all materials from duplicate family and reassign to primary
            const materialsInDuplicate = allMaterials.filter(m => m.familyId === duplicate.id);
            if (materialsInDuplicate.length > 0) {
              await assignMaterialsToFamily(primary.id, materialsInDuplicate.map(m => m.id));
              merged += materialsInDuplicate.length;
            }
            // Reload materials to reflect updates, then delete duplicate family
            await load();
            const refreshedMaterials = tree.flatMap(item => {
              const mats: TreeRow[] = [];
              const walk = (node: TreeRow) => {
                if (node.type === 'material') mats.push(node);
                if (node.subRows) node.subRows.forEach(walk);
              };
              walk(item);
              return mats;
            });
            // Only delete if family is now empty
            const stillHasMaterials = refreshedMaterials.some(m => m.familyId === duplicate.id);
            if (!stillHasMaterials) {
              await deleteMaterialFamily(duplicate.id);
            }
          }
        }
      }

      // Refresh families list after cleanup
      const updatedFamilies = await fetchMaterialFamilies();
      let created = 0;
      let assigned = 0;

      for (const [normalized, materials] of validGroups) {
        const displayName = normalizedToDisplay.get(normalized)!;
        // Check if family exists (match by normalized name)
        let family = updatedFamilies.find(f => normalizePrefix(f.name) === normalized);
        
        // Create family if it doesn't exist
        if (!family) {
          family = await createMaterialFamily(displayName);
          created++;
        }

        // Assign materials to family
        await assignMaterialsToFamily(family.id, materials.map(m => m.id));
        assigned += materials.length;
      }

      const msg = merged > 0 
        ? `${merged} materiale mutate din familii duplicate, ${created} familii create, ${assigned} materiale grupate!`
        : `${created} familii create, ${assigned} materiale grupate!`;
      successNotistack(msg);
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || 'Eroare la grupare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <Inventory2RoundedIcon color="primary" />
            <Typography variant="h5">Materiale</Typography>
            {!loading && tree.length > 0 && (
              <Chip 
                size="small" 
                label={`${countMaterialLeaves(tree)} materiale`}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
          
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Price History Modal */}
      {selectedMaterial && (
        <PriceHistoryModal
          open={priceHistoryOpen}
          onClose={() => {
            setPriceHistoryOpen(false);
            setSelectedMaterial(null);
          }}
          materialCode={selectedMaterial.code}
          materialDescription={selectedMaterial.description}
        />
      )}

      {/* Upload Technical Sheet Dialog */}
      {selectedForUpload && (
        <UploadTechnicalSheetDialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setSelectedForUpload(null);
          }}
          materialId={selectedForUpload.id}
          materialName={selectedForUpload.name}
          currentFile={selectedForUpload.currentFile}
            onUploadSuccess={() => {
            successNotistack('Fișa tehnică a fost actualizată!');
            load(); // Reload to show updated file status
          }}
        />
      )}

      {/* Assign Family Dialog (inline to avoid reference issues) */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Asignează familie</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="assign-family-label">Familie</InputLabel>
            <Select
              labelId="assign-family-label"
              value={assignFamilyId ?? ''}
              label="Familie"
              onChange={(e: any) => setAssignFamilyId(e.target.value || null)}
            >
              <MenuItem value="">-- alege familie --</MenuItem>
              {families.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Anulează</Button>
          <Button disabled={!assignFamilyId} onClick={handleAssignConfirm} variant="contained">Confirmă</Button>
        </DialogActions>
      </Dialog>

      {/* Make Variant Dialog (inline) */}
      <Dialog open={makeVariantDialogOpen} onClose={() => setMakeVariantDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Setează variantă</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="make-variant-family-label">Familie</InputLabel>
            <Select
              labelId="make-variant-family-label"
              value={makeVariantValues.familyId ?? ''}
              label="Familie"
              onChange={(e: any) => setMakeVariantValues({ ...makeVariantValues, familyId: e.target.value || null })}
            >
              <MenuItem value="">-- alege familie (opțional) --</MenuItem>
              {families.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Nume variantă (opțional)"
            sx={{ mt: 2 }}
            value={makeVariantValues.variantName ?? ''}
            onChange={(e) => setMakeVariantValues({ ...makeVariantValues, variantName: e.target.value })}
          />
          <TextField
            fullWidth
            label="Cantitate pachet"
            type="number"
            sx={{ mt: 2 }}
            value={makeVariantValues.packQuantity ?? ''}
            onChange={(e) => setMakeVariantValues({ ...makeVariantValues, packQuantity: e.target.value === '' ? null : Number(e.target.value) })}
          />
          <TextField
            fullWidth
            label="Unitate pachet"
            sx={{ mt: 2 }}
            value={makeVariantValues.packUnit ?? ''}
            onChange={(e) => setMakeVariantValues({ ...makeVariantValues, packUnit: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMakeVariantDialogOpen(false)}>Anulează</Button>
          <Button onClick={handleMakeVariantConfirm} variant="contained">Confirmă</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Family Dialog (strong confirmation) */}
      <Dialog
        open={deleteFamilyOpen}
        onClose={() => {
          setDeleteFamilyOpen(false);
          setDeleteFamilyTarget(null);
          setDeleteFamilyInput('');
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Șterge familie</DialogTitle>
        <DialogContent>
          {deleteFamilyTarget ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {deleteFamilyTarget.materialCount > 0 ? (
                <Alert severity="warning">
                  Familia conține {deleteFamilyTarget.materialCount} materiale și nu poate fi ștearsă.
                </Alert>
              ) : (
                <Alert severity="error">
                  Această acțiune este permanentă. Pentru a confirma, scrie exact numele familiei.
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                Familie: <strong>{deleteFamilyTarget.name}</strong>
              </Typography>
              <TextField
                fullWidth
                label="Scrie numele familiei pentru confirmare"
                value={deleteFamilyInput}
                onChange={(e) => setDeleteFamilyInput(e.target.value)}
                disabled={deleteFamilyTarget.materialCount > 0}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteFamilyOpen(false);
              setDeleteFamilyTarget(null);
              setDeleteFamilyInput('');
            }}
          >
            Anulează
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={
              !deleteFamilyTarget ||
              deleteFamilyTarget.materialCount > 0 ||
              deleteFamilyInput.trim() !== deleteFamilyTarget.name
            }
            onClick={async () => {
              if (!deleteFamilyTarget) return;
              setSaving(true);
              try {
                await deleteMaterialFamily(deleteFamilyTarget.id);
                successNotistack('Familie ștearsă cu succes!');
                await load();
                setDeleteFamilyOpen(false);
                setDeleteFamilyTarget(null);
                setDeleteFamilyInput('');
              } catch (e: any) {
                errorNotistack(e?.message || 'Eroare la ștergere familie');
              } finally {
                setSaving(false);
              }
            }}
          >
            Șterge definitiv
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Wrap with QueryClientProvider for caching
export default function MaterialsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <MaterialsPageContent />
    </QueryClientProvider>
  );
}


