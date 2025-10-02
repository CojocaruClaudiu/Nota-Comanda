import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import {
  listOperationCategories,
  listOperations,
  listOperationItems,
  type OperationCategory,
  type Operation,
  type OperationItem,
} from '../../api/operationCategories';

type NodeType = 'category' | 'operation' | 'item';

interface TreeRow {
  type: NodeType;
  id: string;
  parentId?: string | null;
  name: string;
  unit?: string | null;
  number: string;
  subRows?: TreeRow[];
  categoryName?: string; // For items, to show which category they belong to
  operationName?: string; // For items, to show which operation they belong to
}

interface SelectOperationModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { name: string; unit: string; categoryName: string; operationName: string }) => void;
}

function numberize(tree: TreeRow[]): TreeRow[] {
  return tree.map((cat, i) => {
    const catNum = `${i + 1}`;
    const ops = (cat.subRows || []).map((op, j) => {
      const opNum = `${catNum}.${j + 1}`;
      const items = (op.subRows || []).map((it, k) => ({
        ...it,
        number: `${opNum}.${k + 1}`,
      }));
      return { ...op, number: opNum, subRows: items };
    });
    return { ...cat, number: catNum, subRows: ops };
  });
}

async function buildTree(): Promise<TreeRow[]> {
  const cats = await listOperationCategories();

  const catNodes: TreeRow[] = await Promise.all(
    cats.map(async (c: OperationCategory) => {
      const ops = await listOperations(c.id);

      const opNodes: TreeRow[] = await Promise.all(
        ops.map(async (o: Operation) => {
          const items = await listOperationItems(o.id);
          const itemNodes: TreeRow[] = items.map((it: OperationItem) => ({
            type: 'item',
            id: it.id,
            parentId: o.id,
            name: it.name,
            unit: (it as any).unit ?? 'mp',
            number: '',
            categoryName: c.name,
            operationName: o.name,
          }));
          return {
            type: 'operation',
            id: o.id,
            parentId: c.id,
            name: o.name,
            number: '',
            subRows: itemNodes,
            categoryName: c.name,
          };
        })
      );

      return {
        type: 'category',
        id: c.id,
        parentId: null,
        name: c.name,
        number: '',
        subRows: opNodes,
      };
    })
  );

  return numberize(catNodes);
}

const SelectOperationModal: React.FC<SelectOperationModalProps> = ({ open, onClose, onSelect }) => {
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const t = await buildTree();
          setTree(t);
        } catch (e: any) {
          setError(e?.message || 'Eroare la încărcarea operațiilor');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [open]);

  const columns = useMemo<MRT_ColumnDef<TreeRow>[]>(
    () => [
      {
        accessorKey: 'number',
        header: '#',
        size: 90,
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        Cell: ({ row }) => (
          <Box
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {row.original.number || '—'}
          </Box>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Denumire',
        size: 400,
        enableColumnFilter: true,
        enableGlobalFilter: true,
        Cell: ({ row, renderedCellValue }) => {
          const t = row.original.type;
          const sub = row.original.subRows || [];
          const unit = row.original.unit;
          
          return (
            <Stack direction="row" alignItems="center" gap={1} sx={{ py: 0.25 }}>
              {t !== 'category' && <SubdirectoryArrowRightIcon fontSize="small" />}
              <Typography
                variant="body2"
                sx={{ fontWeight: t === 'category' ? 600 : 400 }}
              >
                {renderedCellValue as string}
              </Typography>
              <Chip
                size="small"
                label={t === 'category' ? 'Categorie' : t === 'operation' ? 'Operație' : 'Element'}
                variant="outlined"
              />
              {t === 'item' && unit && (
                <Chip size="small" color="info" variant="outlined" label={unit} />
              )}
              {t === 'category' && (
                <Chip size="small" variant="outlined" label={`${sub.length} operații`} />
              )}
              {t === 'operation' && (
                <Chip size="small" variant="outlined" label={`${sub.length} elemente`} />
              )}
            </Stack>
          );
        },
      },
      {
        accessorKey: 'unit',
        header: 'Unitate',
        size: 100,
        enableColumnFilter: true,
        enableGlobalFilter: false,
        Cell: ({ row, renderedCellValue }) => {
          return row.original.type === 'item' ? (renderedCellValue || 'mp') : '—';
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: tree,
    localization: tableLocalization,
    
    // Tree structure
    getRowId: (row) => `${row.type}:${row.id}`,
    getSubRows: (row) => row.subRows,
    getRowCanExpand: (row) => row.original.type !== 'item',
    enableExpanding: true,
    enableExpandAll: true,
    
    // Search and filter
    enableGlobalFilter: true,
    enableColumnFilters: true,
    globalFilterFn: 'contains',
    filterFromLeafRows: true,
    
    // UI options
    enablePagination: true,
    enableSorting: false,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    positionExpandColumn: 'first',
    
    initialState: {
      expanded: true,
      showGlobalFilter: true,
      density: 'compact',
      pagination: { pageIndex: 0, pageSize: 20 },
    },
    
    muiTableContainerProps: {
      sx: { maxHeight: '500px' },
    },
    
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const rowData = row.original;
        if (rowData.type === 'item') {
          onSelect({
            name: rowData.name,
            unit: rowData.unit || 'mp',
            categoryName: rowData.categoryName || '',
            operationName: rowData.operationName || '',
          });
          onClose();
        }
      },
      sx: {
        cursor: row.original.type === 'item' ? 'pointer' : 'default',
        '&:hover': row.original.type === 'item' ? {
          backgroundColor: 'action.hover',
        } : {},
      },
    }),
    
    muiSearchTextFieldProps: {
      placeholder: 'Caută operație sau element...',
      variant: 'outlined',
      size: 'small',
    },
    
    state: {
      isLoading: loading,
      showAlertBanner: !!error,
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">Selectează Operație</Typography>
            <Typography variant="caption" color="text.secondary">
              Click pe un element pentru a-l adăuga
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <MaterialReactTable table={table} />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Anulează
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectOperationModal;
