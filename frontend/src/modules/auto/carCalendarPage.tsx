// src/pages/auto/CarCalendarPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Chip,
  Button,
  Tooltip,
  Divider,
  IconButton,
  InputAdornment,
  useMediaQuery,
  Badge,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined'; // rovinieta-ish
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'; // ITP-ish
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'; // RCA-ish
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
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

// ── Types & constants ─────────────────────────────────────────────────────────

type CarDocKey = 'expItp' | 'expRca' | 'expRovi';
type DocColor = 'primary' | 'success' | 'warning';
type Severity = 'all' | 'overdue' | 'next7' | 'next30';

const DOCS: Record<
  CarDocKey,
  { label: string; color: DocColor; Icon: React.ElementType }
> = {
  expItp: { label: 'ITP', color: 'primary', Icon: FactCheckOutlinedIcon },
  expRca: { label: 'RCA', color: 'success', Icon: ShieldOutlinedIcon },
  expRovi: { label: 'Rovinietă', color: 'warning', Icon: MapOutlinedIcon },
};

type EventItem = {
  date: Dayjs;
  car: Car;
  docKey: CarDocKey;
  color: DocColor;
  daysLeft: number; // negative => overdue
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const toDayKey = (d: Dayjs) => d.format('YYYY-MM-DD');

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
          const s = String(cell ?? '');
          const esc = s.replace(/"/g, '""');
          return /[",\n]/.test(esc) ? `"${esc}"` : esc;
        })
        .join(','),
    )
    .join('\n');

