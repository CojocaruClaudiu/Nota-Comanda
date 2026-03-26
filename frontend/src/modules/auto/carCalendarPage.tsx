// src/pages/auto/CarCalendarPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar, LocalizationProvider, PickersDay } from '@mui/x-date-pickers';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';

import { getCars, type Car } from '../../api/cars';

dayjs.locale('ro');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);

type CarDocKey = 'expItp' | 'expRca' | 'expRovi' | 'expCasco';
type DocColor = 'primary' | 'success' | 'warning' | 'info';
type Severity = 'all' | 'overdue' | 'next7' | 'next30';

type EventItem = {
  date: Dayjs;
  car: Car;
  docKey: CarDocKey;
  color: DocColor;
  daysLeft: number;
};

const DOCS: Record<CarDocKey, { label: string; color: DocColor; Icon: React.ElementType }> = {
  expItp: { label: 'ITP', color: 'primary', Icon: FactCheckOutlinedIcon },
  expRca: { label: 'RCA', color: 'success', Icon: ShieldOutlinedIcon },
  expRovi: { label: 'Rovinieta', color: 'warning', Icon: MapOutlinedIcon },
  expCasco: { label: 'CASCO', color: 'info', Icon: SecurityOutlinedIcon },
};

const SEVERITY_CHIPS: Array<{ key: Severity; label: string }> = [
  { key: 'all', label: 'Toate' },
  { key: 'overdue', label: 'Expirate' },
  { key: 'next7', label: 'Urm. 7 zile' },
  { key: 'next30', label: 'Urm. 30 zile' },
];

const toDayKey = (d: Dayjs) => d.format('YYYY-MM-DD');

const formatDaysLeft = (daysLeft: number) => {
  if (daysLeft < 0) return `expirat de ${Math.abs(daysLeft)} zile`;
  if (daysLeft === 0) return 'expira azi';
  return `in ${daysLeft} zile`;
};

const downloadFile = (filename: string, mime: string, text: string) => {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: string[][]) =>
  rows
    .map((r) =>
      r
        .map((cell) => {
          const text = String(cell ?? '');
          const escaped = text.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(','),
    )
    .join('\n');

const toICS = (events: EventItem[]) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Topaz Construct//Car Expirations//RO',
  ];

  for (const event of events) {
    const day = event.date.format('YYYYMMDD');
    const doc = DOCS[event.docKey].label;
    const title = `${event.car.placute} - ${doc}`;
    const description = `${event.car.marca ?? ''} ${event.car.model ?? ''} ${event.car.an ?? ''}`.trim();

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.car.id}-${event.docKey}-${day}@topaz-construct`,
      `DTSTAMP:${dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${event.date.add(1, 'day').format('YYYYMMDD')}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const useLocalStorage = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore local storage write errors
    }
  }, [key, value]);

  return [value, setValue] as const;
};

