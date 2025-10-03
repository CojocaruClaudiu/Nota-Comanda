// src/modules/team/hooks/useHolidayCalculations.ts
import { useMemo } from 'react';
import dayjs from 'dayjs';

/** ───────────────── Policy Configuration ───────────────── **/
export const HOLIDAY_POLICY = {
  BASE_ANNUAL: 21,              // base days per year
  BONUS_EVERY_YEARS: 5,         // +1 day every 5 full years
  BONUS_PER_STEP: 1,            // bonus days per step
  PRO_RATA_ROUND: Math.floor,   // conservative rounding
} as const;

/** ───────────────── Calculation Functions ───────────────── **/

/**
 * Calculate annual entitlement at year end based on tenure
 */
export const annualEntitlementAtYearEnd = (hiredAt?: string | null, year?: number): number => {
  if (!hiredAt) return HOLIDAY_POLICY.BASE_ANNUAL;
  const ref = dayjs(`${year ?? dayjs().year()}-12-31`);
  const years = ref.diff(dayjs(hiredAt), 'year');
  const bonusSteps = Math.floor(years / HOLIDAY_POLICY.BONUS_EVERY_YEARS);
  return HOLIDAY_POLICY.BASE_ANNUAL + bonusSteps * HOLIDAY_POLICY.BONUS_PER_STEP;
};

/**
 * Calculate pro-rated entitlement for a specific year
 */
export const proRataForYear = (hiredAt?: string | null, year?: number): number => {
  const y = year ?? dayjs().year();
  if (!hiredAt) return annualEntitlementAtYearEnd(hiredAt, y);

  const hire = dayjs(hiredAt);
  if (!hire.isValid()) return annualEntitlementAtYearEnd(hiredAt, y);

  const yStart = dayjs(`${y}-01-01`);
  const yEnd = dayjs(`${y}-12-31`);
  const totalDaysInYear = yEnd.diff(yStart, 'day') + 1;

  // Hired before the year starts ⇒ full entitlement for that year
  if (hire.isBefore(yStart, 'day')) return annualEntitlementAtYearEnd(hiredAt, y);

  // Hired during the year ⇒ pro-rata from hire → year end
  const daysEmployedThisYear = yEnd.diff(hire, 'day') + 1;
  const annual = annualEntitlementAtYearEnd(hiredAt, y);
  return HOLIDAY_POLICY.PRO_RATA_ROUND((annual * daysEmployedThisYear) / totalDaysInYear);
};

/**
 * Calculate accrued days up to today
 */
export const accruedToToday = (hiredAt?: string | null): number => {
  if (!hiredAt) return 0;
  const hire = dayjs(hiredAt);
  if (!hire.isValid()) return 0;

  const now = dayjs();
  const y = now.year();
  const yStart = dayjs(`${y}-01-01`);
  const yEnd = dayjs(`${y}-12-31`);

  const from = hire.isBefore(yStart, 'day') ? yStart : hire;
  const denom = hire.isBefore(yStart, 'day')
    ? yEnd.diff(yStart, 'day') + 1
    : yEnd.diff(hire, 'day') + 1;

  const daysSoFar = now.diff(from, 'day') + 1;
  const yearEnt = proRataForYear(hiredAt, y);
  return HOLIDAY_POLICY.PRO_RATA_ROUND((yearEnt * daysSoFar) / denom);
};

/**
 * Calculate remaining days (accrued - taken)
 */
export const remainingDays = (hiredAt?: string | null, takenDays: number = 0): number => {
  return Math.max(0, accruedToToday(hiredAt) - takenDays);
};

/** ───────────────── Hook ───────────────── **/

export interface HolidayStats {
  annualEntitlement: number;      // Full year entitlement at year end
  yearEntitlement: number;         // Pro-rated for current year
  accruedToday: number;            // Accrued up to today
  takenDays: number;               // Days used this year
  remainingToday: number;          // Remaining accrued days
  remainingYear: number;           // Remaining year entitlement
}

export const useHolidayCalculations = (
  hiredAt?: string | null,
  takenDays: number = 0,
  year?: number
): HolidayStats => {
  return useMemo(() => {
    const currentYear = year ?? dayjs().year();
    const annual = annualEntitlementAtYearEnd(hiredAt, currentYear);
    const yearEnt = proRataForYear(hiredAt, currentYear);
    const accrued = accruedToToday(hiredAt);
    const used = Number(takenDays || 0);
    const remainToday = Math.max(0, accrued - used);
    const remainYear = Math.max(0, yearEnt - used);

    return {
      annualEntitlement: annual,
      yearEntitlement: yearEnt,
      accruedToday: accrued,
      takenDays: used,
      remainingToday: remainToday,
      remainingYear: remainYear,
    };
  }, [hiredAt, takenDays, year]);
};
