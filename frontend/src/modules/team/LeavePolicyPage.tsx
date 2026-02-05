// src/modules/team/LeavePolicyPage.tsx - Leave Policy Management
import { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Tabs, Tab,
  Card, CardContent, Chip, IconButton, Tooltip,
  Alert, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControlLabel,
  Switch, useTheme, useMediaQuery, alpha,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  EventBusy as EventBusyIcon,
  AcUnit as AcUnitIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';
import {
  useLeavePolicy,
  useUpdateLeavePolicy,
  useCreateBlackoutPeriod,
  useUpdateBlackoutPeriod,
  useDeleteBlackoutPeriod,
  useCreateCompanyShutdown,
  useUpdateCompanyShutdown,
  useDeleteCompanyShutdown,
} from './hooks/useLeavePolicy';
import type { BlackoutPeriod, CompanyShutdown } from '../../api/leavePolicy';
import { useConfirm } from '../common/confirm/ConfirmProvider';

dayjs.locale('ro');

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LeavePolicyPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentTab, setCurrentTab] = useState(0);
  const [openBlackoutDialog, setOpenBlackoutDialog] = useState(false);
  const [openShutdownDialog, setOpenShutdownDialog] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState<BlackoutPeriod | null>(null);
  const [editingShutdown, setEditingShutdown] = useState<CompanyShutdown | null>(null);

  // Confirmation modal
  const confirm = useConfirm();

  // Fetch policy data
  const { data: policyData, isLoading, error, refetch } = useLeavePolicy();
  const updatePolicyMutation = useUpdateLeavePolicy();
  const createBlackoutMutation = useCreateBlackoutPeriod();
  const updateBlackoutMutation = useUpdateBlackoutPeriod();
  const deleteBlackoutMutation = useDeleteBlackoutPeriod();
  const createShutdownMutation = useCreateCompanyShutdown();
  const updateShutdownMutation = useUpdateCompanyShutdown();
  const deleteShutdownMutation = useDeleteCompanyShutdown();

  const policy = policyData;
  const blackoutPeriods = policy?.blackoutPeriods || [];
  const companyShutdowns = policy?.companyShutdowns || [];

  const handleDeleteBlackout = async (id: string, reason: string) => {
    const confirmed = await confirm({
      title: 'Confirmare Ștergere Blackout',
      bodyTitle: 'Ești sigur că vrei să ștergi această perioadă blackout?',
      description: (
        <>
          Perioada <strong>{reason}</strong> va fi ștearsă permanent.
          Angajații vor putea din nou solicita concediu în această perioadă.
        </>
      ),
      confirmText: 'Șterge Perioada',
      cancelText: 'Anulează',
      danger: true,
    });

    if (confirmed) {
      await deleteBlackoutMutation.mutateAsync(id);
    }
  };

  const handleDeleteShutdown = async (id: string, reason: string, days: number) => {
    const confirmed = await confirm({
      title: 'Confirmare Ștergere Închidere',
      bodyTitle: 'Ești sigur că vrei să ștergi această închidere de firmă?',
      description: (
        <>
          Închiderea <strong>{reason}</strong> ({days} zile) va fi ștearsă permanent.
          Zilele nu vor mai fi deduse automat din dreptul de concediu al angajaților.
        </>
      ),
      confirmText: 'Șterge Închiderea',
      cancelText: 'Anulează',
      danger: true,
    });

    if (confirmed) {
      await deleteShutdownMutation.mutateAsync(id);
    }
  };

  const accrualMethodLabels = {
    DAILY: 'Zilnic (pro-rata pe zi)',
    MONTHLY: 'Lunar (la începutul lunii)',
    AT_YEAR_START: 'La început de an (tot dreptul)',
    PRO_RATA: 'Pro-rata (recomandat)',
  };

  const roundingMethodLabels = {
    FLOOR: 'Jos (conservator)',
    CEIL: 'Sus (generos)',
    ROUND: 'Rotunjire normală',
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', p: 3 }}>
        <Alert severity="error">
          {error.message || 'Nu am putut încărca politica de concedii'}
        </Alert>
      </Box>
    );
  }

  if (!policy) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', p: 3 }}>
        <Alert severity="warning">
          Nu există nicio politică de concedii configurată
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ 
        width: '100%', 
        minHeight: '100vh', 
        p: 0, 
        m: 0, 
        bgcolor: alpha(theme.palette.primary.main, 0.02)
      }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            minHeight: '100vh', 
            overflow: 'auto',
            borderRadius: 0
          }}
        >
          {/* Header */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'center' }} 
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
              <SettingsIcon fontSize={isMobile ? 'medium' : 'large'} color="primary" />
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600}>
                Politică Concedii
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
                size={isMobile ? 'small' : 'medium'}
              >
                Reîncarcă
              </Button>
              {!isMobile && <Chip label="Setări Companie" color="primary" variant="outlined" />}
            </Stack>
          </Stack>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Configurează politica de concedii, perioadele de blackout și închiderile firmei. 
            {!isMobile && ' Modificările se aplică imediat pentru toți angajații.'}
          </Alert>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={(_, newValue) => setCurrentTab(newValue)}
              variant={isMobile ? 'fullWidth' : 'standard'}
              sx={{
                '& .MuiTab-root': {
                  minHeight: { xs: 48, sm: 64 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }
              }}
            >
              <Tab icon={<SettingsIcon />} label={isMobile ? 'Politică' : 'Politică Generală'} iconPosition={isMobile ? 'top' : 'start'} />
              <Tab icon={<EventBusyIcon />} label={isMobile ? 'Blackout' : 'Blackout Periods'} iconPosition={isMobile ? 'top' : 'start'} />
              <Tab icon={<AcUnitIcon />} label={isMobile ? 'Închideri' : 'Închideri Firmă'} iconPosition={isMobile ? 'top' : 'start'} />
            </Tabs>
          </Box>

          {/* Tab 1: General Policy */}
          <TabPanel value={currentTab} index={0}>
            <Stack spacing={2}>
              {/* Base Configuration */}
              <Card variant="outlined">
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} gutterBottom>
                    Configurare de Bază
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip 
                        label={`Zile de bază: ${policy.baseAnnualDays}`}
                        color="primary"
                        size="small"
                      />
                      <Chip 
                        label={`Bonus: +${policy.bonusPerStep} zi la ${policy.seniorityStepYears} ani`}
                        color="success"
                        size="small"
                      />
                    </Stack>

                    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                      <Typography variant="body2">
                        <strong>Exemplu:</strong> Un angajat cu 7 ani vechime are dreptul la {policy.baseAnnualDays + policy.bonusPerStep} zile 
                        {!isMobile && ' (21 de bază + 1 bonus)'}.
                      </Typography>
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>

              {/* Accrual Method */}
              <Card variant="outlined">
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} gutterBottom>
                    Metoda de Acumulare
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Chip 
                    label={accrualMethodLabels[policy.accrualMethod]}
                    color="info"
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                    <Typography variant="body2">
                      <strong>Pro-rata:</strong> Zilele se acumulează proporțional{isMobile ? '.' : ' pe parcursul anului. Un angajat angajat pe 1 iulie va avea 50% din drept până la finalul anului.'}
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>

              {/* Restrictions */}
              <Card variant="outlined">
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} gutterBottom>
                    Restricții și Limite
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                      {policy.maxConsecutiveDays && (
                        <Chip 
                          label={`Max consecutive: ${policy.maxConsecutiveDays}z`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {policy.minNoticeDays && (
                        <Chip 
                          label={`Preaviz: ${policy.minNoticeDays}z`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      <Chip 
                        label={`Sold negativ: ${policy.maxNegativeBalance === 0 ? 'Nu' : `${policy.maxNegativeBalance}z`}`}
                        variant="outlined"
                        color={policy.maxNegativeBalance === 0 ? 'error' : 'warning'}
                        size="small"
                      />
                      <Chip 
                        label={`Rotunjire: ${roundingMethodLabels[policy.roundingMethod].split(' ')[0]}`}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>

          {/* Tab 2: Blackout Periods */}
          <TabPanel value={currentTab} index={1}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
                  Perioade Blackout
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenBlackoutDialog(true)}
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile}
                >
                  Adaugă Blackout
                </Button>
              </Stack>

              <Alert severity="warning" icon={<EventBusyIcon />} sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                Perioadele de blackout blochează solicitările de concediu{!isMobile && ' pentru toți angajații'}. 
                {!isMobile && 'Folosește pentru perioade de vârf sau inventar.'}
              </Alert>

              {blackoutPeriods.length === 0 ? (
                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                  Nu există perioade de blackout configurate.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {blackoutPeriods.map((period) => (
                    <Card key={period.id} variant="outlined">
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={1}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom noWrap>
                              {period.reason}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                              <Chip 
                                label={`${dayjs(period.startDate).format(isMobile ? 'DD/MM' : 'DD MMM YYYY')} - ${dayjs(period.endDate).format(isMobile ? 'DD/MM' : 'DD MMM YYYY')}`}
                                size="small"
                                color="error"
                              />
                              <Chip 
                                label={period.allowExceptions ? 'Excepții' : 'Fără excepții'}
                                size="small"
                                color={period.allowExceptions ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            </Stack>
                            {period.allowExceptions && !isMobile && (
                              <Typography variant="caption" color="text.secondary">
                                * Solicitările pot fi aprobate manual
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Editează">
                              <IconButton 
                                size="small"
                                onClick={() => setEditingBlackout(period)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Șterge">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteBlackout(period.id, period.reason)}
                                disabled={deleteBlackoutMutation.isPending}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </TabPanel>

          {/* Tab 3: Company Shutdowns */}
          <TabPanel value={currentTab} index={2}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
                  Închideri Firmă
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenShutdownDialog(true)}
                  color="info"
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile}
                >
                  Adaugă Închidere
                </Button>
              </Stack>

              <Alert severity="info" icon={<AcUnitIcon />} sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                Închiderile firmei{!isMobile && ' (ex: Crăciun, Revelion)'} deduc automat zile din concediu.
              </Alert>

              {companyShutdowns.length === 0 ? (
                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                  Nu există închideri de firmă configurate.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {companyShutdowns.map((shutdown) => (
                    <Card key={shutdown.id} variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.200' }}>
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={1}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                              <AcUnitIcon color="info" fontSize={isMobile ? 'small' : 'medium'} />
                              <Typography variant={isMobile ? 'subtitle1' : 'h6'} noWrap>
                                {shutdown.reason}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                              <Chip 
                                label={`${dayjs(shutdown.startDate).format(isMobile ? 'DD/MM' : 'DD MMM YYYY')} - ${dayjs(shutdown.endDate).format(isMobile ? 'DD/MM' : 'DD MMM YYYY')}`}
                                size="small"
                                color="info"
                              />
                              <Chip 
                                label={`${shutdown.days}z`}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip 
                                label={shutdown.deductFromAllowance ? 'Dedus' : 'Bonus'}
                                size="small"
                                color={shutdown.deductFromAllowance ? 'warning' : 'success'}
                                variant="outlined"
                              />
                            </Stack>
                            {shutdown.deductFromAllowance && !isMobile && (
                              <Typography variant="caption" color="text.secondary">
                                * {shutdown.days} zile deduse automat din dreptul de concediu
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Editează">
                              <IconButton 
                                size="small"
                                onClick={() => setEditingShutdown(shutdown)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Șterge">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteShutdown(shutdown.id, shutdown.reason, shutdown.days)}
                                disabled={deleteShutdownMutation.isPending}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </TabPanel>
        </Paper>

        {/* Add Blackout Dialog */}
        <BlackoutPeriodDialog 
          open={openBlackoutDialog || editingBlackout !== null}
          onClose={() => {
            setOpenBlackoutDialog(false);
            setEditingBlackout(null);
          }}
          policyId={policy.id}
          createMutation={createBlackoutMutation}
          updateMutation={updateBlackoutMutation}
          editingPeriod={editingBlackout}
        />

        {/* Add Shutdown Dialog */}
        <CompanyShutdownDialog 
          open={openShutdownDialog || editingShutdown !== null}
          onClose={() => {
            setOpenShutdownDialog(false);
            setEditingShutdown(null);
          }}
          policyId={policy.id}
          createMutation={createShutdownMutation}
          updateMutation={updateShutdownMutation}
          editingShutdown={editingShutdown}
        />
      </Box>
    </LocalizationProvider>
  );
}

// Blackout Period Dialog Component
interface BlackoutPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  policyId: string;
  createMutation: ReturnType<typeof useCreateBlackoutPeriod>;
  updateMutation: ReturnType<typeof useUpdateBlackoutPeriod>;
  editingPeriod?: BlackoutPeriod | null;
}

function BlackoutPeriodDialog({ open, onClose, policyId, createMutation, updateMutation, editingPeriod }: BlackoutPeriodDialogProps) {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [reason, setReason] = useState('');
  const [allowExceptions, setAllowExceptions] = useState(false);

  // Load existing data when editing
  useState(() => {
    if (editingPeriod) {
      setStartDate(dayjs(editingPeriod.startDate));
      setEndDate(dayjs(editingPeriod.endDate));
      setReason(editingPeriod.reason);
      setAllowExceptions(editingPeriod.allowExceptions);
    }
  });

  const handleSave = async () => {
    if (!startDate || !endDate || !reason) return;
    
    if (editingPeriod) {
      // Update existing
      await updateMutation.mutateAsync({
        id: editingPeriod.id,
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          reason,
          allowExceptions,
        },
      });
    } else {
      // Create new
      await createMutation.mutateAsync({
        policyId,
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          reason,
          allowExceptions,
        },
      });
    }
    
    // Reset form
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setAllowExceptions(false);
    onClose();
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setAllowExceptions(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingPeriod ? 'Editează Perioada Blackout' : 'Adaugă Perioada Blackout'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Motiv"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            required
            placeholder="ex: Sezon de vârf, Inventar anual"
          />
          
          <DatePicker
            label="Data început"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <DatePicker
            label="Data sfârșit"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={allowExceptions}
                onChange={(e) => setAllowExceptions(e.target.checked)}
              />
            }
            label="Permite aprobare manuală (excepții)"
          />

          <Alert severity="info">
            Angajații nu vor putea solicita concediu în această perioadă.
            {allowExceptions && ' Solicitările pot fi aprobate manual de către manageri.'}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Anulează</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!startDate || !endDate || !reason || createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? 'Se salvează...' : editingPeriod ? 'Actualizează' : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Company Shutdown Dialog Component
interface CompanyShutdownDialogProps {
  open: boolean;
  onClose: () => void;
  policyId: string;
  createMutation: ReturnType<typeof useCreateCompanyShutdown>;
  updateMutation: ReturnType<typeof useUpdateCompanyShutdown>;
  editingShutdown?: CompanyShutdown | null;
}

function CompanyShutdownDialog({ open, onClose, policyId, createMutation, updateMutation, editingShutdown }: CompanyShutdownDialogProps) {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<number>(0);
  const [deductFromAllowance, setDeductFromAllowance] = useState(true);

  // Load existing data when editing
  useState(() => {
    if (editingShutdown) {
      setStartDate(dayjs(editingShutdown.startDate));
      setEndDate(dayjs(editingShutdown.endDate));
      setReason(editingShutdown.reason);
      setDays(editingShutdown.days);
      setDeductFromAllowance(editingShutdown.deductFromAllowance);
    }
  });

  const handleSave = async () => {
    if (!startDate || !endDate || !reason || days <= 0) return;
    
    if (editingShutdown) {
      // Update existing
      await updateMutation.mutateAsync({
        id: editingShutdown.id,
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          days,
          reason,
          deductFromAllowance,
        },
      });
    } else {
      // Create new
      await createMutation.mutateAsync({
        policyId,
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          days,
          reason,
          deductFromAllowance,
        },
      });
    }
    
    // Reset form
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setDays(0);
    setDeductFromAllowance(true);
    onClose();
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setDays(0);
    setDeductFromAllowance(true);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingShutdown ? 'Editează Închidere Firmă' : 'Adaugă Închidere Firmă'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Motiv"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            required
            placeholder="ex: Sărbători Crăciun, Revelion"
          />
          
          <DatePicker
            label="Data început"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <DatePicker
            label="Data sfârșit"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <TextField
            label="Zile lucrătoare"
            type="number"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            fullWidth
            required
            helperText="Numărul de zile de lucru în această perioadă"
          />

          <FormControlLabel
            control={
              <Switch
                checked={deductFromAllowance}
                onChange={(e) => setDeductFromAllowance(e.target.checked)}
              />
            }
            label="Deduce din dreptul de concediu"
          />

          <Alert severity={deductFromAllowance ? "warning" : "success"}>
            {deductFromAllowance 
              ? `Fiecare angajat va avea ${days} zile deduse automat din dreptul de concediu.`
              : 'Acest concediu este bonus (nu se deduce din dreptul anual).'}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Anulează</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!startDate || !endDate || !reason || days <= 0 || createMutation.isPending || updateMutation.isPending}
          color="info"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Se salvează...' : editingShutdown ? 'Actualizează' : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
