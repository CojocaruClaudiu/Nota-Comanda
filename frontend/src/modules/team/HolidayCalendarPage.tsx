// src/pages/calendar/HolidayCalendarPage.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventInput, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import roLocale from '@fullcalendar/core/locales/ro';
import {
  Box, Stack, Typography, CircularProgress, Alert, Chip, Divider,
  TextField, Button, Avatar, Tooltip, InputAdornment, IconButton, Card, CardContent,
  ToggleButtonGroup, ToggleButton, alpha, useTheme, Fade, Skeleton, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar,
  ListItemText, Paper, Popover, Badge, Zoom, Grow, LinearProgress, Tab, Tabs
} from '@mui/material';
import { DatePicker, StaticDatePicker } from '@mui/x-date-pickers';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewListIcon from '@mui/icons-material/ViewList';
import TodayIcon from '@mui/icons-material/Today';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ClearIcon from '@mui/icons-material/Clear';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotesIcon from '@mui/icons-material/Notes';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TimelineIcon from '@mui/icons-material/Timeline';
import GridViewIcon from '@mui/icons-material/GridView';
import BarChartIcon from '@mui/icons-material/BarChart';
import BusinessIcon from '@mui/icons-material/Business';
import BlockIcon from '@mui/icons-material/Block';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

import { getEmployees, getLeaves, type EmployeeWithStats, type Leave } from '../../api/employees';
import { getLeavePolicy, type LeavePolicy, type CompanyShutdown, type BlackoutPeriod } from '../../api/leavePolicy';
import useNotistack from '../orders/hooks/useNotistack';

dayjs.locale('ro');
dayjs.extend(relativeTime);
dayjs.extend(isBetween);

/* ---------- Romanian National Holidays ---------- */
const getRomanianHolidays = (year: number): Array<{ date: string; name: string }> => {
  const holidays: Array<{ date: string; name: string }> = [
    { date: `${year}-01-01`, name: 'Anul Nou' },
    { date: `${year}-01-02`, name: 'Anul Nou (zi 2)' },
    { date: `${year}-01-06`, name: 'Boboteaza' },
    { date: `${year}-01-07`, name: 'Sf. Ioan Botezătorul' },
    { date: `${year}-01-24`, name: 'Ziua Unirii' },
    { date: `${year}-05-01`, name: 'Ziua Muncii' },
    { date: `${year}-06-01`, name: 'Ziua Copilului' },
    { date: `${year}-08-15`, name: 'Adormirea Maicii Domnului' },
    { date: `${year}-11-30`, name: 'Sfântul Andrei' },
    { date: `${year}-12-01`, name: 'Ziua Națională' },
    { date: `${year}-12-25`, name: 'Crăciun' },
    { date: `${year}-12-26`, name: 'Crăciun (zi 2)' },
  ];
  
  // Easter calculation (Orthodox)
  const getOrthodoxEaster = (y: number) => {
    const a = y % 4;
    const b = y % 7;
    const c = y % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    // Julian to Gregorian (add 13 days for 2000-2099)
    return dayjs(`${y}-${month}-${day}`).add(13, 'day');
  };
  
  const easter = getOrthodoxEaster(year);
  holidays.push({ date: easter.subtract(2, 'day').format('YYYY-MM-DD'), name: 'Vinerea Mare' }); // Good Friday
  holidays.push({ date: easter.subtract(1, 'day').format('YYYY-MM-DD'), name: 'Sâmbăta Mare' }); // Holy Saturday
  holidays.push({ date: easter.format('YYYY-MM-DD'), name: 'Paște' });
  holidays.push({ date: easter.add(1, 'day').format('YYYY-MM-DD'), name: 'Paște (zi 2)' });
  holidays.push({ date: easter.add(49, 'day').format('YYYY-MM-DD'), name: 'Rusalii' });
  holidays.push({ date: easter.add(50, 'day').format('YYYY-MM-DD'), name: 'Rusalii (zi 2)' });
  
  return holidays;
};

/* ---------- helpers ---------- */

const iso = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

const isWeekend = (d: dayjs.Dayjs) => {
  const dow = d.day();
  return dow === 0 || dow === 6;
};

const splitIntoWeekdaySegments = (startISO: string, businessDays: number) => {
  const segments: Array<{ start: string; end: string }> = [];
  if (!businessDays || businessDays <= 0) return segments;

  let cursor = dayjs(startISO).startOf('day');
  while (isWeekend(cursor)) cursor = cursor.add(1, 'day');

  let remaining = businessDays;
  while (remaining > 0) {
    const dow = cursor.day();
    const weekdaysLeftInWeek = Math.max(1, 5 - (dow === 0 ? 7 : dow) + 1);
    const take = Math.min(remaining, weekdaysLeftInWeek);

    const segStart = cursor;
    const segEndExclusive = cursor.add(take, 'day');
    segments.push({ start: iso(segStart), end: iso(segEndExclusive) });

    remaining -= take;
    cursor = segEndExclusive;

    if (cursor.day() === 6) cursor = cursor.add(2, 'day');
    if (cursor.day() === 0) cursor = cursor.add(1, 'day');
  }

  return segments;
};

const EMPLOYEE_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#16a34a', '#0891b2', '#4f46e5', '#c026d3', '#059669',
  '#d97706', '#6366f1', '#0d9488', '#e11d48', '#8b5cf6'
];

const colorFromString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return EMPLOYEE_COLORS[h % EMPLOYEE_COLORS.length];
};

const getInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const LS_SELECTED = 'holidayCalendar.selectedEmployeeIds';
const LS_THRESHOLD = 'holidayCalendar.maxOffAllowed';
const LS_LEGEND_COLLAPSED = 'holidayCalendar.legendCollapsed';
const LS_SHOW_HOLIDAYS = 'holidayCalendar.showHolidays';

type ViewType = 'dayGridMonth' | 'dayGridWeek' | 'listMonth';
type MainView = 'calendar' | 'timeline' | 'heatmap' | 'stats';

interface LeaveDetail {
  id: string;
  employee: string;
  employeeId: string;
  color: string;
  start: string;
  end: string;
  days: number;
  note?: string;
}

interface EmployeeLeaveBalance {
  id: string;
  name: string;
  color: string;
  accrued: number;
  carriedOver: number;
  taken: number;
  remaining: number;
}

/* ---------- Mini Calendar Day Component ---------- */
function MiniCalendarDay(props: PickersDayProps<dayjs.Dayjs> & { 
  leaveDays: Set<string>;
  holidayDays: Set<string>;
  shutdownDays: Set<string>;
}) {
  const { day, leaveDays, holidayDays, shutdownDays, outsideCurrentMonth, ...other } = props;
  const dateStr = day.format('YYYY-MM-DD');
  const hasLeave = leaveDays.has(dateStr);
  const isHoliday = holidayDays.has(dateStr);
  const isShutdown = shutdownDays.has(dateStr);
  
  return (
    <PickersDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      sx={{
        position: 'relative',
        ...(isHoliday && !outsideCurrentMonth && {
          bgcolor: alpha('#ef4444', 0.15),
          color: '#dc2626',
          fontWeight: 600,
          '&:hover': { bgcolor: alpha('#ef4444', 0.25) }
        }),
        ...(isShutdown && !outsideCurrentMonth && {
          bgcolor: alpha('#f59e0b', 0.15),
          '&:hover': { bgcolor: alpha('#f59e0b', 0.25) }
        }),
        ...(hasLeave && !outsideCurrentMonth && {
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'primary.main'
          }
        }),
      }}
    />
  );
}

