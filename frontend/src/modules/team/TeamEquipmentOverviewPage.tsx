import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  useTheme,
  alpha,
  Button,
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import PeopleIcon from '@mui/icons-material/People';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  workerEquipmentApi,
  type EquipmentIssue,
  type EquipmentType,
  type EquipmentCondition,
  getEquipmentTypeName,
  getEquipmentConditionName,
  getEquipmentIcon,
} from '../../api/workerEquipment';

interface EquipmentWithEmployee extends EquipmentIssue {
  employee: { id: string; name: string; active: boolean };
}

interface EquipmentStats {
  totalIssued: number;
  active: number;
  returned: number;
  destroyed: number;
  byType: Record<string, { active: number; returned: number; destroyed: number }>;
  byCondition: Record<string, number>;
  byEmployee: Array<{ employeeId: string; employeeName: string; count: number }>;
}

const conditionColors: Record<EquipmentCondition, string> = {
  NEW: '#4caf50',
  GOOD: '#2196f3',
  WORN: '#ff9800',
  DAMAGED: '#f44336',
  DESTROYED: '#9e9e9e',
};

const statusColors = {
  active: '#4caf50',
  returned: '#2196f3',
  destroyed: '#f44336',
};

const trendColors = {
  issued: '#7e57c2',
  returned: statusColors.returned,
  destroyed: statusColors.destroyed,
};

