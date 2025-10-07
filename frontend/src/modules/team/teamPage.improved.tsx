// src/modules/team/teamPage.improved.tsx
import { useState, useMemo } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_RO } from 'material-react-table/locales/ro';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  CircularProgress, Chip, Alert, Card, CardContent,
  LinearProgress, Divider, Grid
} from '@mui/material';
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
const formatDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? dayjs(value) : dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
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
        {row.original.leaveBalance?.pendingDays !== undefined && row.original.leaveBalance.pendingDays > 0 && (
          <Tooltip title={`${row.original.leaveBalance.pendingDays} zile în așteptare aprobare`}>
            <WarningAmberIcon fontSize="small" color="warning" />
          </Tooltip>
        )}
      </Stack>
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
    accessorFn: (row) => row.remainingDays ?? 0,
    sortingFn: 'basic',
    size: 240,
    Cell: ({ row }) => {
      const employee = row.original;
      const lb = employee.leaveBalance;
      
      // Use leaveBalance if available (more accurate), fallback to legacy fields
      const accrued = lb?.accrued ?? employee.entitledDays ?? 21;
      const carriedOver = lb?.carriedOver ?? 0;
      const pending = lb?.pendingDays ?? 0;
      const companyShutdown = lb?.companyShutdownDays ?? 0;
      const voluntary = lb?.voluntaryDays ?? 0;
      
      // Calculate taken and remaining
      const taken = (companyShutdown + voluntary) || employee.takenDays || 0;
      const remaining = employee.remainingDays ?? Math.max(0, accrued + carriedOver - taken);
      
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
                📅 Drept anual: <strong>{employee.entitledDays || 21}</strong> zile/an
              </Typography>
              
              <Typography variant="caption" display="block">
                ✓ Acumulat (pro-rata): <strong>{accrued}</strong> zile
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
              
              {pending > 0 && (
                <Typography variant="caption" display="block" color="orange">
                  ⏳ În așteptare: <strong>{pending}</strong> zile
                </Typography>
              )}
              
              <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />
              <Typography variant="caption" display="block" fontWeight={700} color={remaining > 0 ? 'success.light' : 'error.light'}>
                = Disponibile: <strong>{remaining}</strong> zile
              </Typography>
            </Box>
          }
        >
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Chip
                label={`${remaining}/${totalAvailable}`}
                size="small"
                color={color}
                icon={hasWarnings ? <WarningAmberIcon /> : remaining > 0 ? <CheckCircleIcon /> : <WarningAmberIcon />}
                sx={{ fontWeight: 600, minWidth: 70 }}
              />
              
              {carriedOver > 0 && (
                <Tooltip title="Zile reportate din anul trecut (expiră 31 martie)">
                  <Chip
                    label={`+${carriedOver}`}
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
            
            {/* Multi-layer progress bar showing full year allocation */}
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
                {/* Layer 1: Total available (accrued + carryover) - lighter shade */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(100, (totalAvailable / (employee.entitledDays || 21)) * 100)}%`,
                    bgcolor: color === 'error' ? 'error.light' : color === 'warning' ? 'warning.light' : 'success.light',
                    opacity: 0.3,
                    borderRadius: 2,
                  }}
                />
                
                {/* Layer 2: Remaining days (solid color) */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(100, (remaining / (employee.entitledDays || 21)) * 100)}%`,
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
                  value={Math.min(100, (carriedOver / (employee.entitledDays || 21)) * 100)}
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
  
  // Use backend calculations (source of truth) instead of frontend recalculation
  // Backend uses proper leave calculation service with correct rounding
  const annualEntitlement = employee.entitledDays || 21;
  const accruedToday = leaveBalance?.accrued || 0;
  const takenDays = leaveBalance ? (leaveBalance.voluntaryDays + leaveBalance.companyShutdownDays) : employee.takenDays || 0;
  const remainingDays = employee.remainingDays || 0;

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
      {/* Employee Info Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={12}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {employee.name}
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        {/* Tenure Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Vechime & Angajare
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Chip
                  color="primary"
                  label={`Vechime: ${tenureFormatted}`}
                  sx={{ fontWeight: 600 }}
                />
                <Chip label={`Angajat din: ${formatDate(employee.hiredAt)}`} />
                {employee.age !== null && employee.age !== undefined && (
                  <Chip label={`Vârstă: ${employee.age} ani`} variant="outlined" />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Annual Leave Entitlement */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <BeachAccessIcon color="success" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Drept Concediu Anual
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Chip
                  color="success"
                  label={`Drept/an: ${annualEntitlement} zile`}
                  sx={{ fontWeight: 600 }}
                />
                {annualEntitlement > 21 && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                    (21 zile bază + {annualEntitlement - 21} {annualEntitlement - 21 === 1 ? 'zi' : 'zile'} bonus vechime)
                  </Typography>
                )}
                <Chip 
                  label={`Acumulat până azi: ${accruedToday} zile`}
                  color="info"
                  variant="outlined"
                />
                {leaveBalance?.carriedOver !== undefined && leaveBalance.carriedOver > 0 && (
                  <Chip 
                    label={`+ ${leaveBalance.carriedOver} reportate din ${currentYear - 1}`}
                    color="info"
                    variant="outlined"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leave Balance Breakdown */}
      {leaveBalance && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={12}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventAvailableIcon fontSize="small" />
              Detalii Concediu
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Accrued Days */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.200' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" fontWeight={700}>
                  {leaveBalance.accrued}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zile acumulate (pro-rata)
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Carried Over */}
          {leaveBalance.carriedOver > 0 && (
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                    <Typography variant="h4" color="info.main" fontWeight={700}>
                      +{leaveBalance.carriedOver}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Reportate din anul trecut
                  </Typography>
                  <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                    (expiră 31 martie)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Voluntary Days Taken */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ bgcolor: 'warning.50', borderColor: 'warning.200' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main" fontWeight={700}>
                  {leaveBalance.voluntaryDays}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zile solicitate personal
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Company Shutdown Days */}
          {leaveBalance.companyShutdownDays > 0 && (
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                    <AcUnitIcon fontSize="small" color="info" />
                    <Typography variant="h4" color="info.main" fontWeight={700}>
                      {leaveBalance.companyShutdownDays}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Zile închidere firmă
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    (ex: Crăciun, Revelion)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Pending Approval */}
          {leaveBalance.pendingDays > 0 && (
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'warning.50', borderColor: 'warning.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                    <WarningAmberIcon fontSize="small" color="warning" />
                    <Typography variant="h4" color="warning.main" fontWeight={700}>
                      {leaveBalance.pendingDays}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    În așteptare aprobare
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Summary Section */}
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card variant="outlined" sx={{ bgcolor: 'success.50', borderColor: 'success.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Acumulat Total
                  </Typography>
                  <Typography variant="h5" color="primary.dark" fontWeight={700}>
                    {accruedToday + (leaveBalance?.carriedOver || 0)} zile
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Zile Folosite
                  </Typography>
                  <Typography variant="h5" color="warning.dark" fontWeight={700}>
                    {takenDays} zile
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Disponibile Acum
                  </Typography>
                  <Typography variant="h5" color="success.dark" fontWeight={700}>
                    {remainingDays} zile
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Footer */}
      <Alert severity="info" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
        <Typography variant="caption">
          <strong>Politica concediu:</strong> Fiecare angajat poate lua <strong>{annualEntitlement} zile/an</strong>{annualEntitlement > 21 && ` (21 bază + ${annualEntitlement - 21} bonus vechime)`}. 
          Zilele se acumulează pro-rata pe parcursul anului (se calculează zilnic). Maximum 5 zile pot fi reportate din anul anterior (expiră 31 martie).
          {leaveBalance?.companyShutdownDays !== undefined && leaveBalance.companyShutdownDays > 0 && (
            <> Închiderile firmei (ex: Crăciun, Revelion) se deduc automat din dreptul de concediu.</>
          )}
        </Typography>
      </Alert>
    </Box>
  );
};

/** ───────────────── Main Component ───────────────── **/
export default function TeamPage() {
  const confirm = useConfirm();
  const currentYear = dayjs().year();

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
          <Typography variant="h5" fontWeight={600}>
            Echipă
            {employees.length > 0 && (
              <Chip
                label={`${employees.length} ${employees.length === 1 ? 'angajat' : 'angajați'}`}
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Typography>

          <Stack direction="row" spacing={1}>
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
          data={employees}
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
            pagination: { pageIndex: 0, pageSize: 25 },
            sorting: [{ id: 'tenure', desc: true }],
          }}
          muiPaginationProps={{
            rowsPerPageOptions: [10, 25, 50, 100],
          }}

          // Performance
          enableRowVirtualization
          enablePagination
          enableSorting
          enableColumnFilters
          enableGlobalFilter
          enableFilterMatchHighlighting

          // Styling
          muiTableContainerProps={{
            sx: { maxHeight: 'calc(100vh - 200px)' },
          }}
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