/* ---------- Timeline Component ---------- */
function TimelineView({ 
  employees, 
  allLeaveDetails,
  selected,
  year,
  month,
  onEventClick 
}: { 
  employees: EmployeeWithStats[];
  allLeaveDetails: LeaveDetail[];
  selected: string[];
  year: number;
  month: number;
  onEventClick: (detail: LeaveDetail) => void;
}) {
  const theme = useTheme();
  const monthStart = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const daysInMonth = monthStart.daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => monthStart.add(i, 'day'));
  
  const filteredEmployees = employees.filter(e => selected.includes(e.id));
  const cellWidth = 32;
  const nameColWidth = 180;
  
  // Get holidays for this month
  const holidays = getRomanianHolidays(year);
  const holidaySet = new Set(holidays.map(h => h.date));
  
  return (
    <Box sx={{ 
      overflow: 'auto', 
      flex: 1, 
      p: 1.5,
      '&::-webkit-scrollbar': { height: 8, width: 8 },
      '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.text.primary, 0.15), borderRadius: 4 },
      '&::-webkit-scrollbar-track': { bgcolor: alpha(theme.palette.divider, 0.05) }
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          minWidth: nameColWidth + (cellWidth * daysInMonth) + 20, 
          borderRadius: 2, 
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: 'hidden'
        }}
      >
        {/* Header Row - Days */}
        <Stack 
          direction="row" 
          sx={{ 
            position: 'sticky', 
            top: 0, 
            bgcolor: alpha(theme.palette.primary.main, 0.03), 
            zIndex: 2,
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Box sx={{ 
            width: nameColWidth, 
            flexShrink: 0, 
            p: 1.5, 
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.5}>
              ANGAJAT ({filteredEmployees.length})
            </Typography>
          </Box>
          {days.map(day => {
            const isWknd = isWeekend(day);
            const isToday = day.isSame(dayjs(), 'day');
            const isHoliday = holidaySet.has(day.format('YYYY-MM-DD'));
            const dayOfWeek = day.format('dd')[0].toUpperCase();
            
            return (
              <Box
                key={day.format('DD')}
                sx={{
                  width: cellWidth,
                  flexShrink: 0,
                  py: 0.75,
                  textAlign: 'center',
                  bgcolor: isToday 
                    ? alpha(theme.palette.primary.main, 0.2) 
                    : isHoliday 
                      ? alpha('#ef4444', 0.15)
                      : isWknd 
                        ? alpha(theme.palette.action.hover, 0.5) 
                        : 'transparent',
                  borderRight: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  borderBottom: isToday ? `2px solid ${theme.palette.primary.main}` : 'none',
                  position: 'relative'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: 9, 
                    display: 'block', 
                    color: isWknd || isHoliday ? 'text.disabled' : 'text.secondary',
                    fontWeight: 500
                  }}
                >
                  {dayOfWeek}
                </Typography>
                <Typography 
                  variant="caption" 
                  fontWeight={isToday ? 700 : 500} 
                  color={isToday ? 'primary.main' : isHoliday ? 'error.main' : 'text.primary'}
                  sx={{ fontSize: 12 }}
                >
                  {day.format('D')}
                </Typography>
              </Box>
            );
          })}
        </Stack>
        
        {/* Employee Rows */}
        {filteredEmployees.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Selectați angajați pentru a vedea timeline-ul</Typography>
          </Box>
        ) : (
          filteredEmployees.map((emp, empIdx) => {
            const color = colorFromString(emp.id);
            const empLeaves = allLeaveDetails.filter(l => l.employeeId === emp.id);
            
            // Calculate leave bars for this employee
            const leaveBars: Array<{ start: number; width: number; leave: LeaveDetail; color: string }> = [];
            empLeaves.forEach(leave => {
              const leaveStart = dayjs(leave.start);
              const leaveEnd = dayjs(leave.start).add(leave.days - 1, 'day');
              
              // Check if leave overlaps with this month
              if (leaveEnd.isBefore(monthStart) || leaveStart.isAfter(monthStart.endOf('month'))) return;
              
              const startDay = leaveStart.isBefore(monthStart) ? 1 : leaveStart.date();
              const endDay = leaveEnd.isAfter(monthStart.endOf('month')) ? daysInMonth : leaveEnd.date();
              const width = endDay - startDay + 1;
              
              leaveBars.push({
                start: startDay - 1,
                width,
                leave,
                color
              });
            });
            
            return (
              <Stack
                key={emp.id}
                direction="row"
                sx={{
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                  bgcolor: empIdx % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.02),
                  '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.06) },
                  position: 'relative'
                }}
              >
                {/* Employee name column */}
                <Box sx={{ 
                  width: nameColWidth, 
                  flexShrink: 0, 
                  p: 1, 
                  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  position: 'sticky',
                  left: 0,
                  bgcolor: empIdx % 2 === 0 ? 'background.paper' : alpha(theme.palette.action.hover, 0.02),
                  zIndex: 1
                }}>
                  <Avatar 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      fontSize: 11, 
                      bgcolor: color,
                      fontWeight: 600,
                      boxShadow: `0 2px 4px ${alpha(color, 0.4)}`
                    }}
                  >
                    {getInitials(emp.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} noWrap sx={{ lineHeight: 1.2 }}>
                      {emp.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {empLeaves.length} concedii
                    </Typography>
                  </Box>
                </Box>
                
                {/* Days grid with leave bars */}
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {/* Background day cells */}
                  {days.map(day => {
                    const dateStr = day.format('YYYY-MM-DD');
                    const isWknd = isWeekend(day);
                    const isToday = day.isSame(dayjs(), 'day');
                    const isHoliday = holidaySet.has(dateStr);
                    
                    return (
                      <Box
                        key={dateStr}
                        sx={{
                          width: cellWidth,
                          height: 40,
                          flexShrink: 0,
                          bgcolor: isToday 
                            ? alpha(theme.palette.primary.main, 0.08)
                            : isHoliday
                              ? alpha('#ef4444', 0.08)
                              : isWknd 
                                ? alpha(theme.palette.action.hover, 0.2) 
                                : 'transparent',
                          borderRight: `1px solid ${alpha(theme.palette.divider, 0.03)}`,
                        }}
                      />
                    );
                  })}
                  
                  {/* Leave bars overlay */}
                  {leaveBars.map((bar, idx) => (
                    <Tooltip
                      key={idx}
                      title={
                        <Box>
                          <Typography variant="caption" fontWeight={600}>{emp.name}</Typography>
                          <Typography variant="caption" display="block">
                            {dayjs(bar.leave.start).format('D MMM')} - {dayjs(bar.leave.start).add(bar.leave.days - 1, 'day').format('D MMM YYYY')}
                          </Typography>
                          <Typography variant="caption" display="block">{bar.leave.days} zile</Typography>
                          {bar.leave.note && <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>{bar.leave.note}</Typography>}
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        onClick={() => onEventClick(bar.leave)}
                        sx={{
                          position: 'absolute',
                          left: bar.start * cellWidth + 2,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: bar.width * cellWidth - 4,
                          height: 28,
                          bgcolor: bar.color,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: `0 2px 6px ${alpha(bar.color, 0.4)}`,
                          transition: 'all 0.15s ease',
                          '&:hover': { 
                            transform: 'translateY(-50%) scale(1.02)',
                            boxShadow: `0 4px 12px ${alpha(bar.color, 0.5)}`,
                            zIndex: 10
                          }
                        }}
                      >
                        {bar.width >= 3 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'white', 
                              fontWeight: 600, 
                              fontSize: 10,
                              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              px: 0.5,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {bar.leave.days}z
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Stack>
            );
          })
        )}
      </Paper>
      
      {/* Legend */}
      <Stack direction="row" spacing={3} sx={{ mt: 2, px: 1 }} alignItems="center">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.2), border: `2px solid ${theme.palette.primary.main}` }} />
          <Typography variant="caption" color="text.secondary">Astăzi</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: alpha(theme.palette.action.hover, 0.5) }} />
          <Typography variant="caption" color="text.secondary">Weekend</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: alpha('#ef4444', 0.15) }} />
          <Typography variant="caption" color="text.secondary">Sărbătoare</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 24, height: 16, borderRadius: 1, bgcolor: '#8b5cf6', boxShadow: `0 2px 4px ${alpha('#8b5cf6', 0.4)}` }} />
          <Typography variant="caption" color="text.secondary">Concediu</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ---------- Heatmap/Year View Component ---------- */