const toICS = (events: EventItem[]) => {
  // simple all-day events ICS
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Topaz Construct//Car Expirations//RO',
  ];
  for (const e of events) {
    const d = e.date.format('YYYYMMDD');
    const doc = DOCS[e.docKey].label;
    const title = `${e.car.placute} • ${doc}`;
    const desc = `${e.car.marca ?? ''} ${e.car.model ?? ''} ${e.car.an ?? ''}`.trim();
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.car.id}-${e.docKey}-${d}@topaz-construct`,
      `DTSTAMP:${dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${e.date.add(1, 'day').format('YYYYMMDD')}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

// Persist small UI state
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
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CarCalendarPage() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // store date as ISO in localStorage to avoid Dayjs serialization issues
  const [selectedDateIso, setSelectedDateIso] = useLocalStorage<string>(
    'carcal:selectedDate',
    dayjs().toISOString(),
  );
  const selectedDate = useMemo(() => dayjs(selectedDateIso), [selectedDateIso]);
  const setSelectedDate = (d: Dayjs) => setSelectedDateIso(d.toISOString());

  const [search, setSearch] = useLocalStorage<string>('carcal:search', '');
  const [severity, setSeverity] = useLocalStorage<Severity>('carcal:severity', 'all');
  const [activeDocs, setActiveDocs] = useLocalStorage<Record<CarDocKey, boolean>>(
    'carcal:docs',
    { expItp: true, expRca: true, expRovi: true },
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCars();
        setCars(data);
      } catch (e: any) {
        setError(e?.message || 'Nu am putut încărca mașinile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filtering & event building ─────────────────────────────────────────────

  const filteredCars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) => (c.placute || '').toLowerCase().includes(q));
  }, [cars, search]);

  const allEvents = useMemo<EventItem[]>(() => {
    const list: EventItem[] = [];
    for (const car of filteredCars) {
      (Object.keys(DOCS) as CarDocKey[]).forEach((key) => {
        const iso = car[key] as string | null | undefined;
        if (!iso) return;
        const d = dayjs(iso);
        if (!d.isValid()) return;
        const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day');
        list.push({
          date: d,
          car,
          docKey: key,
          color: DOCS[key].color,
          daysLeft: diff,
        });
      });
    }
    return list;
  }, [filteredCars]);

  const severityFilter = (e: EventItem) => {
    if (severity === 'all') return true;
    if (severity === 'overdue') return e.daysLeft <= 0;
    if (severity === 'next7') return e.daysLeft > 0 && e.daysLeft <= 7;
    if (severity === 'next30') return e.daysLeft > 0 && e.daysLeft <= 30;
    return true;
  };

  // events in visible month & respecting filters
  const monthEvents = useMemo(() => {
    const m = selectedDate.month();
    const y = selectedDate.year();
    return allEvents.filter(
      (ev) =>
        ev.date.month() === m &&
        ev.date.year() === y &&
        activeDocs[ev.docKey] &&
        severityFilter(ev),
    );
  }, [allEvents, selectedDate, activeDocs, severity]);

  const monthEventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of monthEvents) {
      const k = toDayKey(ev.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    for (const [, arr] of map.entries()) {
      arr.sort((a, b) => a.daysLeft - b.daysLeft || a.docKey.localeCompare(b.docKey));
    }
    return map;
  }, [monthEvents]);

  const legendPlates = useMemo(() => {
    const seen = new Map<string, DocColor>();
    for (const ev of monthEvents) if (!seen.has(ev.car.placute)) seen.set(ev.car.placute, ev.color);
    return Array.from(seen.entries()).map(([placute, color]) => ({ placute, color }));
  }, [monthEvents]);

  const monthStats = useMemo(() => {
    let overdue = 0,
      next7 = 0,
      next30 = 0;
    for (const ev of monthEvents) {
      if (ev.daysLeft <= 0) overdue++;
      else if (ev.daysLeft <= 7) next7++;
      else if (ev.daysLeft <= 30) next30++;
    }
    return { overdue, next7, next30, total: monthEvents.length };
  }, [monthEvents]);

  const selectedDayEvents = useMemo(
    () => monthEventsByDay.get(toDayKey(selectedDate)) ?? [],
    [monthEventsByDay, selectedDate],
  );

  const next14Events = useMemo(() => {
    const now = dayjs().startOf('day');
    const until = now.add(14, 'day').endOf('day');
    return allEvents
      .filter(
        (e) =>
          activeDocs[e.docKey] &&
          severityFilter(e) &&
          e.date.isSameOrAfter(now) &&
          e.date.isSameOrBefore(until),
      )
      .sort(
        (a, b) =>
          a.date.valueOf() - b.date.valueOf() ||
          a.car.placute.localeCompare(b.car.placute),
      );
  }, [allEvents, activeDocs, severity]);

  // ── UI handlers ────────────────────────────────────────────────────────────

  const toggleDoc = (key: CarDocKey) =>
    setActiveDocs((s) => ({ ...s, [key]: !s[key] }));

  const resetFilters = () => {
    setSearch('');
    setActiveDocs({ expItp: true, expRca: true, expRovi: true });
    setSeverity('all');
    setSelectedDate(dayjs());
  };

  const exportMonthCsv = () => {
    const rows = [
      ['Data', 'Plăcuțe', 'Doc', 'Zile rămase', 'Marcă', 'Model', 'An'],
      ...monthEvents
        .slice()
        .sort((a, b) => a.date.valueOf() - b.date.valueOf())
        .map((ev) => [
          ev.date.format('YYYY-MM-DD'),
          ev.car.placute ?? '',
          DOCS[ev.docKey].label,
          String(ev.daysLeft),
          ev.car.marca ?? '',
          ev.car.model ?? '',
          String(ev.car.an ?? ''),
        ]),
    ];
    downloadFile(
      `expirari_${selectedDate.format('YYYY_MM')}.csv`,
      'text/csv',
      toCsv(rows),
    );
  };

  const exportMonthIcs = () =>
    downloadFile(
      `expirari_${selectedDate.format('YYYY_MM')}.ics`,
      'text/calendar',
      toICS(monthEvents),
    );

  const exportNext14Ics = () =>
    downloadFile(
      `expirari_urmatoarele_14_zile_${dayjs().format('YYYY_MM_DD')}.ics`,
      'text/calendar',
      toICS(next14Events),
    );

  const handlePlateChipClick = (plate: string) => setSearch(plate);

  const goPrevMonth = () =>
    setSelectedDate(selectedDate.subtract(1, 'month').startOf('month'));
  const goNextMonth = () =>
    setSelectedDate(selectedDate.add(1, 'month').startOf('month'));
  const goToday = () => setSelectedDate(dayjs());

  // ── Custom calendar day (heat + dots + a11y) ──────────────────────────────

  function CarCalendarDay(props: PickersDayProps<Dayjs>) {
    const { day, outsideCurrentMonth } = props;
    const key = toDayKey(day);
    const events = monthEventsByDay.get(key) ?? [];
    const count = events.length;
    const hasOverdue = events.some((e) => e.daysLeft <= 0);

    // soft heat for busier days (3+)
    const heat =
      count >= 5 ? 0.18 : count === 4 ? 0.12 : count === 3 ? 0.08 : 0;

    const aria =
      count > 0
        ? `Zi cu ${count} evenimente: ${events
            .map(
              (e) =>
                `${e.car.placute} ${DOCS[e.docKey].label} ${
                  e.daysLeft <= 0 ? 'expirat' : `în ${e.daysLeft} zile`
                }`,
            )
            .join(', ')}`
        : 'Zi fără evenimente';

    return (
      <Box sx={{ position: 'relative' }}>
        <PickersDay
          {...props}
          outsideCurrentMonth={outsideCurrentMonth}
          aria-label={aria}
          sx={{
            bgcolor:
              heat > 0
                ? alpha(theme.palette.info.main, heat)
                : undefined,
            ...(hasOverdue && {
              outline: `2px solid ${theme.palette.error.main}`,
              outlineOffset: 2,
              borderRadius: '50%',
            }),
          }}
        />
        {count > 0 && (
          <Tooltip
            title={
              <Box>
                {events.map((e) => (
                  <Box
                    key={`${e.car.id}-${e.docKey}`}
                    sx={{ fontSize: 12, mb: 0.5 }}
                  >
                    <strong>{e.car.placute}</strong> — {DOCS[e.docKey].label}{' '}
                    <em>
                      ({e.daysLeft <= 0 ? 'expirat' : `${e.daysLeft} zile`})
                    </em>
                  </Box>
                ))}
              </Box>
            }
            arrow
            enterDelay={200}
          >
            <Box
              sx={{
                position: 'absolute',
                bottom: 4,
                left: 0,
                right: 0,
                display: 'flex',
                gap: 0.5,
                justifyContent: 'center',
                px: 0.5,
              }}
            >
              {events.slice(0, 6).map((e, i) => (
                <Box
                  key={`${e.car.id}-${e.docKey}-${i}`}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: theme.palette[e.color].main,
                  }}
                />
              ))}
              {events.length > 6 && (
                <Box sx={{ fontSize: 10, opacity: 0.8 }}>
                  +{events.length - 6}
                </Box>
              )}
            </Box>
          </Tooltip>
        )}
      </Box>
    );
  }

  // ── Agenda groups (for right panel) ────────────────────────────────────────

  const agendaByDay = useMemo(() => {
    const groups = new Map<string, EventItem[]>();
    for (const ev of monthEvents) {
      const k = toDayKey(ev.date);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(ev);
    }
    const ordered = Array.from(groups.entries()).sort(
      ([a], [b]) => dayjs(a).valueOf() - dayjs(b).valueOf(),
    );
    return ordered.map(([key, items]) => ({
      day: dayjs(key),
      items: items.sort(
        (a, b) => a.daysLeft - b.daysLeft || a.docKey.localeCompare(b.docKey),
      ),
    }));
  }, [monthEvents]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default', p: { xs: 1, md: 2 } }}>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        {/* Header / Controls */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography variant="h5">Expirări Documente Auto</Typography>
            <Chip label={selectedDate.format('MMMM YYYY')} size="small" />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <TextField
              label="Caută plăcuțe"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ maxWidth: 240 }}
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

            {/* Month navigator */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton size="small" onClick={goPrevMonth}>
                <ChevronLeftRoundedIcon />
              </IconButton>
              <Tooltip title="Astăzi">
                <IconButton size="small" onClick={goToday}>
                  <CalendarTodayOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={goNextMonth}>
                <ChevronRightRoundedIcon />
              </IconButton>
            </Stack>

            <Tooltip title="Resetează filtrele">
              <IconButton onClick={resetFilters} size="small">
                <RestartAltOutlinedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Exportă CSV (luna afișată)">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={exportMonthCsv}
                  disabled={loading || monthEvents.length === 0}
                >
                  CSV
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Exportă ICS (luna afișată)">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={exportMonthIcs}
                  disabled={loading || monthEvents.length === 0}
                >
                  ICS
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* KPI tiles that also filter by severity */}
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<EventBusyOutlinedIcon />}
            label={`Expirate: ${monthStats.overdue}`}
            color="error"
            variant={severity === 'overdue' ? 'filled' : 'outlined'}
            onClick={() => setSeverity('overdue')}
            size="small"
          />
          <Chip
            icon={<ScheduleOutlinedIcon />}
            label={`≤7 zile: ${monthStats.next7}`}
            color="warning"
            variant={severity === 'next7' ? 'filled' : 'outlined'}
            onClick={() => setSeverity('next7')}
            size="small"
          />
          <Chip
            icon={<AccessTimeOutlinedIcon />}
            label={`≤30 zile: ${monthStats.next30}`}
            color="info"
            variant={severity === 'next30' ? 'filled' : 'outlined'}
            onClick={() => setSeverity('next30')}
            size="small"
          />
          <Chip
            icon={<FilterAltOutlinedIcon />}
            label={`Toate (${monthStats.total})`}
            variant={severity === 'all' ? 'filled' : 'outlined'}
            onClick={() => setSeverity('all')}
            size="small"
          />

          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />

          {/* Doc-type toggles with icons & counts */}
          {(Object.keys(DOCS) as CarDocKey[]).map((k) => {
            const { label, color, Icon } = DOCS[k];
            const count = monthEvents.filter((e) => e.docKey === k).length;
            return (
              <Chip
                key={k}
                icon={<Icon />}
                label={`${label}${count ? ` (${count})` : ''}`}
                variant={activeDocs[k] ? 'filled' : 'outlined'}
                onClick={() => toggleDoc(k)}
                sx={(t) => ({
                  bgcolor: activeDocs[k] ? t.palette[color].main : 'transparent',
                  color: activeDocs[k] ? 'white' : 'inherit',
                  fontWeight: 600,
                })}
                size="small"
              />
            );
          })}
        </Stack>

        {/* Plates legend (click to filter) */}
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {legendPlates.map((l) => (
            <Chip
              key={l.placute}
              label={l.placute}
              onClick={() => handlePlateChipClick(l.placute)}
              sx={{ bgcolor: `${l.color}.main`, color: 'white', fontWeight: 600 }}
              size="small"
            />
          ))}
          {legendPlates.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nicio expirare în luna afișată (după filtrele curente).
            </Typography>
          )}
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <CircularProgress />
      ) : (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            {/* Left: calendar */}
            <Paper elevation={1} sx={{ p: 1, flex: 1, minWidth: 300 }}>
              <DateCalendar
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                slots={{ day: CarCalendarDay }}
                onMonthChange={(m) =>
                  setSelectedDate(selectedDate.year(m.year()).month(m.month()))
                }
              />
            </Paper>

            {/* Right: smart panel (Upcoming strip + Day details / Agenda) */}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                width: { xs: '100%', md: 460 },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxHeight: { md: '78vh' },
              }}
            >
              {/* Sticky header area */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}
              >
                <Typography variant="h6">
                  Panou —{' '}
                  <Badge
                    color="primary"
                    badgeContent={selectedDayEvents.length}
                    showZero
                  >
                    <span>{selectedDate.format('DD MMMM YYYY')}</span>
                  </Badge>
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={exportNext14Ics}
                    disabled={next14Events.length === 0}
                  >
                    ICS 14z
                  </Button>
                </Stack>
              </Stack>

              {/* Upcoming 14 days — horizontal, scrollable */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 0.5,
                  pr: 0.5,
                  '&::-webkit-scrollbar': { height: 6 },
                }}
              >
                {next14Events.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nimic în următoarele 14 zile (după filtrele curente).
                  </Typography>
                ) : (
                  next14Events.map((e) => (
                    <Chip
                      key={`${e.car.id}-${e.docKey}`}
                      label={`${e.date.format('DD.MM')} • ${e.car.placute} • ${DOCS[e.docKey].label}`}
                      onClick={() => setSelectedDate(e.date)}
                      sx={(t) => ({
                        bgcolor:
                          e.daysLeft <= 0
                            ? t.palette.error.main
                            : e.daysLeft <= 7
                            ? t.palette.warning.main
                            : t.palette.info.main,
                        color: 'white',
                        fontWeight: 700,
                      })}
                      size="small"
                    />
                  ))
                )}
              </Box>

              {/* Content area switches: Day details if any, else Agenda for month */}
              <Box sx={{ overflow: 'auto' }}>
                {selectedDayEvents.length > 0 ? (
                  <Stack spacing={1.25}>
                    {selectedDayEvents.map((ev) => (
                      <Stack
                        key={`${ev.car.id}-${ev.docKey}`}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: (t) => t.palette.action.hover,
                        }}
                      >
                        <Chip
                          label={DOCS[ev.docKey].label}
                          size="small"
                          sx={(t) => ({
                            bgcolor: t.palette[ev.color].main,
                            color: 'white',
                            fontWeight: 700,
                          })}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {ev.car.placute}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {ev.car.marca} {ev.car.model}{' '}
                          {ev.car.an ? `(${ev.car.an})` : ''}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography
                          variant="body2"
                          sx={(t) => ({
                            fontWeight: 700,
                            color:
                              ev.daysLeft <= 0
                                ? t.palette.error.main
                                : ev.daysLeft <= 7
                                ? t.palette.warning.main
                                : ev.daysLeft <= 30
                                ? t.palette.info.main
                                : t.palette.text.primary,
                          })}
                        >
                          {ev.daysLeft <= 0 ? 'EXPIRAT' : `${ev.daysLeft} zile`}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <EventNoteOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Agendă — {selectedDate.format('MMMM YYYY')}
                      </Typography>
                    </Stack>
                    {agendaByDay.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nicio expirare în luna afișată (după filtrele curente).
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {agendaByDay.map(({ day, items }) => (
                          <Box key={toDayKey(day)}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700, mb: 1 }}
                            >
                              {day.format('dddd, DD MMMM')}
                            </Typography>
                            <Stack spacing={1}>
                              {items.map((ev) => (
                                <Stack
                                  key={`${ev.car.id}-${ev.docKey}`}
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  sx={{
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: (t) => t.palette.action.hover,
                                  }}
                                >
                                  <Chip
                                    label={DOCS[ev.docKey].label}
                                    size="small"
                                    sx={(t) => ({
                                      bgcolor: t.palette[ev.color].main,
                                      color: 'white',
                                      fontWeight: 700,
                                    })}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {ev.car.placute}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {ev.car.marca} {ev.car.model}{' '}
                                    {ev.car.an ? `(${ev.car.an})` : ''}
                                  </Typography>
                                  <Box sx={{ flex: 1 }} />
                                  <Typography
                                    variant="body2"
                                    sx={(t) => ({
                                      fontWeight: 700,
                                      color:
                                        ev.daysLeft <= 0
                                          ? t.palette.error.main
                                          : ev.daysLeft <= 7
                                          ? t.palette.warning.main
                                          : ev.daysLeft <= 30
                                          ? t.palette.info.main
                                          : t.palette.text.primary,
                                    })}
                                  >
                                    {ev.daysLeft <= 0
                                      ? 'EXPIRAT'
                                      : `${ev.daysLeft} zile`}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          </Stack>
        </LocalizationProvider>
      )}
    </Box>
  );
}
