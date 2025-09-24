// utils/businessDays.ts
import dayjs from "dayjs";

/** Optional: add your public holidays (YYYY-MM-DD) here */
const HOLIDAYS = new Set<string>([
  // "2025-01-01", "2025-01-02", ...
]);

const isWeekend = (d: dayjs.Dayjs) => d.day() === 0 || d.day() === 6; // Sun/Sat
const isHoliday = (d: dayjs.Dayjs) => HOLIDAYS.has(d.format("YYYY-MM-DD"));

/** List of business dates starting at startISO, length = days (skips Sat/Sun/HOLIDAYS) */
export function businessDatesForLeave(startISO: string, days: number): string[] {
  const out: string[] = [];
  let d = dayjs(startISO).startOf("day");
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    if (!isWeekend(d) && !isHoliday(d)) {
      out.push(d.format("YYYY-MM-DD"));
      left -= 1;
    }
    d = d.add(1, "day");
  }
  return out;
}

/** End date (inclusive) for a business-leave of N days starting startISO */
export function businessEndDate(startISO: string, days: number): string | null {
  if (!startISO || !days) return null;
  const dates = businessDatesForLeave(startISO, days);
  return dates.length ? dates[dates.length - 1] : null;
}

/** Sum business leave days that fall within a given year */
export function sumBusinessDaysForYear(
  history: { startDate: string; days: number }[],
  year: number
): number {
  return history.reduce((acc, h) => {
    if (!h.startDate || !h.days) return acc;
    const dates = businessDatesForLeave(h.startDate, h.days);
    return acc + dates.filter((d) => dayjs(d).year() === year).length;
  }, 0);
}
