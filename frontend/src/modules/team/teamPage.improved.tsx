// src/modules/team/teamPage.improved.tsx
import { useState, useMemo } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  CircularProgress, Chip, Alert, Card, CardContent,
  LinearProgress, Divider, Grid, ButtonBase
} from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import AddEmployeeModal from './AddEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import AddLeaveModal from './AddLeaveModal';
import HolidayHistoryModal from './HolidayHistoryModal';

import { useConfirm } from '../common/confirm/ConfirmProvider';
import { useEmployees, useDeleteEmployee, useCreateEmployee } from './hooks/useEmployees';
import { useTenure, formatTenureRo, calculateTenure } from './hooks/useTenure';
import type { EmployeeWithStats } from '../../api/employees';

dayjs.locale('ro');

/** ───────────────── Utility Functions ───────────────── **/
const PRO_RATA_ROUND = Math.floor;

const formatDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? dayjs(value) : dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
};

const isLegacyEmployee = (hiredAt?: string | Date | null): boolean => {
  if (!hiredAt) return true;
  const d = dayjs(hiredAt).startOf('day');
  if (!d.isValid()) return true;
  const now = dayjs().startOf('day');
  const years = now.diff(d, 'year');
  return years >= 1;
};

const getAccruedForDisplay = (employee: EmployeeWithStats, year = dayjs().year()): number => {
  const annualEntitlement = employee.entitledDays ?? 21;
  if (isLegacyEmployee(employee.hiredAt)) return annualEntitlement;

  if (employee.leaveBalance?.accrued !== undefined) {
    return employee.leaveBalance.accrued;
  }

  const hire = dayjs(employee.hiredAt);
  if (!hire.isValid()) return annualEntitlement;

  const yEnd = dayjs(`${year}-12-31`);
  const denom = yEnd.diff(hire, 'day') + 1;
  const daysSoFar = dayjs().diff(hire, 'day') + 1;
  if (denom <= 0) return 0;
  const safeDays = Math.max(0, Math.min(daysSoFar, denom));
  return PRO_RATA_ROUND((annualEntitlement * safeDays) / denom);
};

