import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { fetchMaterialHistory, type Material } from '../../api/materials';

interface PriceHistoryModalProps {
  open: boolean;
  onClose: () => void;
  materialCode: string;
  materialDescription: string;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  open,
  onClose,
  materialCode,
  materialDescription,
}) => {
  const [priceHistory, setPriceHistory] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !materialCode) return;

    const loadPriceHistory = async () => {
      setLoading(true);
      try {
        // Fetch only materials with this specific code (much faster!)
        const materials = await fetchMaterialHistory(materialCode);

        // Remove exact duplicates (same supplier, price, and date)
        const uniqueMatches = Array.from(
          new Map(
            materials.map((m) => {
              const key = `${m.supplierName || 'none'}|${m.supplierId || 'none'}|${m.price}|${m.purchaseDate || 'none'}`;
              return [key, m];
            })
          ).values()
        );

        // Sort by price descending
        uniqueMatches.sort((a, b) => Number(b.price) - Number(a.price));
        
        setPriceHistory(uniqueMatches);
      } catch (error) {
        console.error('Failed to load price history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPriceHistory();
  }, [open, materialCode, materialDescription]);

  // Calculate price statistics
  const stats = useMemo(() => {
    if (priceHistory.length === 0) return null;

    const prices = priceHistory.map((m) => Number(m.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const uniqueSuppliers = new Set(priceHistory.map((m) => m.supplierName).filter(Boolean));

    return {
      minPrice,
      maxPrice,
      avgPrice,
      entries: priceHistory.length,
      suppliers: uniqueSuppliers.size,
    };
  }, [priceHistory]);

  const columns = useMemo<MRT_ColumnDef<Material>[]>(
    () => [
      {
        accessorKey: 'supplierName',
        header: 'Furnizor',
        size: 250,
        Cell: ({ row }) => {
          return (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {row.original.supplierName || 'Necunoscut'}
              </Typography>
              {row.original.supplierId && (
                <Typography variant="caption" color="text.secondary">
                  ID: {row.original.supplierId}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Preț',
        size: 120,
        Cell: ({ row }) => {
          const price = Number(row.original.price);
          const isMin = stats && price === stats.minPrice;
          const isMax = stats && price === stats.maxPrice;

          return (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography
                variant="body2"
                fontWeight={isMin ? 700 : 400}
                color={isMin ? 'success.main' : isMax ? 'error.main' : 'text.primary'}
              >
                {price.toFixed(2)} {row.original.currency}
              </Typography>
              {isMin && (
                <Chip
                  size="small"
                  label="Cel mai mic"
                  color="success"
                  icon={<TrendingDownIcon />}
                />
              )}
              {isMax && (
                <Chip
                  size="small"
                  label="Cel mai mare"
                  color="error"
                  icon={<TrendingUpIcon />}
                />
              )}
            </Stack>
          );
        },
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
        Cell: ({ row }) => (
          <Chip size="small" variant="outlined" label={row.original.unit} />
        ),
      },
      {
        accessorKey: 'code',
        header: 'Cod',
        size: 120,
      },
      {
        accessorKey: 'purchaseDate',
        header: 'Data Achiziției',
        size: 150,
        Cell: ({ row }) => {
          const date = row.original.purchaseDate
            ? new Date(row.original.purchaseDate).toLocaleDateString('ro-RO')
            : '—';
          return <Typography variant="body2">{date}</Typography>;
        },
      },
    ],
    [stats]
  );

  const table = useMaterialReactTable({
    columns,
    data: priceHistory,
    enablePagination: false,
    enableColumnActions: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableSorting: true,
    initialState: {
      density: 'compact',
    },
    localization: MRT_Localization_RO,
    state: {
      isLoading: loading,
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Istoric Prețuri</Typography>
            <Typography variant="body2" color="text.secondary">
              {materialDescription}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {stats && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Statistici
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Intrări
                </Typography>
                <Typography variant="h6">{stats.entries}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Furnizori
                </Typography>
                <Typography variant="h6">{stats.suppliers}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Preț Minim
                </Typography>
                <Typography variant="h6" color="success.main">
                  {stats.minPrice.toFixed(2)} RON
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Preț Maxim
                </Typography>
                <Typography variant="h6" color="error.main">
                  {stats.maxPrice.toFixed(2)} RON
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Preț Mediu
                </Typography>
                <Typography variant="h6">
                  {stats.avgPrice.toFixed(2)} RON
                </Typography>
              </Box>
              {stats.maxPrice > 0 && stats.minPrice > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Diferență
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {((stats.maxPrice - stats.minPrice) / stats.minPrice * 100).toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        <MaterialReactTable table={table} />

        {priceHistory.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            Nu există intrări în istoric pentru acest material
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