export default function CarCalendarPage() {
  const theme = useTheme();

  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDateIso, setSelectedDateIso] = useLocalStorage<string>(
    'carcal:selectedDate',
    dayjs().toISOString(),
  );
  const selectedDate = useMemo(() => dayjs(selectedDateIso), [selectedDateIso]);
  const setSelectedDate = useCallback((date: Dayjs) => setSelectedDateIso(date.toISOString()), [setSelectedDateIso]);

  const [search, setSearch] = useLocalStorage<string>('carcal:search', '');
  const [severity, setSeverity] = useLocalStorage<Severity>('carcal:severity', 'all');
  const [activeDocs, setActiveDocs] = useLocalStorage<Record<CarDocKey, boolean>>(
    'carcal:docs',
    { expItp: true, expRca: true, expRovi: true, expCasco: true },
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCars();
        setCars(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Nu am putut incarca masinile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cars;
    return cars.filter((car) => (car.placute || '').toLowerCase().includes(query));
  }, [cars, search]);

  const allEvents = useMemo<EventItem[]>(() => {
    const now = dayjs().startOf('day');
    const list: EventItem[] = [];

    for (const car of filteredCars) {
      (Object.keys(DOCS) as CarDocKey[]).forEach((key) => {
        const rawDate = car[key] as string | null | undefined;
        if (!rawDate) return;
        const date = dayjs(rawDate);
        if (!date.isValid()) return;

        list.push({
          date,
          car,
          docKey: key,
          color: DOCS[key].color,
          daysLeft: date.startOf('day').diff(now, 'day'),
        });
      });
    }

    return list;
  }, [filteredCars]);

  const severityFilter = useCallback(
    (event: EventItem) => {
      if (severity === 'all') return true;
      if (severity === 'overdue') return event.daysLeft <= 0;
      if (severity === 'next7') return event.daysLeft > 0 && event.daysLeft <= 7;
      if (severity === 'next30') return event.daysLeft > 0 && event.daysLeft <= 30;
      return true;
    },
    [severity],
  );

  const monthEvents = useMemo(
    () =>
      allEvents.filter((event) => {
        const sameMonth = event.date.month() === selectedDate.month() && event.date.year() === selectedDate.year();
        return sameMonth && activeDocs[event.docKey] && severityFilter(event);
      }),
    [allEvents, selectedDate, activeDocs, severityFilter],
  );

  const monthEventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of monthEvents) {
      const key = toDayKey(event.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    for (const events of map.values()) {
      events.sort((a, b) => a.daysLeft - b.daysLeft || a.car.placute.localeCompare(b.car.placute));
    }
    return map;
  }, [monthEvents]);

  const selectedDayEvents = useMemo(
    () => monthEventsByDay.get(toDayKey(selectedDate)) ?? [],
    [monthEventsByDay, selectedDate],
  );

  const monthStats = useMemo(() => {
    let overdue = 0;
    let next7 = 0;
    let next30 = 0;

    for (const event of monthEvents) {
      if (event.daysLeft <= 0) overdue += 1;
      else if (event.daysLeft <= 7) next7 += 1;
      else if (event.daysLeft <= 30) next30 += 1;
    }

    return { overdue, next7, next30, total: monthEvents.length };
  }, [monthEvents]);

  const next14Events = useMemo(() => {
    const start = dayjs().startOf('day');
    const end = start.add(14, 'day').endOf('day');
    return allEvents
      .filter(
        (event) =>
          activeDocs[event.docKey] &&
          severityFilter(event) &&
          event.date.isSameOrAfter(start) &&
          event.date.isSameOrBefore(end),
      )
      .sort((a, b) => a.date.valueOf() - b.date.valueOf() || a.car.placute.localeCompare(b.car.placute));
  }, [allEvents, activeDocs, severityFilter]);

  const toggleDoc = (key: CarDocKey) => {
    setActiveDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilters = () => {
    setSearch('');
    setSeverity('all');
    setActiveDocs({ expItp: true, expRca: true, expRovi: true, expCasco: true });
    setSelectedDate(dayjs());
  };

  const goPrevMonth = () => setSelectedDate(selectedDate.subtract(1, 'month').startOf('month'));
  const goNextMonth = () => setSelectedDate(selectedDate.add(1, 'month').startOf('month'));
  const goToday = () => setSelectedDate(dayjs());

  const exportMonthCsv = () => {
    const rows = [
      ['Data', 'Placute', 'Document', 'Zile ramase', 'Marca', 'Model', 'An'],
      ...monthEvents
        .slice()
        .sort((a, b) => a.date.valueOf() - b.date.valueOf())
        .map((event) => [
          event.date.format('YYYY-MM-DD'),
          event.car.placute ?? '',
          DOCS[event.docKey].label,
          String(event.daysLeft),
          event.car.marca ?? '',
          event.car.model ?? '',
          String(event.car.an ?? ''),
        ]),
    ];

    downloadFile(`expirari_${selectedDate.format('YYYY_MM')}.csv`, 'text/csv', toCsv(rows));
  };

  const exportMonthIcs = () =>
    downloadFile(`expirari_${selectedDate.format('YYYY_MM')}.ics`, 'text/calendar', toICS(monthEvents));

  const exportNext14Ics = () =>
    downloadFile(
      `expirari_urmatoarele_14_zile_${dayjs().format('YYYY_MM_DD')}.ics`,
      'text/calendar',
      toICS(next14Events),
    );

  function CarCalendarDay(props: PickersDayProps) {
    const { day, outsideCurrentMonth, ...other } = props;
    const key = toDayKey(day);
    const events = monthEventsByDay.get(key) ?? [];
    const count = events.length;
    const hasOverdue = events.some((event) => event.daysLeft <= 0);
    const hasUrgent = events.some((event) => event.daysLeft > 0 && event.daysLeft <= 7);
    const colors = Array.from(new Set(events.map((event) => event.color))).slice(0, 3);

    const dayNode = (
      <Box sx={{ position: 'relative' }}>
        <PickersDay
          {...other}
          day={day}
          outsideCurrentMonth={outsideCurrentMonth}
          sx={{
            fontWeight: count > 0 ? 700 : 500,
            borderRadius: 2,
            transition: 'all 120ms ease',
            ...(count > 0 && { bgcolor: alpha(theme.palette.primary.main, 0.07) }),
            ...(hasOverdue && { boxShadow: `inset 0 0 0 2px ${theme.palette.error.main}` }),
            ...(!hasOverdue && hasUrgent && { boxShadow: `inset 0 0 0 2px ${alpha(theme.palette.warning.main, 0.8)}` }),
            '&.Mui-selected': {
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              color: theme.palette.common.white,
              boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.34)}`,
            },
          }}
        />

        {count > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0.35,
              pointerEvents: 'none',
            }}
          >
            {colors.map((color, index) => (
              <Box
                key={`${key}-${color}-${index}`}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: theme.palette[color].main,
                }}
              />
            ))}
            {count > colors.length && (
              <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>
                +{count - colors.length}
              </Typography>
            )}
          </Box>
        )}

        {count > 1 && (
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              right: 4,
              minWidth: 16,
              height: 16,
              px: 0.4,
              borderRadius: 999,
              bgcolor: hasOverdue
                ? theme.palette.error.main
                : hasUrgent
                  ? theme.palette.warning.main
                  : alpha(theme.palette.text.primary, 0.8),
              color: theme.palette.common.white,
              fontSize: 10,
              fontWeight: 800,
              lineHeight: '16px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {count > 9 ? '9+' : count}
          </Box>
        )}
      </Box>
    );

    if (count === 0) return dayNode;

    return (
      <Tooltip
        arrow
        enterDelay={180}
        title={
          <Box>
            {events.map((event) => (
              <Typography key={`${event.car.id}-${event.docKey}`} variant="caption" display="block">
                {event.car.placute} - {DOCS[event.docKey].label} ({formatDaysLeft(event.daysLeft)})
              </Typography>
            ))}
          </Box>
        }
      >
        {dayNode}
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        overflow: 'hidden',
      }}
    >
      <Fade in={loading}>
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, height: 3 }} />
      </Fade>

      <Box
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.paper} 100%)`,
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                    }}
                  >
                    <CalendarTodayOutlinedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2 }}>
                      Expirari documente auto
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vizualizare lunara - {selectedDate.format('MMMM YYYY')}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Tooltip title="Luna anterioara">
                    <IconButton size="small" onClick={goPrevMonth} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.35)}` }}>
                      <ChevronLeftRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={goToday}
                    startIcon={<CalendarTodayOutlinedIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, minWidth: 90 }}
                  >
                    Astazi
                  </Button>
                  <Tooltip title="Luna urmatoare">
                    <IconButton size="small" onClick={goNextMonth} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.35)}` }}>
                      <ChevronRightRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} useFlexGap>
                <TextField
                  size="small"
                  label="Cauta placute"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ width: { xs: '100%', md: 260 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  InputProps={{
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flex: 1 }}>
                  {SEVERITY_CHIPS.map((item) => (
                    <Chip
                      key={item.key}
                      clickable
                      label={item.label}
                      color={severity === item.key ? 'primary' : 'default'}
                      variant={severity === item.key ? 'filled' : 'outlined'}
                      onClick={() => setSeverity(item.key)}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestartAltOutlinedIcon />}
                  onClick={resetFilters}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Reset
                </Button>
              </Stack>

              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between">
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {(Object.keys(DOCS) as CarDocKey[]).map((key) => {
                    const doc = DOCS[key];
                    const Icon = doc.Icon;
                    const active = activeDocs[key];
                    return (
                      <Chip
                        key={key}
                        clickable
                        icon={<Icon />}
                        label={doc.label}
                        onClick={() => toggleDoc(key)}
                        variant={active ? 'filled' : 'outlined'}
                        color={active ? doc.color : 'default'}
                        sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
                      />
                    );
                  })}
                </Stack>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={exportMonthCsv}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    CSV luna
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={exportMonthIcs}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    ICS luna
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={exportNext14Ics}
                    disabled={next14Events.length === 0}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    ICS 14 zile
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Card
              elevation={0}
              sx={{
                flex: 1,
                minHeight: 0,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 1.25,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  bgcolor: alpha(theme.palette.background.default, 0.45),
                }}
              >
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                  <Chip size="small" label={selectedDate.format('MMMM YYYY')} sx={{ textTransform: 'capitalize', fontWeight: 700 }} />
                  <Chip
                    size="small"
                    color={selectedDayEvents.length > 0 ? 'primary' : 'default'}
                    label={`${selectedDate.format('DD MMM')} - ${selectedDayEvents.length} expirari`}
                  />
                  <Chip
                    size="small"
                    color={monthStats.overdue > 0 ? 'error' : 'default'}
                    icon={<EventBusyOutlinedIcon />}
                    label={`Expirate: ${monthStats.overdue}`}
                  />
                  <Chip
                    size="small"
                    color={monthStats.next7 > 0 ? 'warning' : 'default'}
                    label={`7 zile: ${monthStats.next7}`}
                  />
                  <Chip
                    size="small"
                    color={monthStats.next30 > 0 ? 'info' : 'default'}
                    label={`30 zile: ${monthStats.next30}`}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    icon={<FilterAltOutlinedIcon />}
                    label={`Total luna: ${monthStats.total}`}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  px: { xs: 0.5, sm: 1.5 },
                  py: { xs: 0.5, sm: 1 },
                  overflow: 'hidden',
                }}
              >
                <DateCalendar
                  value={selectedDate}
                  onChange={(date) => {
                    if (date) setSelectedDate(date);
                  }}
                  onMonthChange={(month) => {
                    const safeDay = Math.min(selectedDate.date(), month.daysInMonth());
                    setSelectedDate(month.date(safeDay));
                  }}
                  slots={{ day: CarCalendarDay }}
                  sx={{
                    width: '100%',
                    maxWidth: { xs: 390, sm: 580, md: 720, lg: 860 },
                    m: 0,
                    '& .MuiPickersCalendarHeader-root': {
                      px: { xs: 0.5, sm: 1.5 },
                      mb: 0.5,
                      mt: 0.25,
                    },
                    '& .MuiPickersCalendarHeader-label': {
                      fontSize: { xs: 15, sm: 18 },
                      fontWeight: 800,
                      textTransform: 'capitalize',
                    },
                    '& .MuiPickersArrowSwitcher-button': { border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, borderRadius: 1.5 },
                    '& .MuiDayCalendar-header': {
                      justifyContent: 'space-between',
                      px: { xs: 0.25, sm: 0.75, md: 1 },
                      mb: 0.5,
                    },
                    '& .MuiDayCalendar-weekContainer': {
                      justifyContent: 'space-between',
                      px: { xs: 0.25, sm: 0.75, md: 1 },
                      mx: 0,
                    },
                    '& .MuiDayCalendar-weekDayLabel': {
                      width: { xs: 34, sm: 42, md: 50, lg: 56 },
                      margin: 0,
                      fontSize: { xs: 10, sm: 12 },
                      fontWeight: 700,
                      color: 'text.secondary',
                    },
                    '& .MuiPickersDay-root': {
                      width: { xs: 34, sm: 42, md: 50, lg: 56 },
                      height: { xs: 34, sm: 42, md: 50, lg: 56 },
                      margin: 0,
                      fontSize: { xs: 12, sm: 14, md: 16 },
                      borderRadius: 2,
                    },
                    '& .MuiPickersDay-today': { border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}` },
                  }}
                />
              </Box>

              <Divider />

              <Box sx={{ px: 1.25, py: 1 }}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {(Object.keys(DOCS) as CarDocKey[]).map((key) => (
                    <Chip
                      key={`legend-${key}`}
                      size="small"
                      label={DOCS[key].label}
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette[DOCS[key].color].main, 0.12),
                        color: theme.palette[DOCS[key].color].main,
                      }}
                    />
                  ))}
                  {selectedDayEvents.slice(0, 4).map((event) => (
                    <Chip
                      key={`${event.car.id}-${event.docKey}`}
                      size="small"
                      label={`${event.car.placute} - ${DOCS[event.docKey].label}`}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                  {selectedDayEvents.length > 4 && (
                    <Chip size="small" label={`+${selectedDayEvents.length - 4} inca`} />
                  )}
                </Stack>
              </Box>
            </Card>
          </LocalizationProvider>
        )}
      </Box>
    </Box>
  );
}