/** ───────────────── Table Columns ───────────────── **/
const createColumns = (): MRT_ColumnDef<EmployeeWithStats>[] => [
  {
    accessorKey: 'name',
    header: 'Nume',
    size: 200,
    Cell: ({ cell, row }) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" fontWeight={600}>
          {cell.getValue() as string}
        </Typography>
        {row.original.isActive === false && (
          <Chip size="small" color="default" label="Inactiv" variant="outlined" />
        )}
        {row.original.leaveBalance?.pendingDays !== undefined && row.original.leaveBalance.pendingDays > 0 && (
          <Tooltip title={`${row.original.leaveBalance.pendingDays} zile în așteptare aprobare`}>
            <WarningAmberIcon fontSize="small" color="warning" />
          </Tooltip>
        )}
      </Stack>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    size: 100,
    Cell: ({ cell }) => (
      <Chip 
        size="small" 
        label={cell.getValue() !== false ? 'Activ' : 'Inactiv'} 
        color={cell.getValue() !== false ? 'success' : 'default'} 
        variant={cell.getValue() !== false ? 'filled' : 'outlined'} 
      />
    ),
  },
  {
    accessorKey: 'cnp',
    header: 'CNP',
    size: 140,
    Cell: ({ cell }) => (cell.getValue() as string) || '—',
  },
  {
    accessorKey: 'qualifications',
    header: 'Calificări',
    size: 220,
    Cell: ({ cell }) => {
      const qualifications = (cell.getValue<string[]>() || []).filter(Boolean);
      return qualifications.length ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
          {qualifications.map((q, i) => (
            <Chip key={i} label={q} size="small" color="primary" variant="outlined" />
          ))}
        </Stack>
      ) : '—';
    },
  },
  {
    accessorKey: 'hiredAt',
    header: 'Angajat din',
    size: 120,
    Cell: ({ cell }) => formatDate(cell.getValue<string>()),
  },
  {
    id: 'tenure',
    header: 'Vechime',
    accessorFn: (row) => {
      const tenure = calculateTenure(row.hiredAt);
      return tenure?.totalDays ?? -1;
    },
    sortingFn: 'basic',
    sortDescFirst: true,
    size: 160,
    Cell: ({ row }) => {
      const tenure = calculateTenure(row.original.hiredAt);
      return (
        <Tooltip title="Click pentru detalii">
          <Chip
            label={formatTenureRo(tenure)}
            size="small"
            color="info"
            variant="outlined"
            onClick={() => row.toggleExpanded()}
            clickable
            sx={{ cursor: 'pointer', fontWeight: 500 }}
          />
        </Tooltip>
      );
    },
  },
  {
    id: 'leaveStatus',
    header: 'Concediu',
    accessorFn: (row) => {
      const currentYear = dayjs().year();
      const accrued = getAccruedForDisplay(row, currentYear);
      const carriedOver = row.leaveBalance?.carriedOver ?? 0;
      const companyShutdown = row.leaveBalance?.companyShutdownDays ?? 0;
      const voluntary = row.leaveBalance?.voluntaryDays ?? 0;
      const taken = (companyShutdown + voluntary) || row.takenDays || 0;
      return Math.max(0, accrued + carriedOver - taken);
    },
    sortingFn: 'basic',
    size: 240,
    Cell: ({ row }) => {
      const employee = row.original;
      const lb = employee.leaveBalance;
      const currentYear = dayjs().year();
      const isLegacy = isLegacyEmployee(employee.hiredAt);
      const annualEntitlement = employee.entitledDays ?? 21;
      
      // Use leaveBalance if available (more accurate), fallback to legacy fields
      const accrued = getAccruedForDisplay(employee, currentYear);
      const carriedOver = lb?.carriedOver ?? 0;
      const pending = lb?.pendingDays ?? 0;
      const companyShutdown = lb?.companyShutdownDays ?? 0;
      const voluntary = lb?.voluntaryDays ?? 0;
      
      // Calculate taken and remaining (consume carryover first)
      const taken = (companyShutdown + voluntary) || employee.takenDays || 0;
      const carryoverUsed = Math.min(carriedOver, taken);
      const currentUsed = Math.max(0, taken - carryoverUsed);
      const remainingCarryover = Math.max(0, carriedOver - taken);
      const remainingCurrent = Math.max(0, accrued - currentUsed);
      const remaining = Math.max(0, remainingCarryover + remainingCurrent);
      
      // Calculate total available (accrued + carryover) - this is the max possible
      const totalAvailable = accrued + carriedOver;
      
      // Calculate percentage based on total available (accrued + carryover)
      const percentage = totalAvailable > 0 ? Math.max(0, Math.min(100, (remaining / totalAvailable) * 100)) : 0;
      
      // Improved color logic
      let color: 'success' | 'warning' | 'error' = 'success';
      if (remaining <= 0) color = 'error';
      else if (percentage < 25) color = 'error';
      else if (percentage < 50) color = 'warning';

      // Check for warnings
      const hasWarnings = pending > 0 || remaining < 0;

      return (
        <Tooltip 
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                📊 Detalii Concediu
              </Typography>
              <Divider sx={{ mb: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />
              
              <Typography variant="caption" display="block" color="primary.light" sx={{ mb: 0.5 }}>
                📅 Drept anual: <strong>{annualEntitlement}</strong> zile/an
              </Typography>
              
              <Typography variant="caption" display="block">
                ✓ Acumulat {isLegacy ? '(an întreg)' : '(pro-rata)'}: <strong>{accrued}</strong> zile
              </Typography>
              
              {carriedOver > 0 && (
                <Typography variant="caption" display="block" color="info.light">
                  ↪ Reportate din {dayjs().year() - 1}: <strong>+{carriedOver}</strong> zile
                </Typography>
              )}
              
              <Typography variant="caption" display="block" color="warning.light" sx={{ mt: 0.5 }}>
                ✕ Folosite: <strong>{taken}</strong> zile
                {companyShutdown > 0 && voluntary > 0 && ` (${voluntary} personale + ${companyShutdown} firmă)`}
              </Typography>
              {(carriedOver > 0 || accrued > 0) && (
                <Typography variant="caption" display="block" color="info.light">
                  ↘ Consum: <strong>{carryoverUsed}</strong> reportate, <strong>{currentUsed}</strong> an curent
                </Typography>
              )}
              
              {pending > 0 && (
                <Typography variant="caption" display="block" color="orange">
                  ⏳ În așteptare: <strong>{pending}</strong> zile
                </Typography>
              )}
              
              <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />
              <Typography variant="caption" display="block" fontWeight={700} color={remaining > 0 ? 'success.light' : 'error.light'}>
                = Disponibile: <strong>{remaining}</strong> zile
                {carriedOver > 0 && (
                  <> (din care <strong>{remainingCarryover}</strong> reportate)</>
                )}
              </Typography>
            </Box>
          }
        >
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Chip
                label={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.2 }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>{remaining}</Box>
                    <Box component="span" sx={{ mx: 0.2 }}>/</Box>
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 700,
                        color: 'inherit',
                      }}
                    >
                      {annualEntitlement}
                    </Box>
                  </Box>
                }
                size="small"
                color={color}
                icon={hasWarnings ? <WarningAmberIcon /> : remaining > 0 ? <CheckCircleIcon /> : <WarningAmberIcon />}
                sx={{ fontWeight: 600, minWidth: 70 }}
              />
              
              {carriedOver > 0 && (
                <Tooltip title="Zile reportate din anul trecut">
                  <Chip
                    label={`+${carriedOver} din ${dayjs().year() - 1}`}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Tooltip>
              )}
              
              {pending > 0 && (
                <Tooltip title="Zile în așteptare aprobare">
                  <Chip
                    label={`⏳${pending}`}
                    size="small"
                    color="warning"
                    variant="filled"
                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Tooltip>
              )}
            </Stack>
            
            {/* Main progress bar (no split) */}
            <Box sx={{ position: 'relative', mt: 0.5 }}>
              {/* Background layer: Full annual entitlement (greyed out) */}
              <Box
                sx={{
                  width: '100%',
                  height: 5,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(100, (remaining / annualEntitlement) * 100)}%`,
                    bgcolor: color === 'error' ? 'error.main' : color === 'warning' ? 'warning.main' : 'success.main',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
              
              {/* Carryover indicator bar (below main bar) */}
              {carriedOver > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (carriedOver / annualEntitlement) * 100)}
                  color="info"
                  sx={{ 
                    mt: 0.25, 
                    height: 2, 
                    borderRadius: 1,
                    opacity: 0.6,
                    bgcolor: 'transparent',
                  }}
                />
              )}
            </Box>
            
            {carriedOver > 0 && (
               <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, fontSize: '0.65rem' }}>
                 Include {carriedOver} zile din {dayjs().year() - 1}
               </Typography>
            )}
          </Box>
        </Tooltip>
      );
    },
  },
];

/** ───────────────── Detail Panel Component ───────────────── **/
interface DetailPanelProps {
  employee: EmployeeWithStats;
  currentYear: number;
}

const EmployeeDetailPanel: React.FC<DetailPanelProps> = ({ employee, currentYear }) => {
  const leaveBalance = employee.leaveBalance;
  const { formatted: tenureFormatted } = useTenure(employee.hiredAt);
  
  // Display rule: legacy employees show full-year entitlement; new hires stay pro-rata.
  const annualEntitlement = employee.entitledDays || 21;
  const seniorityBonus = Math.max(0, annualEntitlement - 21);
  const isLegacy = isLegacyEmployee(employee.hiredAt);
  const accruedToday = getAccruedForDisplay(employee, currentYear);
  const carriedOver = leaveBalance?.carriedOver ?? 0;
  const takenDays = leaveBalance ? (leaveBalance.voluntaryDays + leaveBalance.companyShutdownDays) : employee.takenDays || 0;
  const remainingDays = Math.max(0, accruedToday + carriedOver - takenDays);
  const totalAvailable = accruedToday + carriedOver;
  const usagePercent = totalAvailable > 0 ? (takenDays / totalAvailable) * 100 : 0;
  const isInactive = employee.isActive === false;

  return (
    <Box sx={{ p: 2, bgcolor: 'background.default', width: '100%' }}>
      {/* Inactive Employee Banner */}
      {isInactive && (
        <Alert 
          severity="warning" 
          icon={<PersonOffIcon fontSize="small" />}
          sx={{ mb: 2, py: 0.5 }}
        >
          <Typography variant="caption">
            <strong>Angajat inactiv</strong> – datele de concediu sunt înghețate la data plecării
          </Typography>
        </Alert>
      )}

      {/* Compact Header with Key Stats */}
      <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }}>
        {/* Employee Name & Status */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={600} noWrap>
              {employee.name}
            </Typography>
            {isInactive && (
              <Chip size="small" label="Inactiv" color="default" variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {tenureFormatted} • Angajat din {formatDate(employee.hiredAt)}
              {employee.age && ` • ${employee.age} ani`}
            </Typography>
          </Stack>
        </Box>

        {/* Big Available Days Counter */}
        <Box sx={{ 
          textAlign: 'center', 
          bgcolor: isInactive ? 'grey.100' : 'success.50', 
          px: 3, 
          py: 1, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: isInactive ? 'grey.300' : 'success.200',
          opacity: isInactive ? 0.7 : 1
        }}>
          <Typography variant="h4" color={isInactive ? 'text.secondary' : 'success.dark'} fontWeight={700} lineHeight={1}>
            {remainingDays}
          </Typography>
          <Typography variant="caption" color={isInactive ? 'text.secondary' : 'success.dark'} fontWeight={500}>
            zile disponibile
          </Typography>
        </Box>
      </Stack>

      {/* Progress Bar with Usage */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Concediu folosit
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {takenDays} / {totalAvailable} zile
          </Typography>
        </Stack>
        <LinearProgress 
          variant="determinate" 
          value={Math.min(usagePercent, 100)} 
          sx={{ 
            height: 8, 
            borderRadius: 1,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              bgcolor: usagePercent > 80 ? 'warning.main' : 'primary.main',
              borderRadius: 1,
            }
          }} 
        />
      </Box>

      {/* Compact Stats Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Entitlement Breakdown */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: 'grey.50', 
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <BeachAccessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.primary">
                Drept Anual
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Bază</Typography>
                <Typography variant="caption" fontWeight={500}>21 zile</Typography>
              </Stack>
              {seniorityBonus > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Bonus vechime</Typography>
                  <Typography variant="caption" fontWeight={500} color="success.main">+{seniorityBonus}</Typography>
                </Stack>
              )}
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={600}>Total</Typography>
                <Typography variant="caption" fontWeight={600}>{annualEntitlement} zile</Typography>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        {/* Accrued + Carryover */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: 'primary.50', 
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'primary.200'
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.primary">
                Disponibil {currentYear}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Acumulat {isLegacy ? '' : '(pro-rata)'}
                </Typography>
                <Typography variant="caption" fontWeight={500}>{accruedToday} zile</Typography>
              </Stack>
              {carriedOver > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Reportat {currentYear - 1}</Typography>
                  <Typography variant="caption" fontWeight={500} color="info.main">+{carriedOver}</Typography>
                </Stack>
              )}
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={600}>Total</Typography>
                <Typography variant="caption" fontWeight={600}>{totalAvailable} zile</Typography>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        {/* Usage Breakdown */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: takenDays > 0 ? 'warning.50' : 'grey.50', 
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: takenDays > 0 ? 'warning.200' : 'grey.200'
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventAvailableIcon sx={{ fontSize: 16, color: takenDays > 0 ? 'warning.main' : 'grey.500' }} />
              <Typography variant="caption" fontWeight={600} color="text.primary">
                Zile Folosite
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              {leaveBalance && leaveBalance.voluntaryDays > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Cereri personale</Typography>
                  <Typography variant="caption" fontWeight={500}>{leaveBalance.voluntaryDays}</Typography>
                </Stack>
              )}
              {leaveBalance && leaveBalance.companyShutdownDays > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Închidere firmă</Typography>
                  <Typography variant="caption" fontWeight={500}>{leaveBalance.companyShutdownDays}</Typography>
                </Stack>
              )}
              {takenDays === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Niciun concediu luat
                </Typography>
              )}
              {takenDays > 0 && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" fontWeight={600}>Total</Typography>
                    <Typography variant="caption" fontWeight={600}>{takenDays} zile</Typography>
                  </Stack>
                </>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Pending Warning if any */}
      {leaveBalance && leaveBalance.pendingDays > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningAmberIcon fontSize="small" />}
          sx={{ py: 0.5, mb: 1 }}
        >
          <Typography variant="caption">
            <strong>{leaveBalance.pendingDays} zile</strong> în așteptare aprobare
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

/** ───────────────── Main Component ───────────────── **/
export default function TeamPage() {
  const confirm = useConfirm();
  const currentYear = dayjs().year();
  const [showInactive, setShowInactive] = useState(false);

  // React Query hooks
  const { data: employees = [], isLoading, error, refetch } = useEmployees();
  const deleteEmployeeMutation = useDeleteEmployee();
  const createEmployeeMutation = useCreateEmployee();

  // Modal states
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<EmployeeWithStats | null>(null);
  const [openLeave, setOpenLeave] = useState<EmployeeWithStats | null>(null);
  const [openHistory, setOpenHistory] = useState<EmployeeWithStats | null>(null);

  // Table columns
  const columns = useMemo(() => createColumns(), []);

  const visibleEmployees = useMemo(() => {
    if (showInactive) return employees;
    return employees.filter((e) => e.isActive !== false);
  }, [employees, showInactive]);

  // Handlers
  const handleDelete = async (employee: EmployeeWithStats) => {
    const confirmed = await confirm({
      title: 'Confirmare Ștergere Angajat',
      bodyTitle: 'Ești sigur că vrei să ștergi angajatul?',
      description: (
        <>
          Angajatul <strong>{employee.name}</strong> va fi șters permanent.
        </>
      ),
      confirmText: 'Șterge Angajat',
      cancelText: 'Anulează',
      danger: true,
    });

    if (confirmed) {
      deleteEmployeeMutation.mutate(employee.id);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>

          <Stack direction="row" gap={1} alignItems="center">
            <Groups2RoundedIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Echipă
            </Typography>
            {visibleEmployees.length > 0 && (
              <Chip
                label={`${visibleEmployees.length} ${visibleEmployees.length === 1 ? 'angajat' : 'angajați'}`}
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 0.5,
              }}
            >
              <ButtonBase
                onClick={() => setShowInactive(false)}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: !showInactive ? 'primary.main' : 'text.secondary',
                  bgcolor: !showInactive ? 'background.paper' : 'transparent',
                  boxShadow: !showInactive ? 1 : 0,
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: !showInactive ? 'background.paper' : 'action.selected' },
                }}
              >
                Activi
              </ButtonBase>
              <ButtonBase
                onClick={() => setShowInactive(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: showInactive ? 'primary.main' : 'text.secondary',
                  bgcolor: showInactive ? 'background.paper' : 'transparent',
                  boxShadow: showInactive ? 1 : 0,
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: showInactive ? 'background.paper' : 'action.selected' },
                }}
              >
                <PersonOffIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Toți
              </ButtonBase>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={18} /> : 'Reîncarcă'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setOpenAdd(true)}
            >
              Adaugă angajat
            </Button>
          </Stack>
        </Stack>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message || 'Eroare la încărcarea echipei'}
          </Alert>
        )}

        {/* Table */}
        <MaterialReactTable
          columns={columns}
          data={visibleEmployees}
          state={{ isLoading }}
          localization={MRT_Localization_RO}

          // Row actions
          enableRowActions
          positionActionsColumn="last"
          renderRowActions={({ row }) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Istoric concedii">
                <IconButton
                  size="small"
                  onClick={() => setOpenHistory(row.original)}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Adaugă concediu">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setOpenLeave(row.original)}
                >
                  <EventAvailableIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Editează">
                <IconButton
                  size="small"
                  onClick={() => setOpenEdit(row.original)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Șterge">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row.original)}
                  disabled={deleteEmployeeMutation.isPending}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          // Expandable rows
          enableExpanding
          getRowCanExpand={() => true}
          positionExpandColumn="first"
          renderDetailPanel={({ row }) => (
            <EmployeeDetailPanel
              employee={row.original}
              currentYear={currentYear}
            />
          )}

          // Pagination
          initialState={{
            sorting: [{ id: 'tenure', desc: true }],
            columnVisibility: { isActive: false },
          }}

          // Performance
          enableRowVirtualization
          enableSorting
          enableColumnFilters
          enableGlobalFilter
          enableFilterMatchHighlighting

          // Styling
          muiTableContainerProps={{
            sx: { maxHeight: 'calc(100vh - 260px)' },
          }}
          enablePagination={false}
        />
      </Paper>

      {/* Modals */}
      <AddEmployeeModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={async (employeeData) => {
          await createEmployeeMutation.mutateAsync(employeeData as any);
          setOpenAdd(false);
        }}
        saving={createEmployeeMutation.isPending}
      />

      <EditEmployeeModal
        open={openEdit !== null}
        onClose={() => setOpenEdit(null)}
        employee={openEdit}
        onEmployeeUpdated={() => {
          // Modal calls this after successful update, then calls handleClose()
          // We just need to trigger a refetch to update the list
          refetch();
        }}
      />

      <AddLeaveModal
        open={!!openLeave}
        onClose={() => setOpenLeave(null)}
        employee={openLeave}
        onLeaveAdded={() => {
          setOpenLeave(null);
          refetch();
        }}
      />

      <HolidayHistoryModal
        open={!!openHistory}
        onClose={() => setOpenHistory(null)}
        employee={openHistory}
        onHistoryUpdated={() => refetch()}
      />
    </Box>
  );
}


