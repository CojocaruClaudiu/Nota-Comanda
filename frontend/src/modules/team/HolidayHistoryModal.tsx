// src/modules/team/HolidayHistoryModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent,
  Button, Stack, IconButton, Typography,
  Box, Divider, Fade, Chip, Alert, List, ListItem, ListItemText,
  Card, CardContent, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import { getLeaves, deleteLeave, type EmployeeWithStats, type Leave } from '../../api/employees';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { sumBusinessDaysForYear } from '../../utils/businessDays';
import useNotistack from '../orders/hooks/useNotistack';

dayjs.locale('ro');

interface HolidayHistoryModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeWithStats | null;
  onHistoryUpdated: () => void;
}

// Helper functions
const dmy = (v?: string | Date | null) => {
  if (!v) return '—';
  const d = typeof v === 'string' ? dayjs(v) : dayjs(v);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
};

// Pro-rata calculation functions (copied from teamPage for consistency)
const BASE_ANNUAL = 21;
const BONUS_EVERY_YEARS = 5;
const BONUS_PER_EVERY = 1;

const annualEntitlementAtYearEnd = (hiredAt?: string | null, year?: number) => {
  if (!hiredAt) return BASE_ANNUAL;
  const ref = dayjs(`${year ?? dayjs().year()}-12-31`);
  const years = ref.diff(dayjs(hiredAt), 'year');
  const bonusSteps = Math.floor(years / BONUS_EVERY_YEARS);
  return BASE_ANNUAL + bonusSteps * BONUS_PER_EVERY;
};

const proRataForYear = (hiredAt?: string | null, year?: number) => {
  const y = year ?? dayjs().year();
  if (!hiredAt) return annualEntitlementAtYearEnd(hiredAt, y);

  const hire = dayjs(hiredAt);
  if (!hire.isValid()) return annualEntitlementAtYearEnd(hiredAt, y);

  const yStart = dayjs(`${y}-01-01`);
  const yEnd = dayjs(`${y}-12-31`);
  const totalDaysInYear = yEnd.diff(yStart, 'day') + 1;

  if (hire.isBefore(yStart, 'day')) return annualEntitlementAtYearEnd(hiredAt, y);

  const daysEmployedThisYear = yEnd.diff(hire, 'day') + 1;
  const annual = annualEntitlementAtYearEnd(hiredAt, y);
  return Math.floor((annual * daysEmployedThisYear) / totalDaysInYear);
};

