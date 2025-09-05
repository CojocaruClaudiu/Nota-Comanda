// src/pages/calendar/HolidayCalendarPage.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import FullCalendar, { type EventInput, type DatesSetArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import roLocale from '@fullcalendar/core/locales/ro';
import {
  Box, Paper, Stack, Typography, CircularProgress, Alert, Chip, Divider,
  TextField, Button, Avatar, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import { getEmployees, getLeaves, type EmployeeWithStats, type Leave } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';

dayjs.locale('ro');

/* ---------- helpers ---------- */

// format YYYY-MM-DD
const iso = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
const addDays = (isoStr: string, n: number) => dayjs(isoStr).add(n, 'day').format('YYYY-MM-DD');

const isWeekend = (d: dayjs.Dayjs) => {
  const dow = d.day(); // 0=Sun … 6=Sat
  return dow === 0 || dow === 6;
};

/**
 * Split a (start, businessDays) interval into weekday-only segments,
 * each segment not crossing a weekend. Returns [{start, endExclusive}, ...].
 */
const splitIntoWeekdaySegments = (startISO: string, businessDays: number) => {
  const segments: Array<{ start: string; end: string }> = [];
  if (!businessDays || businessDays <= 0) return segments;

  let cursor = dayjs(startISO).startOf('day');

  // skip if start on weekend
  while (isWeekend(cursor)) cursor = cursor.add(1, 'day');

  while (businessDays > 0) {
    // number of weekdays remaining in current week (Fri included)
    const dow = cursor.day(); // 1..5 are Mon..Fri
    const weekdaysLeftInWeek = Math.max(1, 5 - (dow === 0 ? 7 : dow) + 1); // for Mon=1 ->5, Fri=5 ->1

    const take = Math.min(businessDays, weekdaysLeftInWeek);

    const segStart = cursor;
    const segEndExclusive = cursor.add(take, 'day'); // FullCalendar uses exclusive end
    segments.push({ start: iso(segStart), end: iso(segEndExclusive) });

    businessDays -= take;
    cursor = segEndExclusive;

    // jump over weekend to Monday
    if (cursor.day() === 6) cursor = cursor.add(2, 'day'); // landed on Sat -> to Mon
    if (cursor.day() === 0) cursor = cursor.add(1, 'day'); // landed on Sun -> to Mon
  }

  return segments;
};

// deterministic vibrant color per employee
const colorFromString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 45%)`;
};

const getInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const LS_KEY = 'holidayCalendar.selectedEmployeeIds';

/* ---------- component ---------- */

export default function HolidayCalendarPage() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [allEvents, setAllEvents] = useState<EventInput[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { errorNotistack } = useNotistack();
  const calendarRef = useRef<FullCalendar | null>(null);

  // current view range (for visible counters)
  const [viewStart, setViewStart] = useState<Date | null>(null);
  const [viewEnd, setViewEnd] = useState<Date | null>(null); // exclusive

  // restore persisted selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSelected(JSON.parse(raw));
    } catch {}
  }, []);
  // persist selection
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(selected));
    } catch {}
  }, [selected]);

  const filteredEmployees = useMemo(() => {
    const q = stripDiacritics(query.toLowerCase());
    return employees.filter(e => stripDiacritics(e.name.toLowerCase()).includes(q));
  }, [employees, query]);

  const legend = useMemo(
    () => employees.map(e => ({ id: e.id, name: e.name, color: colorFromString(e.id) })),
    [employees]
  );

  const filteredEvents = useMemo(() => {
    if (selected.length === 0) return [];
    const selectedSet = new Set(selected);
    return allEvents.filter(ev => selectedSet.has((ev.extendedProps as any)?.employeeId));
  }, [allEvents, selected]);

  // visible events in current calendar range
  const visibleEvents = useMemo(() => {
    if (!viewStart || !viewEnd) return filteredEvents;
    const start = viewStart.getTime();
    const end = viewEnd.getTime(); // exclusive
    return filteredEvents.filter(ev => {
      const evStart = ev.start ? new Date(ev.start as string).getTime() : 0;
      const evEnd = ev.end ? new Date(ev.end as string).getTime() : evStart;
      return evStart < end && evEnd > start;
    });
  }, [filteredEvents, viewStart, viewEnd]);

  const toggleEmployee = (id: string, only = false) =>
    setSelected(prev => (only ? [id] : (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])));

  const selectAll = () => setSelected(employees.map(e => e.id));
  const clearAll = () => setSelected([]);
  const invert = () => {
    const set = new Set(selected);
    setSelected(employees.map(e => e.id).filter(id => !set.has(id)));
  };

  const onDatesSet = (arg: DatesSetArg) => {
    setViewStart(arg.start);
    setViewEnd(arg.end);
  };

  const firstLoadRef = useRef(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const emps = await getEmployees();
      setEmployees(emps);
      if (firstLoadRef.current && !selected.length) {
        setSelected(emps.map(e => e.id)); // default: all
        firstLoadRef.current = false;
      }

      // Build events: split each leave into weekday-only segments
      const leavesPerEmp = await Promise.all(
        emps.map(async e => {
          const leaves: Leave[] = await getLeaves(e.id);
          const color = colorFromString(e.id);

          const eventsForEmp: EventInput[] = [];
          for (const lv of leaves) {
            // If your backend ever stores endDate, you could use it to double-check,
            // but we trust (startDate, days) and split by weekdays here:
            const segments = splitIntoWeekdaySegments(lv.startDate, lv.days || 0);
            for (const seg of segments) {
              eventsForEmp.push({
                id: `${lv.id}__${seg.start}`,
                title: e.name,
                start: seg.start,
                end: seg.end, // exclusive
                display: 'block',
                backgroundColor: color,
                borderColor: color,
                classNames: ['vacation-pill'],
                extendedProps: { note: lv.note, employee: e.name, employeeId: e.id },
              } as EventInput);
            }
          }
          return eventsForEmp;
        })
      );

      setAllEvents(leavesPerEmp.flat());
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut încărca calendarul concediilor';
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack, selected.length]);

  useEffect(() => { void load(); }, [load]);

  const gotoToday = () => calendarRef.current?.getApi().today();
  const changeView = (view: 'dayGridMonth' | 'dayGridWeek') =>
    calendarRef.current?.getApi().changeView(view);
  const gotoDate = (d: dayjs.Dayjs | null) => {
    if (d && d.isValid()) calendarRef.current?.getApi().gotoDate(d.toDate());
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'background.default' }}>
      <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Top toolbar */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Typography variant="h5">Calendar concedii</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <DatePicker label="Sari la dată" format="DD/MM/YYYY" onChange={gotoDate} slotProps={{ textField: { size: 'small' } }} />
            <Button size="small" variant="outlined" onClick={() => changeView('dayGridMonth')}>Lună</Button>
            <Button size="small" variant="outlined" onClick={() => changeView('dayGridWeek')}>Săptămână</Button>
            <Button size="small" variant="contained" onClick={gotoToday}>Astăzi</Button>
            <Button size="small" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Reîncarcă'}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <TextField
            size="small"
            placeholder="Caută angajat..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            sx={{ maxWidth: 320 }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" onClick={selectAll}>Toți</Button>
            <Button size="small" onClick={clearAll}>Niciunul</Button>
            <Button size="small" onClick={invert}>Inversează</Button>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Selectați: {selected.length}/{employees.length} · Vizibile: {visibleEvents.length}
            </Typography>
          </Stack>
        </Stack>

        {/* Legend (filters) */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {legend
            .filter(l => filteredEmployees.find(e => e.id === l.id))
            .map(l => {
              const isOn = selected.includes(l.id);
              return (
                <Tooltip key={l.id} title={isOn ? 'Click: ascunde · Alt+Click: doar acesta' : 'Click: arată · Alt+Click: doar acesta'}>
                  <Chip
                    icon={<Avatar sx={{ bgcolor: l.color, width: 18, height: 18, fontSize: 10 }}>{getInitials(l.name)}</Avatar>}
                    label={l.name}
                    size="small"
                    onClick={(ev) => toggleEmployee(l.id, (ev as any).altKey)}
                    sx={{
                      bgcolor: isOn ? l.color : 'transparent',
                      color: isOn ? 'white' : 'text.primary',
                      border: `1px solid ${l.color}`,
                      '&:hover': { opacity: 0.9 },
                    }}
                    variant={isOn ? 'filled' : 'outlined'}
                  />
                </Tooltip>
              );
            })}
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Calendar */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            '& .fc .fc-daygrid-event': {
              borderRadius: 1.25,
              fontSize: 12,
              padding: '2px 6px',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.06) inset',
            },
            // Weekend tint
            '& .fc .fc-day-sat .fc-daygrid-day-frame, & .fc .fc-day-sun .fc-daygrid-day-frame': {
              backgroundColor: 'rgba(0,0,0,0.035)',
            },
            // Today highlight
            '& .fc .fc-day-today': {
              backgroundColor: 'rgba(25,118,210,0.10)',
            },
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="100%"
            locale={roLocale}
            firstDay={1}
            headerToolbar={{ left: 'prev,next', center: 'title', right: '' }} // custom buttons above
            events={visibleEvents}
            dayMaxEvents={3}
            eventOverlap
            eventOrder="title,start"
            datesSet={onDatesSet}
            eventContent={(arg) => {
              const note = arg.event.extendedProps['note'] as string | undefined;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, lineHeight: 1 }}>{arg.event.title}</span>
                  {note ? (
                    <span
                      title={note}
                      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 9999, background: 'currentColor', opacity: 0.85 }}
                    />
                  ) : null}
                </div>
              );
            }}
            eventDidMount={(info) => {
              const note = info.event.extendedProps['note'];
              const name = info.event.extendedProps['employee'] || info.event.title;
              const start = dayjs(info.event.start!).format('DD/MM/YYYY');
              const end = dayjs(info.event.end!).subtract(1, 'day').format('DD/MM/YYYY'); // exclusive -> inclusive
              const tooltip = `${name}: ${start} – ${end}${note ? `\n${note}` : ''}`;
              info.el.setAttribute('title', tooltip);
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