const equipmentTypeOrder: EquipmentType[] = ['BOOTS', 'PANTS', 'JACKET', 'GLOVES', 'HELMET', 'VEST', 'OTHER'];
const monthlyIntervalOptions = [3, 6, 9, 12, 18, 24] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightSearchText = (text: string, searchValue: string) => {
  const query = searchValue.trim();
  if (!query) return text;

  const safeQuery = escapeRegExp(query);
  const regex = new RegExp(`(${safeQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === query.toLowerCase();
    if (!isMatch) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;

    return (
      <Box
        key={`${part}-${index}`}
        component="span"
        sx={{
          px: 0.25,
          borderRadius: 0.5,
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.28),
          fontWeight: 700,
        }}
      >
        {part}
      </Box>
    );
  });
};

const TeamEquipmentOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [allEquipment, setAllEquipment] = useState<EquipmentWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | 'ALL'>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<EquipmentCondition | 'ALL'>('ALL');
  const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [monthlyInterval, setMonthlyInterval] = useState<number>(6);
  const [typeSeries, setTypeSeries] = useState({ Active: true, Returnate: true, Distruse: true });
  const [monthlySeries, setMonthlySeries] = useState({ Distribuite: true, Returnate: true, Distruse: true });
  const [conditionSeries, setConditionSeries] = useState<Record<EquipmentCondition, boolean>>({
    NEW: true,
    GOOD: true,
    WORN: true,
    DAMAGED: true,
    DESTROYED: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, equipmentData] = await Promise.all([
          workerEquipmentApi.getStats(),
          workerEquipmentApi.getAllEquipment(),
        ]);
        setStats(statsData);
        setAllEquipment(equipmentData);
      } catch (error) {
        console.error('Failed to load equipment overview:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const statusCounts = useMemo(() => {
    let active = 0;
    let returned = 0;
    let destroyed = 0;

    allEquipment.forEach((item) => {
      if (item.destroyedDate) destroyed += 1;
      else if (item.returnedDate) returned += 1;
      else active += 1;
    });

    return {
      all: allEquipment.length,
      active,
      returned,
      destroyed,
    };
  }, [allEquipment]);

  const filteredEquipment = useMemo(() => {
    let data = allEquipment;

    if (tabValue === 1) data = data.filter((e) => !e.returnedDate && !e.destroyedDate);
    else if (tabValue === 2) data = data.filter((e) => !!e.returnedDate);
    else if (tabValue === 3) data = data.filter((e) => !!e.destroyedDate);

    if (selectedEquipmentType !== 'ALL') {
      data = data.filter((e) => e.equipmentType === selectedEquipmentType);
    }

    if (selectedCondition !== 'ALL') {
      data = data.filter((e) => e.condition === selectedCondition);
    }

    if (selectedEmployeeStatus !== 'ALL') {
      data = data.filter((e) => (selectedEmployeeStatus === 'ACTIVE' ? e.employee.active : !e.employee.active));
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.employee.name.toLowerCase().includes(s) ||
          getEquipmentTypeName(e.equipmentType).toLowerCase().includes(s) ||
          getEquipmentConditionName(e.condition).toLowerCase().includes(s) ||
          (e.size || '').toLowerCase().includes(s) ||
          (e.notes || '').toLowerCase().includes(s)
      );
    }

    return data;
  }, [allEquipment, tabValue, search, selectedEquipmentType, selectedCondition, selectedEmployeeStatus]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onDelete: () => void }> = [];

    if (tabValue !== 0) {
      const tabLabel = tabValue === 1 ? 'Tab: Active' : tabValue === 2 ? 'Tab: Returnate' : 'Tab: Distruse';
      filters.push({
        key: 'tab',
        label: tabLabel,
        onDelete: () => setTabValue(0),
      });
    }

    if (search.trim()) {
      filters.push({
        key: 'search',
        label: `Cautare: ${search.trim()}`,
        onDelete: () => setSearch(''),
      });
    }

    if (selectedEquipmentType !== 'ALL') {
      filters.push({
        key: 'type',
        label: `Tip: ${getEquipmentTypeName(selectedEquipmentType)}`,
        onDelete: () => setSelectedEquipmentType('ALL'),
      });
    }

    if (selectedCondition !== 'ALL') {
      filters.push({
        key: 'condition',
        label: `Stare: ${getEquipmentConditionName(selectedCondition)}`,
        onDelete: () => setSelectedCondition('ALL'),
      });
    }

    if (selectedEmployeeStatus !== 'ALL') {
      filters.push({
        key: 'employeeStatus',
        label: `Status angajat: ${selectedEmployeeStatus === 'ACTIVE' ? 'Activ' : 'Inactiv'}`,
        onDelete: () => setSelectedEmployeeStatus('ALL'),
      });
    }

    return filters;
  }, [tabValue, search, selectedEquipmentType, selectedCondition, selectedEmployeeStatus]);

  const hasActiveFilters = activeFilters.length > 0;
  const activeFilterCount = activeFilters.length;

  const clearFilters = () => {
    setTabValue(0);
    setSearch('');
    setSelectedEquipmentType('ALL');
    setSelectedCondition('ALL');
    setSelectedEmployeeStatus('ALL');
  };

  const toggleTypeSeries = (key: keyof typeof typeSeries) => {
    setTypeSeries((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const toggleMonthlySeries = (key: keyof typeof monthlySeries) => {
    setMonthlySeries((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const summaryRatios = useMemo(() => {
    if (!stats || stats.totalIssued === 0) {
      return { active: 0, returned: 0, destroyed: 0 };
    }
    return {
      active: Math.round((stats.active / stats.totalIssued) * 100),
      returned: Math.round((stats.returned / stats.totalIssued) * 100),
      destroyed: Math.round((stats.destroyed / stats.totalIssued) * 100),
    };
  }, [stats]);

  const columns = useMemo<MRT_ColumnDef<EquipmentWithEmployee>[]>(
    () => [
      {
        accessorKey: 'employee.name',
        header: 'Angajat',
        Cell: ({ row }) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {highlightSearchText(row.original.employee.name, search)}
            </Typography>
            {!row.original.employee.active && (
              <Chip
                label="Inactiv"
                size="small"
                color="default"
                variant="outlined"
                sx={{ ml: 0.5, height: 18, fontSize: 10 }}
              />
            )}
          </Box>
        ),
      },
      {
        accessorKey: 'equipmentType',
        header: 'Tip',
        Cell: ({ row }) => (
          <Typography variant="body2">
            {getEquipmentIcon(row.original.equipmentType)}{' '}
            {highlightSearchText(getEquipmentTypeName(row.original.equipmentType), search)}
          </Typography>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Marime',
        Cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {highlightSearchText(row.original.size || '-', search)}
          </Typography>
        ),
      },
      {
        accessorKey: 'condition',
        header: 'Stare',
        Cell: ({ row }) => (
          <Chip
            label={highlightSearchText(getEquipmentConditionName(row.original.condition), search)}
            size="small"
            sx={{
              bgcolor: alpha(conditionColors[row.original.condition], 0.12),
              color: conditionColors[row.original.condition],
              fontWeight: 700,
              height: 22,
              fontSize: 11,
            }}
          />
        ),
      },
      {
        accessorKey: 'issuedDate',
        header: 'Distribuit',
        Cell: ({ row }) => <Typography variant="caption">{dayjs(row.original.issuedDate).format('DD.MM.YYYY')}</Typography>,
      },
      {
        id: 'status',
        header: 'Status',
        Cell: ({ row }) => {
          const item = row.original;
          const isDestroyed = !!item.destroyedDate;
          const isReturned = !!item.returnedDate;

          if (isDestroyed) {
            return (
              <Tooltip title={`Distrus pe ${dayjs(item.destroyedDate!).format('DD.MM.YYYY')}`}>
                <Chip
                  label={`Distrus ${dayjs(item.destroyedDate!).format('DD.MM.YY')}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11 }}
                />
              </Tooltip>
            );
          }

          if (isReturned) {
            return (
              <Tooltip title={`Returnat pe ${dayjs(item.returnedDate!).format('DD.MM.YYYY')}`}>
                <Chip
                  label={`Returnat ${dayjs(item.returnedDate!).format('DD.MM.YY')}`}
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11 }}
                />
              </Tooltip>
            );
          }

          return <Chip label="Activ" size="small" color="success" sx={{ height: 22, fontSize: 11 }} />;
        },
      },
    ],
    [search]
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredEquipment,
    localization: MRT_Localization_RO,
    enableColumnFilters: false,
    enableSorting: true,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableColumnActions: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableStickyHeader: true,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    enableColumnOrdering: true,
    initialState: { density: 'compact' },
    muiTablePaperProps: {
      sx: {
        boxShadow: 'none',
        borderRadius: 0,
        border: 'none',
      },
    },
    muiTableContainerProps: {
      sx: {
        maxHeight: 520,
      },
    },
    muiTableHeadCellProps: {
      sx: {
        bgcolor: 'background.paper',
        fontWeight: 700,
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
      },
    },
    muiTableBodyCellProps: {
      sx: {
        py: 0.75,
      },
    },
    muiTableBodyRowProps: ({ row, table }) => {
      const item = row.original;
      const isDestroyed = !!item.destroyedDate;
      const isReturned = !!item.returnedDate;

      // Zebra striping should follow rendered row order, not source index.
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      const isEven = displayIndex % 2 === 0;

      const zebraBg = isEven ? alpha(theme.palette.grey[500], 0.05) : 'transparent';
      const statusTint = isDestroyed
        ? alpha(statusColors.destroyed, isEven ? 0.06 : 0.03)
        : isReturned
          ? alpha(statusColors.returned, isEven ? 0.06 : 0.03)
          : 'transparent';

      let borderLeft = '3px solid transparent';

      if (isDestroyed) {
        borderLeft = `3px solid ${alpha(statusColors.destroyed, 0.65)}`;
      } else if (isReturned) {
        borderLeft = `3px solid ${alpha(statusColors.returned, 0.65)}`;
      }

      return {
        sx: {
          opacity: isDestroyed || isReturned ? 0.86 : 1,
          bgcolor: zebraBg,
          backgroundImage: statusTint === 'transparent' ? 'none' : `linear-gradient(${statusTint}, ${statusTint})`,
          borderLeft,
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: isDestroyed
              ? alpha(statusColors.destroyed, 0.12)
              : isReturned
                ? alpha(statusColors.returned, 0.12)
                : alpha(theme.palette.primary.main, 0.06),
          },
        },
      };
    },
  });

  const monthlyTrend = useMemo(() => {
    const now = dayjs();
    const months = Array.from({ length: monthlyInterval }, (_, i) =>
      now.subtract(monthlyInterval - 1 - i, 'month').startOf('month')
    );
    const byMonth: Record<string, { issued: number; returned: number; destroyed: number; label: string }> = {};

    months.forEach((m) => {
      const key = m.format('YYYY-MM');
      byMonth[key] = { issued: 0, returned: 0, destroyed: 0, label: m.format('MMM YY') };
    });

    allEquipment.forEach((item) => {
      const issuedKey = dayjs(item.issuedDate).format('YYYY-MM');
      if (byMonth[issuedKey]) byMonth[issuedKey].issued += 1;

      if (item.returnedDate) {
        const returnedKey = dayjs(item.returnedDate).format('YYYY-MM');
        if (byMonth[returnedKey]) byMonth[returnedKey].returned += 1;
      }

      if (item.destroyedDate) {
        const destroyedKey = dayjs(item.destroyedDate).format('YYYY-MM');
        if (byMonth[destroyedKey]) byMonth[destroyedKey].destroyed += 1;
      }
    });

    return months.map((m) => {
      const key = m.format('YYYY-MM');
      return { key, ...byMonth[key] };
    });
  }, [allEquipment, monthlyInterval]);

  const topEmployeeData = useMemo(
    () =>
      (stats?.byEmployee || []).slice(0, 10).map((emp) => ({
        name: emp.employeeName,
        Echipamente: emp.count,
      })),
    [stats]
  );

  const employeeMaxCount = useMemo(
    () => Math.max(1, ...topEmployeeData.map((emp) => emp.Echipamente)),
    [topEmployeeData]
  );

  const employeeChartHeight = useMemo(
    () => Math.max(120, topEmployeeData.length * 42 + 20),
    [topEmployeeData.length]
  );

  const employeeTicks = useMemo(
    () => (employeeMaxCount <= 8 ? Array.from({ length: employeeMaxCount + 1 }, (_, i) => i) : undefined),
    [employeeMaxCount]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">Nu s-au putut incarca datele</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        bgcolor: 'background.default',
        // Force-hide Recharts hover cursor rectangle/focus ring artifact.
        '& .recharts-tooltip-cursor': {
          display: 'none !important',
          stroke: 'none !important',
          fill: 'transparent !important',
        },
        '& .recharts-wrapper *:focus': {
          outline: 'none !important',
        },
      }}
    >
      <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 1.5, md: 2.5 } }}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2, md: 2.5 },
            mb: 2,
            borderRadius: 3,
            background: `linear-gradient(125deg, ${alpha(theme.palette.primary.light, 0.18)} 0%, ${alpha(
              theme.palette.background.paper,
              0.96
            )} 45%, ${alpha(theme.palette.info.light, 0.12)} 100%)`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <IconButton onClick={() => navigate('/')} sx={{ bgcolor: 'background.paper' }}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                  Echipamente Angajati
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dashboard cu status, trend si detalii complete pe angajati
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<InventoryIcon />} label={`${stats.totalIssued} total`} color="primary" variant="outlined" />
              <Chip label={`${summaryRatios.active}% active`} sx={{ bgcolor: alpha(statusColors.active, 0.13), color: statusColors.active }} />
              <Chip label={`${summaryRatios.returned}% returnate`} sx={{ bgcolor: alpha(statusColors.returned, 0.13), color: statusColors.returned }} />
              <Chip label={`${summaryRatios.destroyed}% distruse`} sx={{ bgcolor: alpha(statusColors.destroyed, 0.12), color: statusColors.destroyed }} />
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 3, minHeight: 116, overflow: 'hidden' }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Total distribuite
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {stats.totalIssued}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ color: 'primary.main', fontSize: 34 }} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: alpha(statusColors.active, 0.3),
                p: 2,
                borderRadius: 3,
                minHeight: 116,
                bgcolor: alpha(statusColors.active, 0.05),
                overflow: 'hidden',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Active
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {stats.active}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryRatios.active}% din total
                  </Typography>
                </Box>
                <Chip label="In uz" size="small" color="success" />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: alpha(statusColors.returned, 0.3),
                p: 2,
                borderRadius: 3,
                minHeight: 116,
                bgcolor: alpha(statusColors.returned, 0.06),
                overflow: 'hidden',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Returnate
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="info.main">
                    {stats.returned}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryRatios.returned}% din total
                  </Typography>
                </Box>
                <AssignmentReturnIcon sx={{ color: statusColors.returned, fontSize: 34 }} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: alpha(statusColors.destroyed, 0.3),
                p: 2,
                borderRadius: 3,
                minHeight: 116,
                bgcolor: alpha(statusColors.destroyed, 0.06),
                overflow: 'hidden',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Distruse
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="error.main">
                    {stats.destroyed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryRatios.destroyed}% din total
                  </Typography>
                </Box>
                <BrokenImageIcon sx={{ color: statusColors.destroyed, fontSize: 34 }} />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 2.5,
                pb: 3,
                borderRadius: 3,
                height: '100%',
                overflow: 'hidden',
                '& .recharts-wrapper:focus, & .recharts-surface:focus': {
                  outline: 'none',
                },
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Distributie pe tip echipament
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Compara statusul activ, returnat si distrus pentru fiecare tip.
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  accessibilityLayer={false}
                  data={equipmentTypeOrder
                    .filter((type) => stats.byType[type])
                    .map((type) => ({
                      name: getEquipmentTypeName(type),
                      Active: stats.byType[type]?.active || 0,
                      Returnate: stats.byType[type]?.returned || 0,
                      Distruse: stats.byType[type]?.destroyed || 0,
                    }))}
                  margin={{ top: 8, right: 10, left: -10, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip cursor={false} contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
                  <Bar activeBar={false} hide={!typeSeries.Active} dataKey="Active" stackId="a" fill={statusColors.active} />
                  <Bar activeBar={false} hide={!typeSeries.Returnate} dataKey="Returnate" stackId="a" fill={statusColors.returned} />
                  <Bar
                    activeBar={false}
                    hide={!typeSeries.Distruse}
                    dataKey="Distruse"
                    stackId="a"
                    fill={statusColors.destroyed}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label="Active"
                  onClick={() => toggleTypeSeries('Active')}
                  sx={{ cursor: 'pointer', opacity: typeSeries.Active ? 1 : 0.45, bgcolor: alpha(statusColors.active, 0.12), color: statusColors.active }}
                />
                <Chip
                  size="small"
                  label="Returnate"
                  onClick={() => toggleTypeSeries('Returnate')}
                  sx={{ cursor: 'pointer', opacity: typeSeries.Returnate ? 1 : 0.45, bgcolor: alpha(statusColors.returned, 0.12), color: statusColors.returned }}
                />
                <Chip
                  size="small"
                  label="Distruse"
                  onClick={() => toggleTypeSeries('Distruse')}
                  sx={{ cursor: 'pointer', opacity: typeSeries.Distruse ? 1 : 0.45, bgcolor: alpha(statusColors.destroyed, 0.12), color: statusColors.destroyed }}
                />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 2.5,
                pb: 3,
                borderRadius: 3,
                height: '100%',
                overflow: 'hidden',
                '& .recharts-wrapper:focus, & .recharts-surface:focus': {
                  outline: 'none',
                },
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Stare echipament activ
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Activeaza/dezactiveaza categorii pentru focus pe ce te intereseaza.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {(['NEW', 'GOOD', 'WORN', 'DAMAGED'] as EquipmentCondition[]).map((cond) => (
                  <Chip
                    key={cond}
                    label={getEquipmentConditionName(cond)}
                    size="small"
                    onClick={() => setConditionSeries((prev) => ({ ...prev, [cond]: !prev[cond] }))}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: alpha(conditionColors[cond], conditionSeries[cond] ? 0.15 : 0.05),
                      color: conditionColors[cond],
                      opacity: conditionSeries[cond] ? 1 : 0.45,
                      fontWeight: 700,
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>

              {stats.active > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart accessibilityLayer={false}>
                    <Pie
                      data={(['NEW', 'GOOD', 'WORN', 'DAMAGED'] as EquipmentCondition[])
                        .filter((cond) => conditionSeries[cond] && (stats.byCondition[cond] || 0) > 0)
                        .map((cond) => ({
                          name: getEquipmentConditionName(cond),
                          value: stats.byCondition[cond] || 0,
                          color: conditionColors[cond],
                        }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      {(['NEW', 'GOOD', 'WORN', 'DAMAGED'] as EquipmentCondition[])
                        .filter((cond) => conditionSeries[cond] && (stats.byCondition[cond] || 0) > 0)
                        .map((cond) => (
                          <Cell key={cond} fill={conditionColors[cond]} />
                        ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nu exista echipament activ
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {topEmployeeData.length > 0 && (
          <Box sx={{ pt: 3.5 }}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5, borderRadius: 3, mb: 2, overflow: 'hidden' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                <PeopleIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Echipament activ per angajat (top {Math.min(stats.byEmployee.length, 10)})
              </Typography>
              <ResponsiveContainer width="100%" height={employeeChartHeight}>
              <BarChart
                accessibilityLayer={false}
                data={topEmployeeData}
                layout="vertical"
                margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, employeeMaxCount]}
                    ticks={employeeTicks}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={false} contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
                <Bar activeBar={false} dataKey="Echipamente" fill={theme.palette.primary.main} radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5, borderRadius: 3, mb: 2, overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Evolutie lunara
            </Typography>
            <TextField
              select
              size="small"
              label="Interval"
              value={monthlyInterval}
              onChange={(e) => setMonthlyInterval(Number(e.target.value))}
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              {monthlyIntervalOptions.map((months) => (
                <MenuItem key={months} value={months}>
                  Ultimele {months} luni
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Urmareste ritmul distribuirilor, returnarilor si distrugerilor.
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              accessibilityLayer={false}
              data={monthlyTrend.map((m) => ({
                name: m.label,
                Distribuite: m.issued,
                Returnate: m.returned,
                Distruse: m.destroyed,
              }))}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <RechartsTooltip cursor={false} contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
              <Bar activeBar={false} hide={!monthlySeries.Distribuite} dataKey="Distribuite" fill={trendColors.issued} radius={[4, 4, 0, 0]} />
              <Bar activeBar={false} hide={!monthlySeries.Returnate} dataKey="Returnate" fill={trendColors.returned} radius={[4, 4, 0, 0]} />
              <Bar activeBar={false} hide={!monthlySeries.Distruse} dataKey="Distruse" fill={trendColors.destroyed} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
            <Chip
              size="small"
              label="Distribuite"
              onClick={() => toggleMonthlySeries('Distribuite')}
              sx={{ cursor: 'pointer', opacity: monthlySeries.Distribuite ? 1 : 0.45, bgcolor: alpha(trendColors.issued, 0.13), color: trendColors.issued }}
            />
            <Chip
              size="small"
              label="Returnate"
              onClick={() => toggleMonthlySeries('Returnate')}
              sx={{ cursor: 'pointer', opacity: monthlySeries.Returnate ? 1 : 0.45, bgcolor: alpha(trendColors.returned, 0.13), color: trendColors.returned }}
            />
            <Chip
              size="small"
              label="Distruse"
              onClick={() => toggleMonthlySeries('Distruse')}
              sx={{ cursor: 'pointer', opacity: monthlySeries.Distruse ? 1 : 0.45, bgcolor: alpha(trendColors.destroyed, 0.13), color: trendColors.destroyed }}
            />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Registru echipamente
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filtreaza rapid dupa status si cauta dupa angajat, tip sau stare.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  {hasActiveFilters && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="inherit"
                      startIcon={<FilterAltOffIcon />}
                      onClick={clearFilters}
                    >
                      Reset filtre
                    </Button>
                  )}
                  <TextField
                    size="small"
                    placeholder="Cauta angajat, tip, stare..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 260 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: search ? (
                        <InputAdornment position="end">
                          <IconButton size="small" aria-label="clear-search" onClick={() => setSearch('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Stack>
              </Stack>

              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 38,
                  '& .MuiTab-root': { minHeight: 38, py: 0.25, fontWeight: 600, textTransform: 'none' },
                }}
              >
                <Tab label={`Toate (${statusCounts.all})`} />
                <Tab label={`Active (${statusCounts.active})`} />
                <Tab label={`Returnate (${statusCounts.returned})`} />
                <Tab label={`Distruse (${statusCounts.destroyed})`} />
              </Tabs>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                <TextField
                  select
                  size="small"
                  label="Tip echipament"
                  value={selectedEquipmentType}
                  onChange={(e) => setSelectedEquipmentType(e.target.value as EquipmentType | 'ALL')}
                  sx={{ minWidth: { xs: '100%', sm: 220 } }}
                >
                  <MenuItem value="ALL">Toate tipurile</MenuItem>
                  {equipmentTypeOrder.map((type) => (
                    <MenuItem key={type} value={type}>
                      {getEquipmentIcon(type)} {getEquipmentTypeName(type)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Stare"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value as EquipmentCondition | 'ALL')}
                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                  <MenuItem value="ALL">Toate starile</MenuItem>
                  {(['NEW', 'GOOD', 'WORN', 'DAMAGED', 'DESTROYED'] as EquipmentCondition[]).map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {getEquipmentConditionName(condition)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Status angajat"
                  value={selectedEmployeeStatus}
                  onChange={(e) => setSelectedEmployeeStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                  <MenuItem value="ALL">Toti</MenuItem>
                  <MenuItem value="ACTIVE">Activi</MenuItem>
                  <MenuItem value="INACTIVE">Inactivi</MenuItem>
                </TextField>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Afisate {filteredEquipment.length} din {allEquipment.length} echipamente
                </Typography>
                {hasActiveFilters && (
                  <Chip size="small" color="primary" variant="outlined" label={`${activeFilterCount} filtre active`} />
                )}
              </Stack>

              {hasActiveFilters && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {activeFilters.map((filter) => (
                    <Chip
                      key={filter.key}
                      size="small"
                      label={filter.label}
                      onDelete={filter.onDelete}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>

          {filteredEquipment.length === 0 ? (
            <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
              <InventoryIcon sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Nu exista rezultate pentru filtrele curente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ajusteaza cautarea sau reseteaza filtrele pentru a vedea toate inregistrarile.
              </Typography>
              {hasActiveFilters && (
                <Button variant="contained" size="small" onClick={clearFilters}>
                  Curata filtrele
                </Button>
              )}
            </Box>
          ) : (
            <MaterialReactTable table={table} />
          )}
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
          <Chip size="small" label="Activ" sx={{ bgcolor: alpha(statusColors.active, 0.14), color: statusColors.active }} />
          <Chip size="small" label="Returnat" sx={{ bgcolor: alpha(statusColors.returned, 0.14), color: statusColors.returned }} />
          <Chip size="small" label="Distrus" sx={{ bgcolor: alpha(statusColors.destroyed, 0.14), color: statusColors.destroyed }} />
        </Stack>
      </Box>
    </Box>
  );
};

export default TeamEquipmentOverviewPage;