function HeatmapView({ 
  offCountMap, 
  year, 
  maxOffAllowed,
  holidays,
  shutdowns,
  onDateClick
}: { 
  offCountMap: Map<string, number>;
  year: number;
  maxOffAllowed: number;
  holidays: Array<{ date: string; name: string }>;
  shutdowns: CompanyShutdown[];
  onDateClick: (date: dayjs.Dayjs) => void;
}) {
  const theme = useTheme();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const holidaySet = new Set(holidays.map(h => h.date));
  const shutdownDates = new Set<string>();
  shutdowns.forEach(s => {
    let d = dayjs(s.startDate);
    const end = dayjs(s.endDate);
    while (d.isSameOrBefore(end)) {
      shutdownDates.add(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }
  });
  
  const getColor = (count: number) => {
    if (count === 0) return alpha(theme.palette.action.hover, 0.3);
    if (count <= maxOffAllowed * 0.5) return alpha('#22c55e', 0.4);
    if (count <= maxOffAllowed) return alpha('#eab308', 0.5);
    return alpha('#ef4444', 0.6);
  };
  
  return (
    <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        {months.map(monthIdx => {
          const monthStart = dayjs(`${year}-${String(monthIdx + 1).padStart(2, '0')}-01`);
          const daysInMonth = monthStart.daysInMonth();
          const firstDayOfWeek = monthStart.day(); // 0 = Sunday
          const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
          
          const cells: Array<{ date: dayjs.Dayjs | null; count: number }> = [];
          // Add empty cells for offset
          for (let i = 0; i < offset; i++) cells.push({ date: null, count: 0 });
          // Add day cells
          for (let d = 1; d <= daysInMonth; d++) {
            const date = monthStart.date(d);
            const key = date.format('YYYY-MM-DD');
            cells.push({ date, count: offCountMap.get(key) || 0 });
          }
          
          return (
            <Box key={monthIdx} sx={{ minWidth: 180 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, textTransform: 'capitalize' }}>
                {monthStart.format('MMMM')}
              </Typography>
              <Stack direction="row" spacing={0.25} sx={{ mb: 0.5 }}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <Box key={i} sx={{ width: 20, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>{d}</Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 20px)', gap: 0.25 }}>
                {cells.map((cell, i) => {
                  if (!cell.date) return <Box key={i} sx={{ width: 20, height: 20 }} />;
                  const dateStr = cell.date.format('YYYY-MM-DD');
                  const isHoliday = holidaySet.has(dateStr);
                  const isShutdown = shutdownDates.has(dateStr);
                  const isWknd = isWeekend(cell.date);
                  const isToday = cell.date.isSame(dayjs(), 'day');
                  
                  return (
                    <Tooltip
                      key={i}
                      title={
                        <Box>
                          <Typography variant="caption">{cell.date.format('D MMMM YYYY')}</Typography>
                          {cell.count > 0 && <Typography variant="caption" display="block">{cell.count} concedii</Typography>}
                          {isHoliday && <Typography variant="caption" display="block" color="error.light">🎉 Sărbătoare</Typography>}
                          {isShutdown && <Typography variant="caption" display="block" color="warning.light">🏢 Închidere</Typography>}
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        onClick={() => onDateClick(cell.date!)}
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 0.5,
                          bgcolor: isHoliday ? alpha('#ef4444', 0.4) : isShutdown ? alpha('#f59e0b', 0.4) : getColor(cell.count),
                          border: isToday ? `2px solid ${theme.palette.primary.main}` : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isWknd && !isHoliday ? 0.4 : 1,
                          transition: 'transform 0.1s',
                          '&:hover': { transform: 'scale(1.2)', zIndex: 1 }
                        }}
                      >
                        <Typography sx={{ fontSize: 8, fontWeight: cell.count > 0 ? 600 : 400, color: cell.count > maxOffAllowed ? '#fff' : 'text.secondary' }}>
                          {cell.date.date()}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Stack>
      
      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha('#22c55e', 0.4) }} />
          <Typography variant="caption">0-{Math.floor(maxOffAllowed * 0.5)} off</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha('#eab308', 0.5) }} />
          <Typography variant="caption">{Math.floor(maxOffAllowed * 0.5) + 1}-{maxOffAllowed} off</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha('#ef4444', 0.6) }} />
          <Typography variant="caption">&gt;{maxOffAllowed} off (peste limită)</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha('#ef4444', 0.4) }} />
          <Typography variant="caption">🎉 Sărbătoare</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha('#f59e0b', 0.4) }} />
          <Typography variant="caption">🏢 Închidere</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ---------- Statistics Component ---------- */
function StatsView({ 
  employees, 
  allLeaveDetails,
  selected,
  viewStart,
  viewEnd,
  balances
}: { 
  employees: EmployeeWithStats[];
  allLeaveDetails: LeaveDetail[];
  selected: string[];
  viewStart: Date | null;
  viewEnd: Date | null;
  balances: EmployeeLeaveBalance[];
}) {
  const theme = useTheme();
  
  const monthlyStats = useMemo(() => {
    const selectedSet = new Set(selected);
    const leaves = allLeaveDetails.filter(l => selectedSet.has(l.employeeId));
    
    // Group by month
    const byMonth = new Map<string, number>();
    leaves.forEach(l => {
      const month = dayjs(l.start).format('YYYY-MM');
      byMonth.set(month, (byMonth.get(month) || 0) + l.days);
    });
    
    // Last 12 months
    const months: Array<{ month: string; label: string; days: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const key = m.format('YYYY-MM');
      months.push({
        month: key,
        label: m.format('MMM'),
        days: byMonth.get(key) || 0
      });
    }
    return months;
  }, [allLeaveDetails, selected]);
  
  const maxDays = Math.max(...monthlyStats.map(m => m.days), 1);
  
  // Top employees by days taken
  const topEmployees = useMemo(() => {
    const selectedSet = new Set(selected);
    const byEmployee = new Map<string, { name: string; days: number; color: string }>();
    allLeaveDetails
      .filter(l => selectedSet.has(l.employeeId))
      .forEach(l => {
        const existing = byEmployee.get(l.employeeId);
        if (existing) {
          existing.days += l.days;
        } else {
          byEmployee.set(l.employeeId, { name: l.employee, days: l.days, color: l.color });
        }
      });
    return Array.from(byEmployee.values()).sort((a, b) => b.days - a.days).slice(0, 10);
  }, [allLeaveDetails, selected]);
  
  const maxEmpDays = Math.max(...topEmployees.map(e => e.days), 1);
  
  return (
    <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        {/* Monthly Bar Chart */}
        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <BarChartIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>Zile concediu pe lună</Typography>
            </Stack>
            <Stack spacing={1}>
              {monthlyStats.map(m => (
                <Stack key={m.month} direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ width: 36, textAlign: 'right', textTransform: 'capitalize' }}>{m.label}</Typography>
                  <Box sx={{ flex: 1, height: 20, bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 1, overflow: 'hidden' }}>
                    <Box 
                      sx={{ 
                        width: `${(m.days / maxDays) * 100}%`, 
                        height: '100%', 
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" fontWeight={600} sx={{ width: 30 }}>{m.days}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
        
        {/* Top Employees */}
        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <GroupIcon color="secondary" />
              <Typography variant="subtitle1" fontWeight={600}>Top angajați (zile concediu)</Typography>
            </Stack>
            <Stack spacing={1}>
              {topEmployees.map((emp, idx) => (
                <Stack key={emp.name} direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ width: 20, textAlign: 'center', fontWeight: 600 }}>#{idx + 1}</Typography>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: emp.color }}>{getInitials(emp.name)}</Avatar>
                  <Typography variant="caption" sx={{ width: 120 }} noWrap>{emp.name}</Typography>
                  <Box sx={{ flex: 1, height: 16, bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 1, overflow: 'hidden' }}>
                    <Box 
                      sx={{ 
                        width: `${(emp.days / maxEmpDays) * 100}%`, 
                        height: '100%', 
                        bgcolor: emp.color,
                        borderRadius: 1
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" fontWeight={600} sx={{ width: 30 }}>{emp.days}z</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
      
      {/* Leave Balances Table */}
      <Card elevation={0} sx={{ mt: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <DateRangeIcon color="info" />
            <Typography variant="subtitle1" fontWeight={600}>Solduri concedii</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5 }}>
            {balances.filter(b => selected.includes(b.id)).map(b => (
              <Paper 
                key={b.id}
                elevation={0}
                sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: b.color }}>{getInitials(b.name)}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{b.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Typography variant="caption" color="success.main">+{b.accrued + b.carriedOver}</Typography>
                    <Typography variant="caption" color="error.main">-{b.taken}</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main">={b.remaining}</Typography>
                  </Stack>
                </Box>
                <Chip 
                  label={`${b.remaining}z`} 
                  size="small" 
                  color={b.remaining <= 0 ? 'error' : b.remaining <= 5 ? 'warning' : 'success'}
                  sx={{ fontWeight: 700 }}
                />
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

/* ---------- Main Component ---------- */
export default function HolidayCalendarPage() {
  const theme = useTheme();
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [allEvents, setAllEvents] = useState<EventInput[]>([]);
  const [allLeaveDetails, setAllLeaveDetails] = useState<LeaveDetail[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth');
  const [mainView, setMainView] = useState<MainView>('calendar');
  const [legendCollapsed, setLegendCollapsed] = useState(() => localStorage.getItem(LS_LEGEND_COLLAPSED) === 'true');
  const [showHolidays, setShowHolidays] = useState(() => localStorage.getItem(LS_SHOW_HOLIDAYS) !== 'false');
  const { errorNotistack, successNotistack, infoNotistack } = useNotistack();
  const calendarRef = useRef<FullCalendar | null>(null);

  // Leave policy data
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy | null>(null);
  const [companyShutdowns, setCompanyShutdowns] = useState<CompanyShutdown[]>([]);
  const [blackoutPeriods, setBlackoutPeriods] = useState<BlackoutPeriod[]>([]);

  // Event detail dialog
  const [selectedEvent, setSelectedEvent] = useState<LeaveDetail | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  // Keyboard shortcuts popover
  const [shortcutsAnchor, setShortcutsAnchor] = useState<HTMLElement | null>(null);

  // Mini calendar popover
  const [miniCalAnchor, setMiniCalAnchor] = useState<HTMLElement | null>(null);

  // current view range
  const [viewStart, setViewStart] = useState<Date | null>(null);
  const [viewEnd, setViewEnd] = useState<Date | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentMonth, setCurrentMonth] = useState(dayjs().month() + 1);

  // capacity threshold
  const [maxOffAllowed, setMaxOffAllowed] = useState<number>(() => {
    const raw = Number(localStorage.getItem(LS_THRESHOLD) || '0');
    return Number.isFinite(raw) && raw > 0 ? raw : 2;
  });

  // National holidays
  const nationalHolidays = useMemo(() => {
    const thisYear = getRomanianHolidays(currentYear);
    const nextYear = getRomanianHolidays(currentYear + 1);
    const prevYear = getRomanianHolidays(currentYear - 1);
    return [...prevYear, ...thisYear, ...nextYear];
  }, [currentYear]);

  // Persist settings
  useEffect(() => { localStorage.setItem(LS_LEGEND_COLLAPSED, String(legendCollapsed)); }, [legendCollapsed]);
  useEffect(() => { localStorage.setItem(LS_SHOW_HOLIDAYS, String(showHolidays)); }, [showHolidays]);
  useEffect(() => { localStorage.setItem(LS_THRESHOLD, String(maxOffAllowed)); }, [maxOffAllowed]);

  // restore/persist selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SELECTED);
      if (raw) setSelected(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_SELECTED, JSON.stringify(selected)); } catch {}
  }, [selected]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 't': gotoToday(); break;
        case 'm': changeView('dayGridMonth'); break;
        case 'w': changeView('dayGridWeek'); break;
        case 'l': changeView('listMonth'); break;
        case 'a':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); selectAll(); }
          break;
        case 'arrowleft': calendarRef.current?.getApi().prev(); break;
        case 'arrowright': calendarRef.current?.getApi().next(); break;
        case 'escape': setEventDialogOpen(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = stripDiacritics(query.toLowerCase());
    return employees.filter(e => stripDiacritics(e.name.toLowerCase()).includes(q));
  }, [employees, query]);

  const legend = useMemo(
    () => employees.map(e => ({ id: e.id, name: e.name, color: colorFromString(e.id) })),
    [employees]
  );

  // Leave balances
  const leaveBalances = useMemo<EmployeeLeaveBalance[]>(() => {
    return employees.map(e => {
      const lb = e.leaveBalance;
      const accrued = lb?.accrued ?? e.entitledDays ?? 0;
      const carriedOver = lb?.carriedOver ?? 0;
      const taken = lb ? (lb.voluntaryDays + lb.companyShutdownDays) : (e.takenDays ?? 0);
      const remaining = Math.max(0, accrued + carriedOver - taken);
      return {
        id: e.id,
        name: e.name,
        color: colorFromString(e.id),
        accrued,
        carriedOver,
        taken,
        remaining
      };
    });
  }, [employees]);

  const filteredEvents = useMemo(() => {
    if (selected.length === 0) return [];
    const selectedSet = new Set(selected);
    return allEvents.filter(ev => selectedSet.has((ev.extendedProps as any)?.employeeId));
  }, [allEvents, selected]);

  // Holiday events for calendar
  const holidayEvents = useMemo<EventInput[]>(() => {
    if (!showHolidays) return [];
    const events: EventInput[] = [];
    
    // National holidays
    nationalHolidays.forEach(h => {
      events.push({
        id: `holiday-${h.date}`,
        title: `🎉 ${h.name}`,
        start: h.date,
        end: dayjs(h.date).add(1, 'day').format('YYYY-MM-DD'),
        display: 'background',
        backgroundColor: alpha('#ef4444', 0.35),
        classNames: ['holiday-bg']
      });
    });
    
    // Company shutdowns
    companyShutdowns.forEach(s => {
      events.push({
        id: `shutdown-${s.id}`,
        title: `🏢 ${s.reason}`,
        start: s.startDate,
        end: dayjs(s.endDate).add(1, 'day').format('YYYY-MM-DD'),
        display: 'background',
        backgroundColor: alpha('#f59e0b', 0.35),
        classNames: ['shutdown-bg']
      });
    });
    
    return events;
  }, [showHolidays, nationalHolidays, companyShutdowns]);

  const visibleEvents = useMemo(() => {
    if (!viewStart || !viewEnd) return filteredEvents;
    const start = viewStart.getTime();
    const end = viewEnd.getTime();
    return filteredEvents.filter(ev => {
      const evStart = ev.start ? new Date(ev.start as string).getTime() : 0;
      const evEnd = ev.end ? new Date(ev.end as string).getTime() : evStart;
      return evStart < end && evEnd > start;
    });
  }, [filteredEvents, viewStart, viewEnd]);

  // Sets for mini calendar
  const leaveDaysSet = useMemo(() => {
    const set = new Set<string>();
    filteredEvents.forEach(ev => {
      let d = dayjs(ev.start as string);
      const end = dayjs(ev.end as string);
      while (d.isBefore(end)) {
        set.add(d.format('YYYY-MM-DD'));
        d = d.add(1, 'day');
      }
    });
    return set;
  }, [filteredEvents]);

  const holidayDaysSet = useMemo(() => new Set(nationalHolidays.map(h => h.date)), [nationalHolidays]);
  
  // Map for holiday tooltips
  const holidayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    nationalHolidays.forEach(h => map.set(h.date, h.name));
    companyShutdowns.forEach(s => {
      let d = dayjs(s.startDate);
      const end = dayjs(s.endDate);
      while (d.isSameOrBefore(end)) {
        map.set(d.format('YYYY-MM-DD'), `🏢 ${s.reason}`);
        d = d.add(1, 'day');
      }
    });
    return map;
  }, [nationalHolidays, companyShutdowns]);
  
  const shutdownDaysSet = useMemo(() => {
    const set = new Set<string>();
    companyShutdowns.forEach(s => {
      let d = dayjs(s.startDate);
      const end = dayjs(s.endDate);
      while (d.isSameOrBefore(end)) {
        set.add(d.format('YYYY-MM-DD'));
        d = d.add(1, 'day');
      }
    });
    return set;
  }, [companyShutdowns]);

  const offCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of filteredEvents) {
      const start = dayjs(ev.start as string);
      const endEx = dayjs(ev.end as string);
      for (let d = start; d.isBefore(endEx); d = d.add(1, 'day')) {
        const key = d.format('YYYY-MM-DD');
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [filteredEvents]);

  const toggleEmployee = (id: string, only = false) =>
    setSelected(prev => (only ? [id] : (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])));

  const selectAll = () => {
    setSelected(employees.map(e => e.id));
    successNotistack(`Toți cei ${employees.length} angajați au fost selectați`);
  };
  const clearAll = () => {
    setSelected([]);
    successNotistack('Selecția a fost golită');
  };
  const invert = () => {
    const set = new Set(selected);
    const newSelection = employees.map(e => e.id).filter(id => !set.has(id));
    setSelected(newSelection);
    successNotistack(`Selecție inversată: ${newSelection.length} angajați`);
  };

  const onDatesSet = (arg: DatesSetArg) => {
    setViewStart(arg.start);
    setViewEnd(arg.end);
    setCurrentTitle(arg.view.title);
    setCurrentYear(dayjs(arg.start).year());
    setCurrentMonth(dayjs(arg.start).month() + 1);
  };

  const firstLoadRef = useRef(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load leave policy for shutdowns
      try {
        const policy = await getLeavePolicy();
        setLeavePolicy(policy);
        setCompanyShutdowns(policy.companyShutdowns || []);
        setBlackoutPeriods(policy.blackoutPeriods || []);
      } catch {}

      const emps = await getEmployees();
      setEmployees(emps);
      if (firstLoadRef.current && !selected.length) {
        setSelected(emps.map(e => e.id));
        firstLoadRef.current = false;
      }

      const leavesPerEmp = await Promise.all(
        emps.map(async e => {
          const leaves: Leave[] = await getLeaves(e.id);
          const color = colorFromString(e.id);

          const eventsForEmp: EventInput[] = [];
          const detailsForEmp: LeaveDetail[] = [];
          
          for (const lv of leaves) {
            detailsForEmp.push({
              id: lv.id,
              employee: e.name,
              employeeId: e.id,
              color,
              start: lv.startDate,
              end: dayjs(lv.startDate).add(lv.days || 1, 'day').format('YYYY-MM-DD'),
              days: lv.days || 0,
              note: lv.note ?? undefined,
            });
            
            const segments = splitIntoWeekdaySegments(lv.startDate, lv.days || 0);
            for (const seg of segments) {
              eventsForEmp.push({
                id: `${lv.id}__${seg.start}`,
                title: e.name,
                start: seg.start,
                end: seg.end,
                display: 'block',
                backgroundColor: color,
                borderColor: color,
                classNames: ['vacation-pill'],
                extendedProps: { 
                  note: lv.note, 
                  employee: e.name, 
                  employeeId: e.id,
                  leaveId: lv.id,
                  days: lv.days,
                  color
                },
              } as EventInput);
            }
          }
          return { events: eventsForEmp, details: detailsForEmp };
        })
      );

      setAllEvents(leavesPerEmp.flatMap(x => x.events));
      setAllLeaveDetails(leavesPerEmp.flatMap(x => x.details));
      if (!emps.length) successNotistack('Nu există angajați/învoiri de afișat.');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut încărca calendarul concediilor';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack, successNotistack, selected.length]);

  useEffect(() => { void load(); }, [load]);

  const gotoToday = () => {
    if (mainView === 'calendar') {
      calendarRef.current?.getApi().today();
    } else {
      setCurrentYear(dayjs().year());
      setCurrentMonth(dayjs().month() + 1);
    }
  };
  const changeView = (view: ViewType) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
  };
  const gotoDate = (d: dayjs.Dayjs | null) => {
    if (d && d.isValid()) {
      calendarRef.current?.getApi().gotoDate(d.toDate());
      setCurrentYear(d.year());
      setCurrentMonth(d.month() + 1);
      setMiniCalAnchor(null);
    }
  };
  const gotoPrev = () => {
    if (mainView === 'calendar') {
      calendarRef.current?.getApi().prev();
    } else if (mainView === 'timeline') {
      // Go to previous month
      const newDate = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`).subtract(1, 'month');
      setCurrentYear(newDate.year());
      setCurrentMonth(newDate.month() + 1);
    } else if (mainView === 'heatmap' || mainView === 'stats') {
      // Go to previous year
      setCurrentYear(currentYear - 1);
    }
  };
  const gotoNext = () => {
    if (mainView === 'calendar') {
      calendarRef.current?.getApi().next();
    } else if (mainView === 'timeline') {
      // Go to next month
      const newDate = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`).add(1, 'month');
      setCurrentYear(newDate.year());
      setCurrentMonth(newDate.month() + 1);
    } else if (mainView === 'heatmap' || mainView === 'stats') {
      // Go to next year
      setCurrentYear(currentYear + 1);
    }
  };

  const handleEventClick = (arg: EventClickArg) => {
    const props = arg.event.extendedProps;
    const detail = allLeaveDetails.find(l => l.id === props.leaveId);
    if (detail) {
      setSelectedEvent(detail);
      setEventDialogOpen(true);
    }
  };

  const stats = useMemo(() => {
    const uniqueEmployees = new Set(visibleEvents.map(ev => (ev.extendedProps as any)?.employeeId));
    let overCapDays = 0;
    offCountMap.forEach((count) => { if (count > maxOffAllowed) overCapDays++; });
    let totalDays = 0;
    visibleEvents.forEach(ev => {
      const start = dayjs(ev.start as string);
      const end = dayjs(ev.end as string);
      totalDays += end.diff(start, 'day');
    });
    return { totalEvents: visibleEvents.length, uniqueEmployees: uniqueEmployees.size, overCapDays, totalDays };
  }, [visibleEvents, offCountMap, maxOffAllowed]);

  const exportCSV = () => {
    if (!visibleEvents.length) {
      errorNotistack('Nu există date de exportat');
      return;
    }
    const headers = ['Angajat', 'Start', 'Sfarsit', 'Zile', 'Nota'];
    const rows = visibleEvents.map((ev) => {
      const start = dayjs(ev.start as string);
      const endEx = dayjs(ev.end as string);
      const days = Math.max(1, endEx.diff(start, 'day'));
      const name = (ev.extendedProps as any)?.employee || ev.title || '';
      const note = (ev.extendedProps as any)?.note || '';
      return [
        `"${name.replace(/"/g, '""')}"`,
        start.format('YYYY-MM-DD'),
        endEx.subtract(1, 'day').format('YYYY-MM-DD'),
        String(days),
        `"${String(note).replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concedii_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    successNotistack(`Export CSV finalizat: ${visibleEvents.length} înregistrări`);
  };

  const exportPDF = () => {
    // Create printable HTML and open in new window
    const style = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1976d2; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header { margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin: 10px 0; }
        .stat { padding: 10px 20px; background: #e3f2fd; border-radius: 8px; }
        @media print { body { padding: 0; } }
      </style>
    `;
    
    const tableRows = visibleEvents.map(ev => {
      const start = dayjs(ev.start as string);
      const endEx = dayjs(ev.end as string);
      const days = Math.max(1, endEx.diff(start, 'day'));
      const name = (ev.extendedProps as any)?.employee || ev.title || '';
      const note = (ev.extendedProps as any)?.note || '';
      return `<tr><td>${name}</td><td>${start.format('DD.MM.YYYY')}</td><td>${endEx.subtract(1, 'day').format('DD.MM.YYYY')}</td><td>${days}</td><td>${note}</td></tr>`;
    }).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Raport Concedii</title>${style}</head>
      <body>
        <div class="header">
          <h1>📅 Raport Concedii</h1>
          <p>Generat: ${dayjs().format('DD.MM.YYYY HH:mm')}</p>
          <p>Perioada: ${viewStart ? dayjs(viewStart).format('DD.MM.YYYY') : '-'} - ${viewEnd ? dayjs(viewEnd).format('DD.MM.YYYY') : '-'}</p>
        </div>
        <div class="stats">
          <div class="stat"><strong>${stats.totalEvents}</strong> concedii</div>
          <div class="stat"><strong>${stats.totalDays}</strong> zile totale</div>
          <div class="stat"><strong>${stats.uniqueEmployees}</strong> angajați</div>
        </div>
        <table>
          <thead><tr><th>Angajat</th><th>Start</th><th>Sfârșit</th><th>Zile</th><th>Notă</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      successNotistack('Raport PDF deschis pentru printare');
    } else {
      errorNotistack('Nu s-a putut deschide fereastra de printare');
    }
  };

  // Handler for maxOffAllowed changes with debounced notification
  const handleMaxOffChange = (value: number) => {
    const newValue = Math.max(1, value || 1);
    setMaxOffAllowed(newValue);
    successNotistack(`Limită maximă setată la ${newValue} angajați/zi`);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      bgcolor: alpha(theme.palette.primary.main, 0.02),
      overflow: 'hidden'
    }}>
      <Fade in={loading}>
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, height: 3 }} />
      </Fade>

      {/* Header Card */}
      <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, pb: 0 }}>
        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 2, 
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            overflow: 'visible'
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between">
              {/* Title */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Zoom in={!loading}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 40, height: 40 }}>
                    <BeachAccessIcon sx={{ fontSize: 22 }} />
                  </Avatar>
                </Zoom>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ letterSpacing: -0.3, lineHeight: 1.2 }}>
                    Calendar Concedii
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Planificare echipă • {dayjs().format('MMMM YYYY')}
                  </Typography>
                </Box>
              </Stack>

              {/* View Tabs */}
              <Tabs 
                value={mainView} 
                onChange={(_, v) => setMainView(v)}
                sx={{
                  minHeight: 32,
                  '& .MuiTab-root': { minHeight: 32, minWidth: 'auto', textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 },
                  '& .MuiTabs-indicator': { height: 2 }
                }}
              >
                <Tab icon={<CalendarMonthIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Calendar" value="calendar" />
                <Tab icon={<TimelineIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Timeline" value="timeline" />
                <Tab icon={<GridViewIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Heatmap" value="heatmap" />
                <Tab icon={<BarChartIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Statistici" value="stats" />
              </Tabs>

              {/* Stats Cards */}
              <Fade in={!loading}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Paper elevation={0} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.08), border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <GroupIcon sx={{ color: 'info.main', fontSize: 16 }} />
                    <Typography variant="caption" fontWeight={600} color="info.dark">{selected.length}/{employees.length}</Typography>
                  </Paper>
                  
                  <Paper elevation={0} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <EventIcon sx={{ color: 'success.main', fontSize: 16 }} />
                    <Typography variant="caption" fontWeight={600} color="success.dark">{stats.totalEvents} concedii</Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.08), border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <DateRangeIcon sx={{ color: 'secondary.main', fontSize: 16 }} />
                    <Typography variant="caption" fontWeight={600} color="secondary.dark">{stats.totalDays} zile</Typography>
                  </Paper>
                  
                  {stats.overCapDays > 0 && (
                    <Grow in>
                      <Paper elevation={0} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                        <Typography variant="caption" fontWeight={600} color="warning.dark">{stats.overCapDays} peste limită</Typography>
                      </Paper>
                    </Grow>
                  )}
                </Stack>
              </Fade>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1.5, p: { xs: 1, sm: 1.5, md: 2 }, pt: 1.5, minHeight: 0, overflow: 'hidden' }}>
        {/* Mini Calendar Sidebar */}
        <Card 
          elevation={0} 
          sx={{ 
            width: 280,
            flexShrink: 0,
            borderRadius: 2, 
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 0.5, flexShrink: 0 }}>
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={viewStart ? dayjs(viewStart) : dayjs()}
              onChange={gotoDate}
              slots={{
                day: (dayProps) => (
                  <MiniCalendarDay 
                    {...dayProps} 
                    leaveDays={leaveDaysSet}
                    holidayDays={holidayDaysSet}
                    shutdownDays={shutdownDaysSet}
                  />
                )
              }}
              slotProps={{
                actionBar: { actions: [] },
              }}
              sx={{
                width: '100%',
                '& .MuiPickersLayout-root': { minWidth: 0, width: '100%' },
                '& .MuiPickersCalendarHeader-root': { px: 0.5, mt: 0, mb: 0 },
                '& .MuiPickersCalendarHeader-label': { fontSize: 13 },
                '& .MuiDayCalendar-header': { justifyContent: 'space-between', px: 0.5 },
                '& .MuiDayCalendar-weekDayLabel': { fontSize: 10, width: 36, height: 24, margin: 0 },
                '& .MuiPickersDay-root': { fontSize: 11, width: 36, height: 32, margin: 0 },
                '& .MuiDayCalendar-weekContainer': { justifyContent: 'space-between', px: 0.5, margin: 0 },
                '& .MuiDayCalendar-slideTransition': { minHeight: 200 },
                '& .MuiPickersLayout-contentWrapper': { width: '100%' },
                '& .MuiDateCalendar-root': { width: '100%', maxHeight: 280 }
              }}
            />
          </Box>
          
          <Divider />
          
          {/* Holidays Legend */}
          <Box sx={{ px: 1.5, pt: 1, pb: 0.5, flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={600} color="text.secondary">SĂRBĂTORI & ÎNCHIDERI</Typography>
              <Tooltip title={showHolidays ? 'Ascunde' : 'Arată'}>
                <IconButton size="small" onClick={() => setShowHolidays(!showHolidays)}>
                  {showHolidays ? <WbSunnyIcon sx={{ fontSize: 16 }} /> : <BlockIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          
          {showHolidays && (
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto', 
              px: 1.5, 
              pb: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.text.primary, 0.15), borderRadius: 2 }
            }}>
              <Stack spacing={0.5}>
                {/* All upcoming holidays for the year */}
                {nationalHolidays
                  .filter(h => dayjs(h.date).year() === currentYear || dayjs(h.date).year() === currentYear + 1)
                  .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                  .map(h => {
                    const isPast = dayjs(h.date).isBefore(dayjs(), 'day');
                    return (
                      <Paper
                        key={h.date}
                        elevation={0}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: isPast ? alpha(theme.palette.action.hover, 0.3) : alpha('#ef4444', 0.08),
                          cursor: 'pointer',
                          opacity: isPast ? 0.6 : 1,
                          '&:hover': { bgcolor: alpha('#ef4444', 0.15) }
                        }}
                        onClick={() => gotoDate(dayjs(h.date))}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontSize: 14 }}>🎉</Typography>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} noWrap>{h.name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {dayjs(h.date).format('D MMMM YYYY')}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })
                }
                
                {/* Company shutdowns */}
                {companyShutdowns.length > 0 && (
                  <>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 1.5, mb: 0.5 }}>
                      ÎNCHIDERI COMPANIE
                    </Typography>
                    {companyShutdowns.map(s => (
                      <Paper
                        key={s.id}
                        elevation={0}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: alpha('#f59e0b', 0.08),
                          border: `1px dashed ${alpha('#f59e0b', 0.3)}`,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha('#f59e0b', 0.15) }
                        }}
                        onClick={() => gotoDate(dayjs(s.startDate))}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <BusinessIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={600} noWrap>{s.reason}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {dayjs(s.startDate).format('D MMM')} - {dayjs(s.endDate).format('D MMM')} ({s.days}z)
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </>
                )}
              </Stack>
            </Box>
          )}
        </Card>

        {/* Calendar Card */}
        <Card 
          elevation={0} 
          sx={{ 
            flex: 1,
            borderRadius: 2, 
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0
          }}
        >
          {/* Toolbar */}
          <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
              {/* Left: Navigation */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title={mainView === 'heatmap' || mainView === 'stats' ? 'Anul anterior' : 'Luna anterioară (←)'}>
                    <IconButton size="small" onClick={gotoPrev} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: 'primary.main' } }}>
                      <ChevronLeftIcon />
                    </IconButton>
                  </Tooltip>
                  <Button variant="contained" size="small" onClick={gotoToday} startIcon={<TodayIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, minWidth: 90 }}>
                    Astăzi
                  </Button>
                  <Tooltip title={mainView === 'heatmap' || mainView === 'stats' ? 'Anul următor' : 'Luna următoare (→)'}>
                    <IconButton size="small" onClick={gotoNext} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: 'primary.main' } }}>
                      <ChevronRightIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 160, textAlign: 'center', textTransform: 'capitalize', display: { xs: 'none', sm: 'block' } }}>
                  {mainView === 'calendar' 
                    ? currentTitle 
                    : mainView === 'timeline'
                      ? dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`).format('MMMM YYYY')
                      : String(currentYear)
                  }
                </Typography>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', md: 'block' } }} />

                {mainView === 'calendar' && (
                  <ToggleButtonGroup
                    value={currentView}
                    exclusive
                    onChange={(_, v) => v && changeView(v)}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        px: 1.5, py: 0.75, borderRadius: '8px !important',
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)} !important`,
                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 600 }
                      }
                    }}
                  >
                    <Tooltip title="Vizualizare lună (M)"><ToggleButton value="dayGridMonth"><CalendarMonthIcon sx={{ fontSize: 18 }} /></ToggleButton></Tooltip>
                    <Tooltip title="Vizualizare săptămână (W)"><ToggleButton value="dayGridWeek"><ViewWeekIcon sx={{ fontSize: 18 }} /></ToggleButton></Tooltip>
                    <Tooltip title="Vizualizare agendă (L)"><ToggleButton value="listMonth"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton></Tooltip>
                  </ToggleButtonGroup>
                )}

                {mainView === 'heatmap' && (
                  <TextField
                    select
                    size="small"
                    value={currentYear}
                    onChange={e => setCurrentYear(Number(e.target.value))}
                    SelectProps={{ native: true }}
                    sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {Array.from({ length: 21 }, (_, i) => dayjs().year() - 10 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </TextField>
                )}
              </Stack>

              {/* Right: Actions */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  type="number"
                  value={maxOffAllowed}
                  onChange={(e) => setMaxOffAllowed(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={(e) => handleMaxOffChange(Number(e.target.value))}
                  sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  InputProps={{ startAdornment: <InputAdornment position="start" sx={{ mr: 0 }}>⚠️</InputAdornment> }}
                  label="Max/zi"
                />
                
                <Tooltip title="Reîncarcă (R)">
                  <IconButton onClick={load} disabled={loading} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2), borderColor: 'primary.main' } }}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Exportă CSV">
                  <span>
                    <IconButton onClick={exportCSV} disabled={!visibleEvents.length} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) }, '&.Mui-disabled': { bgcolor: 'transparent' } }}>
                      <FileDownloadIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Exportă PDF">
                  <span>
                    <IconButton onClick={exportPDF} disabled={!visibleEvents.length} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }, '&.Mui-disabled': { bgcolor: 'transparent' } }}>
                      <PictureAsPdfIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Scurtături tastatură">
                  <IconButton onClick={(e) => setShortcutsAnchor(e.currentTarget)} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08), color: 'text.secondary', border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.12), color: 'text.primary' } }}>
                    <KeyboardIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}` }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
              <TextField
                size="small"
                placeholder="Caută angajat..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                sx={{ maxWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  endAdornment: query ? <InputAdornment position="end"><IconButton size="small" onClick={() => setQuery('')}><ClearIcon sx={{ fontSize: 18 }} /></IconButton></InputAdornment> : null
                }}
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Selectează toți (Ctrl+A)">
                  <Button size="small" onClick={selectAll} startIcon={<SelectAllIcon />} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: alpha(theme.palette.primary.main, 0.08), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) } }}>
                    Toți
                  </Button>
                </Tooltip>
                <Tooltip title="Deselectează toți">
                  <Button size="small" variant="outlined" onClick={clearAll} startIcon={<ClearIcon />} sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha(theme.palette.error.main, 0.5), color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), borderColor: 'error.main' } }}>
                    Niciunul
                  </Button>
                </Tooltip>
                <Tooltip title="Inversează selecția">
                  <Button size="small" variant="outlined" onClick={invert} startIcon={<FlipCameraAndroidIcon />} sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha(theme.palette.secondary.main, 0.5), color: 'secondary.main', '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.08), borderColor: 'secondary.main' } }}>
                    Inversează
                  </Button>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                <Tooltip title={legendCollapsed ? 'Extinde legenda' : 'Restrânge legenda'}>
                  <IconButton size="small" onClick={() => setLegendCollapsed(!legendCollapsed)} sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`, '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2), borderColor: 'info.main' } }}>
                    {legendCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          {/* Employee Legend - Collapsible */}
          <Collapse in={!legendCollapsed}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`, maxHeight: 120, overflowY: 'auto' }}>
              {loading ? (
                <Stack direction="row" spacing={1}>{[1,2,3,4,5].map(i => <Skeleton key={i} variant="rounded" width={100} height={28} sx={{ borderRadius: 2 }} />)}</Stack>
              ) : (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {legend.filter(l => filteredEmployees.find(e => e.id === l.id)).map(l => {
                    const isOn = selected.includes(l.id);
                    const balance = leaveBalances.find(b => b.id === l.id);
                    return (
                      <Tooltip
                        key={l.id}
                        title={
                          <Box>
                            <Typography variant="caption">{isOn ? 'Click: ascunde' : 'Click: arată'} · Alt+Click: doar acesta</Typography>
                            {balance && (
                              <Typography variant="caption" display="block">
                                Sold: {balance.remaining} zile (din {balance.accrued + balance.carriedOver})
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                        enterDelay={300}
                      >
                        <Chip
                          avatar={
                            <Badge
                              badgeContent={balance?.remaining}
                              color={balance && balance.remaining <= 0 ? 'error' : balance && balance.remaining <= 5 ? 'warning' : 'success'}
                              sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16, right: -3, top: -3 } }}
                            >
                              <Avatar sx={{ bgcolor: isOn ? 'white' : l.color, color: isOn ? l.color : 'white', fontWeight: 700, fontSize: 10, width: 22, height: 22 }}>
                                {getInitials(l.name)}
                              </Avatar>
                            </Badge>
                          }
                          label={l.name}
                          size="small"
                          onClick={(ev) => toggleEmployee(l.id, (ev as any).altKey)}
                          sx={{
                            bgcolor: isOn ? l.color : 'transparent',
                            color: isOn ? 'white' : 'text.primary',
                            border: `2px solid ${l.color}`,
                            fontWeight: isOn ? 600 : 400,
                            fontSize: 12,
                            height: 28,
                            pl: 0.5,
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                            '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 2px 8px ${alpha(l.color, 0.35)}` },
                          }}
                          variant={isOn ? 'filled' : 'outlined'}
                        />
                      </Tooltip>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Collapse>

          {error && <Alert severity="error" sx={{ mx: 2, mt: 2, borderRadius: 2 }}>{error}</Alert>}

          {/* Empty State */}
          {selected.length === 0 && !loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 6, px: 2 }}>
              <Zoom in>
                <Avatar sx={{ width: 80, height: 80, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', mb: 2 }}>
                  <GroupIcon sx={{ fontSize: 40 }} />
                </Avatar>
              </Zoom>
              <Typography variant="h6" color="text.secondary" gutterBottom>Niciun angajat selectat</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 400, mb: 3 }}>
                Selectați angajați din lista de mai sus pentru a vizualiza concediile lor.
              </Typography>
              <Button variant="contained" startIcon={<SelectAllIcon />} onClick={selectAll} sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}>
                Selectează toți angajații
              </Button>
            </Box>
          )}

          {/* Main View Content */}
          {(selected.length > 0 || loading) && mainView === 'calendar' && (
            <Box
              sx={{
                flex: 1, minHeight: 0, p: 1,
                '& .fc': { 
                  fontFamily: theme.typography.fontFamily,
                  '--fc-border-color': alpha(theme.palette.divider, 0.12),
                  '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.06),
                },
                '& .fc .fc-toolbar-title': { fontSize: '1rem', fontWeight: 600, color: theme.palette.text.primary, textTransform: 'capitalize' },
                '& .fc .fc-button': { borderRadius: '6px', textTransform: 'capitalize', fontWeight: 500 },
                // Calendar grid styling
                '& .fc .fc-scrollgrid': { borderRadius: '8px', overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.08)}` },
                '& .fc .fc-col-header': { backgroundColor: alpha(theme.palette.primary.main, 0.02) },
                '& .fc .fc-col-header-cell': { padding: '8px 0', borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` },
                '& .fc .fc-col-header-cell-cushion': { fontWeight: 600, fontSize: 11, color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.3px' },
                // Day cell styling
                '& .fc .fc-daygrid-day': { transition: 'background-color 0.15s ease' },
                '& .fc .fc-daygrid-day:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.04) },
                '& .fc .fc-daygrid-day-frame': { padding: '2px', minHeight: '80px' },
                // Day number - top area
                '& .fc .fc-daygrid-day-top': { 
                  display: 'flex', 
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  padding: '4px 6px 2px 6px',
                  gap: '4px'
                },
                '& .fc .fc-daygrid-day-number': { 
                  fontSize: 12, 
                  fontWeight: 500, 
                  color: theme.palette.text.primary,
                  padding: 0,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  flexShrink: 0
                },
                // Today styling
                '& .fc .fc-day-today': { 
                  backgroundColor: `${alpha(theme.palette.primary.main, 0.06)} !important`,
                },
                '& .fc .fc-day-today .fc-daygrid-day-number': { 
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`, 
                  color: 'white', 
                  fontWeight: 700,
                  boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.35)}`
                },
                // Weekend styling
                '& .fc .fc-day-sat, & .fc .fc-day-sun': { backgroundColor: alpha(theme.palette.action.hover, 0.2) },
                '& .fc .fc-day-sat .fc-daygrid-day-number, & .fc .fc-day-sun .fc-daygrid-day-number': { color: theme.palette.text.secondary },
                // Other month days
                '& .fc .fc-day-other .fc-daygrid-day-number': { color: alpha(theme.palette.text.disabled, 0.5), fontWeight: 400 },
                // Events styling
                '& .fc .fc-daygrid-event': { 
                  borderRadius: '4px', 
                  fontSize: 10, 
                  padding: '2px 6px', 
                  boxShadow: `0 1px 2px ${alpha('#000', 0.1)}`, 
                  border: 'none', 
                  marginTop: 1, 
                  marginLeft: 4,
                  marginRight: 4,
                  cursor: 'pointer', 
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease', 
                  '&:hover': { 
                    transform: 'translateY(-1px) scale(1.01)', 
                    boxShadow: `0 4px 12px ${alpha('#000', 0.18)}` 
                  } 
                },
                '& .fc .fc-daygrid-event-harness': { marginBottom: 1 },
                '& .fc .fc-daygrid-more-link': { 
                  fontSize: 10, 
                  fontWeight: 600, 
                  color: theme.palette.primary.main,
                  marginLeft: 2,
                  marginTop: 2
                },
                '& .fc .fc-list-event': { fontSize: 12, cursor: 'pointer' },
                // Count badge styling
                '& .fc .topaz-overcap': { boxShadow: `inset 0 0 0 2px ${alpha(theme.palette.error.main, 0.5)}`, borderRadius: '6px' },
                '& .fc .topaz-count-badge': { 
                  fontSize: 9, 
                  lineHeight: '16px', 
                  height: 16, 
                  minWidth: 16, 
                  padding: '0 4px', 
                  borderRadius: '8px', 
                  background: alpha(theme.palette.text.primary, 0.08), 
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                '& .fc .topaz-count-badge.over': { 
                  background: alpha(theme.palette.error.main, 0.15), 
                  color: theme.palette.error.dark, 
                  fontWeight: 700 
                },
                // List view styling
                '& .fc .fc-list': { borderRadius: '8px', border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, overflow: 'hidden' },
                '& .fc .fc-list-day-cushion': { background: alpha(theme.palette.primary.main, 0.03), padding: '8px 12px' },
                '& .fc .fc-list-event-title': { fontWeight: 500 },
                // Holiday background styling
                '& .fc .holiday-bg': { 
                  opacity: '1 !important',
                  background: `repeating-linear-gradient(45deg, ${alpha('#ef4444', 0.18)}, ${alpha('#ef4444', 0.18)} 3px, ${alpha('#ef4444', 0.28)} 3px, ${alpha('#ef4444', 0.28)} 6px) !important`
                },
                '& .fc .shutdown-bg': { 
                  opacity: '1 !important',
                  background: `repeating-linear-gradient(-45deg, ${alpha('#f59e0b', 0.15)}, ${alpha('#f59e0b', 0.15)} 4px, ${alpha('#f59e0b', 0.25)} 4px, ${alpha('#f59e0b', 0.25)} 8px) !important`
                }
              }}
            >
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                height="100%"
                locale={roLocale}
                firstDay={1}
                headerToolbar={false}
                events={[...visibleEvents, ...holidayEvents]}
                dayMaxEvents={4}
                eventOverlap
                eventOrder="title,start"
                datesSet={onDatesSet}
                eventClick={handleEventClick}
                dateClick={(arg) => { changeView('dayGridWeek'); calendarRef.current?.getApi().gotoDate(arg.date); }}
                dayCellDidMount={(info) => {
                  const key = dayjs(info.date).format('YYYY-MM-DD');
                  const count = offCountMap.get(key) || 0;
                  const badge = document.createElement('span');
                  badge.className = 'topaz-count-badge' + (count > maxOffAllowed ? ' over' : '');
                  badge.textContent = count ? String(count) : '';
                  (info.el.querySelector('.fc-daygrid-day-top') || info.el).appendChild(badge);
                  if (count > maxOffAllowed) {
                    const frame = info.el.querySelector('.fc-daygrid-day-frame') as HTMLElement | null;
                    (frame || info.el).classList.add('topaz-overcap');
                  }
                  // Add holiday tooltip
                  const holidayName = holidayNameMap.get(key);
                  if (holidayName) {
                    info.el.setAttribute('title', `🎉 ${holidayName}`);
                    info.el.style.cursor = 'help';
                  }
                }}
                eventContent={(arg) => {
                  if (arg.event.display === 'background') return null;
                  const name = (arg.event.extendedProps['employee'] as string) || arg.event.title;
                  const initials = getInitials(name);
                  const note = arg.event.extendedProps['note'] as string | undefined;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', color: '#333', fontSize: 9, fontWeight: 700, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', flexShrink: 0 }}>{initials}</span>
                      <span style={{ fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      {note && <Badge variant="dot" color="warning" sx={{ '& .MuiBadge-dot': { width: 5, height: 5, minWidth: 5, backgroundColor: 'rgba(255,255,255,0.8)' } }} />}
                    </div>
                  );
                }}
                listDayFormat={{ weekday: 'long', day: 'numeric', month: 'long' }}
                listDaySideFormat={false}
              />
            </Box>
          )}

          {mainView === 'timeline' && (
            <TimelineView
              employees={employees}
              allLeaveDetails={allLeaveDetails}
              selected={selected}
              year={currentYear}
              month={currentMonth}
              onEventClick={(detail) => { setSelectedEvent(detail); setEventDialogOpen(true); }}
            />
          )}

          {mainView === 'heatmap' && (
            <HeatmapView
              offCountMap={offCountMap}
              year={currentYear}
              maxOffAllowed={maxOffAllowed}
              holidays={nationalHolidays}
              shutdowns={companyShutdowns}
              onDateClick={(d) => { gotoDate(d); setMainView('calendar'); }}
            />
          )}

          {mainView === 'stats' && (
            <StatsView
              employees={employees}
              allLeaveDetails={allLeaveDetails}
              selected={selected}
              viewStart={viewStart}
              viewEnd={viewEnd}
              balances={leaveBalances}
            />
          )}
        </Card>
      </Box>

      {/* Event Detail Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {selectedEvent && (
          <>
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 2, bgcolor: alpha(selectedEvent.color, 0.1) }}>
              <Avatar sx={{ bgcolor: selectedEvent.color, width: 48, height: 48, fontWeight: 700 }}>{getInitials(selectedEvent.employee)}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>{selectedEvent.employee}</Typography>
                <Typography variant="caption" color="text.secondary">Detalii concediu</Typography>
              </Box>
              <IconButton onClick={() => setEventDialogOpen(false)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><DateRangeIcon /></Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Perioadă</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {dayjs(selectedEvent.start).format('D MMMM YYYY')}
                      {selectedEvent.days > 1 && <> – {dayjs(selectedEvent.start).add(selectedEvent.days - 1, 'day').format('D MMMM YYYY')}</>}
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}><AccessTimeIcon /></Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Durată</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedEvent.days} {selectedEvent.days === 1 ? 'zi lucrătoare' : 'zile lucrătoare'}</Typography>
                  </Box>
                </Stack>

                {selectedEvent.note && (
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}><NotesIcon /></Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Notă</Typography>
                      <Typography variant="body1">{selectedEvent.note}</Typography>
                    </Box>
                  </Stack>
                )}

                {/* Conflict warning */}
                {(() => {
                  const dateStr = selectedEvent.start;
                  const count = offCountMap.get(dateStr) || 0;
                  if (count > maxOffAllowed) {
                    return (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          ⚠️ <strong>Atenție:</strong> În data de {dayjs(dateStr).format('D MMMM')} sunt {count} persoane în concediu (peste limita de {maxOffAllowed}).
                        </Typography>
                      </Alert>
                    );
                  }
                  return null;
                })()}

                <Divider />

                <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.1)}` }}>
                  <Typography variant="caption" color="text.secondary">Programat să înceapă</Typography>
                  <Typography variant="body2" fontWeight={600} color="info.main">{dayjs(selectedEvent.start).fromNow()}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => { gotoDate(dayjs(selectedEvent.start)); setEventDialogOpen(false); setMainView('calendar'); }} startIcon={<CalendarMonthIcon />} sx={{ borderRadius: 2, textTransform: 'none' }}>Mergi la dată</Button>
              <Button variant="contained" onClick={() => setEventDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Închide</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Keyboard Shortcuts Popover */}
      <Popover open={Boolean(shortcutsAnchor)} anchorEl={shortcutsAnchor} onClose={() => setShortcutsAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { borderRadius: 2, p: 2, minWidth: 220 } }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>Scurtături Tastatură</Typography>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1}>
          {[
            { key: 'T', action: 'Mergi la astăzi' },
            { key: 'M', action: 'Vizualizare lună' },
            { key: 'W', action: 'Vizualizare săptămână' },
            { key: 'L', action: 'Vizualizare agendă' },
            { key: '←', action: 'Perioada anterioară' },
            { key: '→', action: 'Perioada următoare' },
            { key: 'Ctrl+A', action: 'Selectează toți' },
            { key: 'Esc', action: 'Închide dialog' },
          ].map(({ key, action }) => (
            <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">{action}</Typography>
              <Chip label={key} size="small" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </Stack>
          ))}
        </Stack>
      </Popover>
    </Box>
  );
}
