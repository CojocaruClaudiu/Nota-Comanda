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
  Card,
  CardContent,
  Divider,
  Avatar,
  Grid,
  Skeleton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StoreIcon from '@mui/icons-material/Store';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import { fetchMaterialHistory, type Material } from '../../api/materials';

// Generate consistent color from string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#1976d2', '#9c27b0', '#f57c00', '#388e3c', '#d32f2f', '#0288d1', '#7b1fa2', '#c62828'];
  return colors[Math.abs(hash) % colors.length];
};

// Format relative date
const formatRelativeDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Astăzi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `Acum ${diffDays} zile`;
  if (diffDays < 30) return `Acum ${Math.floor(diffDays / 7)} săptămâni`;
  if (diffDays < 365) return `Acum ${Math.floor(diffDays / 30)} luni`;
  return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
};

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

        // Sort by date (newest first)
        uniqueMatches.sort((a, b) => {
          const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
          const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          return dateB - dateA;
        });
        
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

    // Calculate price trend (compare recent 1/3 vs older 1/3)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (priceHistory.length >= 3) {
      const thirdSize = Math.floor(priceHistory.length / 3);
      const recentPrices = priceHistory.slice(0, thirdSize).map((m) => Number(m.price));
      const olderPrices = priceHistory.slice(-thirdSize).map((m) => Number(m.price));
      const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
      const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    }

    // Find best supplier (lowest average price)
    const supplierPrices = new Map<string, number[]>();
    priceHistory.forEach((m) => {
      const name = m.supplierName || 'Necunoscut';
      if (!supplierPrices.has(name)) supplierPrices.set(name, []);
      supplierPrices.get(name)!.push(Number(m.price));
    });
    let bestSupplier = '';
    let bestAvgPrice = Infinity;
    supplierPrices.forEach((prices, supplier) => {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (avg < bestAvgPrice) {
        bestAvgPrice = avg;
        bestSupplier = supplier;
      }
    });

    return {
      minPrice,
      maxPrice,
      avgPrice,
      entries: priceHistory.length,
      suppliers: uniqueSuppliers.size,
      trend,
      bestSupplier,
      bestSupplierAvgPrice: bestAvgPrice,
    };
  }, [priceHistory]);

  const columns = useMemo<MRT_ColumnDef<Material>[]>(
    () => [
      {
        accessorKey: 'supplierName',
        header: 'Furnizor',
        size: 250,
        Cell: ({ row }) => {
          const supplierName = row.original.supplierName || 'Necunoscut';
          const initial = supplierName.charAt(0).toUpperCase();
          const avatarColor = stringToColor(supplierName);
          const isRecent = row.index === 0;
          
          return (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: avatarColor,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {initial}
              </Avatar>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    {supplierName}
                  </Typography>
                  {isRecent && (
                    <Tooltip title="Cel mai recent">
                      <FiberManualRecordIcon sx={{ fontSize: 10, color: 'primary.main' }} />
                    </Tooltip>
                  )}
                </Stack>
                {row.original.supplierId && (
                  <Typography variant="caption" color="text.secondary">
                    ID: {row.original.supplierId}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Preț',
        size: 240,
        Cell: ({ row }) => {
          const price = Number(row.original.price);
          const hasDifference = stats && stats.minPrice !== stats.maxPrice;
          const isMin = stats && hasDifference && price === stats.minPrice;
          const isMax = stats && hasDifference && price === stats.maxPrice;
          const deviation = stats ? ((price - stats.avgPrice) / stats.avgPrice) * 100 : 0;
          const showDeviation = stats && Math.abs(deviation) > 1;

          return (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography
                variant="body2"
                fontWeight={isMin || isMax ? 700 : 600}
                color={isMin ? 'success.main' : isMax ? 'error.main' : 'text.primary'}
                sx={{ fontSize: '0.95rem' }}
              >
                {price.toFixed(2)} {row.original.currency}
              </Typography>
              {showDeviation && (
                <Tooltip title={`Deviere față de media: ${stats.avgPrice.toFixed(2)} RON`}>
                  <Chip
                    size="small"
                    label={`${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}%`}
                    color={deviation > 0 ? 'error' : 'success'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Tooltip>
              )}
              {isMin && (
                <Chip
                  size="small"
                  label="Cel mai mic"
                  color="success"
                  icon={<TrendingDownIcon />}
                  sx={{ height: 22, fontWeight: 600 }}
                />
              )}
              {isMax && (
                <Chip
                  size="small"
                  label="Cel mai mare"
                  color="error"
                  icon={<TrendingUpIcon />}
                  sx={{ height: 22, fontWeight: 600 }}
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
        size: 180,
        Cell: ({ row }) => {
          const dateStr = row.original.purchaseDate;
          const formattedDate = dateStr 
            ? new Date(dateStr).toLocaleDateString('ro-RO', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
            : '—';
          
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarTodayIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight={500}>
                {formattedDate}
              </Typography>
            </Stack>
          );
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
      density: 'comfortable',
    },
    muiTableBodyRowProps: ({ row }) => {
      const isRecent = row.index === 0; // First row is most recent
      return {
        sx: {
          borderLeft: isRecent ? '4px solid' : 'none',
          borderColor: isRecent ? 'primary.main' : 'transparent',
          backgroundColor: isRecent ? 'rgba(25, 118, 210, 0.02)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
          transition: 'background-color 0.15s ease',
        },
      };
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      },
    },
    localization: MRT_Localization_RO,
    state: {
      isLoading: loading,
    },
  });

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: 1350,
          width: '100%',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
              <ShowChartIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Istoric Prețuri</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              {materialDescription}
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {loading && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Statistici
            </Typography>
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box flex={1}>
                          <Skeleton variant="text" width="60%" />
                          <Skeleton variant="text" width="80%" height={32} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
        {stats && !loading && (
          <Box 
            sx={{ 
              mb: 3,
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(33, 150, 243, 0.01) 100%)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Statistici
              </Typography>
              <Stack direction="row" spacing={1}>
                {stats.suppliers > 1 && stats.bestSupplier && (
                  <Tooltip title={`Preț mediu: ${stats.bestSupplierAvgPrice.toFixed(2)} RON`}>
                    <Chip
                      size="small"
                      icon={<StoreIcon />}
                      label={`Cel mai bun: ${stats.bestSupplier}`}
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Tooltip>
                )}
                {stats.trend && (
                  <Chip
                    size="small"
                    icon={
                      stats.trend === 'up' ? <TrendingUpIcon /> :
                      stats.trend === 'down' ? <TrendingDownIcon /> :
                      <TrendingFlatIcon />
                    }
                    label={
                      stats.trend === 'up' ? 'Trend crescător' :
                      stats.trend === 'down' ? 'Trend descrescător' :
                      'Trend stabil'
                    }
                    color={
                      stats.trend === 'up' ? 'error' :
                      stats.trend === 'down' ? 'success' :
                      'default'
                    }
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
            </Stack>
            <Grid container spacing={1.2}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: 'info.main',
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)',
                          width: 40, 
                          height: 40,
                          boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)'
                        }}
                      >
                        <ReceiptIcon fontSize="small" />
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Intrări
                        </Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                          {stats.entries}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: 'secondary.main',
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: 'linear-gradient(135deg, #9c27b0 0%, #6a1b9a 100%)',
                          width: 40, 
                          height: 40,
                          boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)'
                        }}
                      >
                        <StoreIcon fontSize="small" />
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Furnizori
                        </Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                          {stats.suppliers}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: 'success.main',
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                          width: 40, 
                          height: 40,
                          boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                        }}
                      >
                        <TrendingDownIcon fontSize="small" />
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Preț Minim
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main" sx={{ lineHeight: 1, fontSize: '1.05rem' }}>
                          {stats.minPrice.toFixed(2)} RON
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: 'error.main',
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                          width: 40, 
                          height: 40,
                          boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
                        }}
                      >
                        <TrendingUpIcon fontSize="small" />
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Preț Maxim
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="error.main" sx={{ lineHeight: 1, fontSize: '1.05rem' }}>
                          {stats.maxPrice.toFixed(2)} RON
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'transparent',
                          background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                          width: 40, 
                          height: 40,
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                        }}
                      >
                        <ShowChartIcon fontSize="small" />
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Preț Mediu
                        </Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1, fontSize: '1.05rem' }}>
                          {stats.avgPrice.toFixed(2)} RON
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              {stats.maxPrice > stats.minPrice && (
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      height: '100%',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #ffffff 0%, #fff3e0 100%)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        transform: 'translateY(-4px)',
                        borderColor: 'warning.main',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'transparent',
                            background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
                            width: 40, 
                            height: 40,
                            boxShadow: '0 4px 12px rgba(245, 124, 0, 0.3)'
                          }}
                        >
                          <CompareArrowsIcon fontSize="small" />
                        </Avatar>
                        <Box flex={1}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            display="block"
                            sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                          >
                            Diferență
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="warning.main" sx={{ lineHeight: 1 }}>
                            {((stats.maxPrice - stats.minPrice) / stats.minPrice * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {stats.maxPrice === stats.minPrice && (
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      height: '100%',
                      border: '1px solid',
                      borderColor: 'info.main',
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        transform: 'translateY(-4px)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'transparent',
                            background: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)',
                            width: 40, 
                            height: 40,
                            boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)'
                          }}
                        >
                          <CompareArrowsIcon fontSize="small" />
                        </Avatar>
                        <Box flex={1}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            display="block"
                            sx={{ mb: 0.5, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                          >
                            Preț uniform
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1, fontSize: '1.05rem' }}>
                            {stats.minPrice.toFixed(2)} RON
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        <MaterialReactTable table={table} />

        {priceHistory.length === 0 && !loading && (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 6,
              px: 3,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}
          >
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nu există intrări în istoric
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Acest material nu are încă istoricul prețurilor înregistrat
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