export const HolidayHistoryModal: React.FC<HolidayHistoryModalProps> = ({ 
  open,
  onClose,
  employee,
  onHistoryUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Leave[]>([]);
  const [historyYear, setHistoryYear] = useState<number | 'all'>(dayjs().year());
  const { successNotistack, errorNotistack } = useNotistack();

  // Load history when modal opens
  useEffect(() => {
    const loadHistory = async () => {
      if (!employee || !open) return;
      
      try {
        setLoading(true);
        const h = await getLeaves(employee.id);
        setHistory(h);
        setHistoryYear(dayjs().year());
      } catch (e: any) {
        errorNotistack(e?.message || 'Nu am putut încărca istoricul concediilor');
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, [employee, open, errorNotistack]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const confirm = useConfirm();

  const handleDeleteLeave = async (leaveId: string) => {
    const confirmed = await confirm({
      title: 'Confirmare ștergere concediu',
      bodyTitle: 'Ești sigur că vrei să ștergi această înregistrare de concediu?',
      description: (
        <>
          Înregistrarea va fi ștearsă definitiv. Această acțiune nu poate fi anulată.
        </>
      ),
      confirmText: 'Șterge înregistrarea',
      cancelText: 'Anulează',
      danger: true,
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await deleteLeave(leaveId);
      setHistory(prev => prev.filter(x => x.id !== leaveId));
      onHistoryUpdated();
      successNotistack('Înregistrare ștearsă cu succes');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge înregistrarea');
    } finally {
      setLoading(false);
    }
  };

  // Calculate available years
  const yearsAvailable = useMemo(() => {
    const s = new Set<number>();
    history.forEach(h => { 
      const y = dayjs(h.startDate).year(); 
      if (!isNaN(y)) s.add(y); 
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [history]);

  // Filter history by selected year
  const filteredHistory = useMemo(() => {
    if (historyYear === 'all') return history;
    return history.filter(h => dayjs(h.startDate).year() === historyYear);
  }, [history, historyYear]);

  // Calculate totals for the selected year
  const yearStats = useMemo(() => {
    if (!employee || historyYear === 'all') return null;
    
    const entitled = proRataForYear(employee.hiredAt, historyYear as number);
    const taken = sumBusinessDaysForYear(history as any, historyYear as number);
    const remaining = Math.max(0, entitled - taken);
    
    return { entitled, taken, remaining };
  }, [employee, history, historyYear]);

  // Calculate total days for display
  const totalDays = useMemo(() => {
    if (historyYear === 'all') {
      return history.reduce((acc, h) => acc + (h.days || 0), 0);
    }
    return sumBusinessDaysForYear(history as any, historyYear as number);
  }, [history, historyYear]);

  if (!employee) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }
      }}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          color: 'white',
          p: 3,
          position: 'relative'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HistoryIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="600">
              Istoric Concedii
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {employee.name} • Total: {history.length} înregistrări
            </Typography>
          </Box>
        </Stack>
        
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Year Filter Section */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CalendarTodayIcon color="primary" />
                Filtrare pe An
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flex: 1 }}>
                  <Chip 
                    label="Toți anii" 
                    variant={historyYear === 'all' ? 'filled' : 'outlined'} 
                    onClick={() => setHistoryYear('all')} 
                    clickable 
                    color="primary"
                  />
                  {yearsAvailable.map(y => (
                    <Chip 
                      key={y} 
                      label={String(y)} 
                      variant={historyYear === y ? 'filled' : 'outlined'} 
                      onClick={() => setHistoryYear(y)} 
                      clickable 
                      color="primary"
                    />
                  ))}
                </Stack>
                
                <DatePicker
                  label="Alege un an"
                  views={['year']}
                  openTo="year"
                  format="YYYY"
                  value={historyYear === 'all' ? null : dayjs(`${historyYear}-01-01`)}
                  onChange={(d) => setHistoryYear(d && d.isValid() ? d.year() : 'all')}
                  slotProps={{ 
                    textField: { 
                      size: 'small',
                      sx: { minWidth: 120 }
                    } 
                  }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Statistics Section */}
            {historyYear !== 'all' && yearStats && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AssessmentIcon color="secondary" />
                  Statistici {historyYear}
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'primary.main', flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main" fontWeight="600">
                        {yearStats.entitled}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Zile de drept
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'warning.main', flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main" fontWeight="600">
                        {yearStats.taken}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Zile folosite
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'success.main', flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main" fontWeight="600">
                        {yearStats.remaining}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Zile rămase
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'info.main', flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main" fontWeight="600">
                        {filteredHistory.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Înregistrări
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}

            {/* Summary for all years */}
            {historyYear === 'all' && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body1">
                  <strong>Istoric complet:</strong> {history.length} înregistrări • 
                  <strong> Total zile:</strong> {totalDays} zile • 
                  <strong> Primul concediu:</strong> {history.length > 0 ? dmy(history.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())[0]?.startDate) : '—'}
                </Typography>
              </Alert>
            )}

            <Divider />

            {/* History List Section */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EventAvailableIcon color="primary" />
                Lista Concediilor
                {historyYear !== 'all' && (
                  <Chip 
                    label={`${historyYear}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                )}
              </Typography>

              {filteredHistory.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography variant="body1">
                    Nu există înregistrări pentru perioada selectată.
                  </Typography>
                </Alert>
              ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  {filteredHistory
                    .slice()
                    .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf())
                    .map((h, index) => (
                      <React.Fragment key={h.id}>
                        <ListItem
                          sx={{
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          secondaryAction={
                            <Tooltip title="Șterge înregistrarea">
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleDeleteLeave(h.id)}
                                disabled={loading}
                                sx={{
                                  '&:hover': {
                                    bgcolor: 'error.light',
                                    color: 'white'
                                  }
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body1" fontWeight="500">
                                  {dmy(h.startDate)}
                                </Typography>
                                <Chip 
                                  label={`${h.days} ${h.days === 1 ? 'zi' : 'zile'}`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                              </Stack>
                            }
                            secondary={h.note || 'Fără notă specificată'}
                          />
                        </ListItem>
                        {index < filteredHistory.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                </List>
              )}
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      {/* Actions */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 3
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
            size="large"
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Închide
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default HolidayHistoryModal;
