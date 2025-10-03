// src/modules/team/hooks/useTenure.ts
import { useMemo } from 'react';
import dayjs from 'dayjs';

export interface TenureParts {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/**
 * Calculate tenure parts from hire date
 */
export const calculateTenure = (hiredAt?: string | Date | null): TenureParts | null => {
  if (!hiredAt) return null;
  
  let start = dayjs(hiredAt).startOf('day');
  if (!start.isValid()) return null;
  
  const now = dayjs().startOf('day');
  const totalDays = now.diff(start, 'day');

  const years = now.diff(start, 'year');
  start = start.add(years, 'year');
  
  const months = now.diff(start, 'month');
  start = start.add(months, 'month');
  
  const days = now.diff(start, 'day');

  return { years, months, days, totalDays };
};

/**
 * Format tenure in Romanian
 */
export const formatTenureRo = (tenure: TenureParts | null): string => {
  if (!tenure) return '—';
  
  const parts: string[] = [];
  
  if (tenure.years) {
    parts.push(`${tenure.years} ${tenure.years === 1 ? 'an' : 'ani'}`);
  }
  
  if (tenure.months) {
    parts.push(`${tenure.months} ${tenure.months === 1 ? 'lună' : 'luni'}`);
  }
  
  if (parts.length === 0 || tenure.days) {
    parts.push(`${tenure.days} ${tenure.days === 1 ? 'zi' : 'zile'}`);
  }

  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} și ${parts[1]}`;
  
  return `${parts.slice(0, -1).join(', ')} și ${parts[parts.length - 1]}`;
};

/**
 * Hook to calculate and format tenure
 */
export const useTenure = (hiredAt?: string | Date | null) => {
  return useMemo(() => {
    const tenure = calculateTenure(hiredAt);
    return {
      tenure,
      formatted: formatTenureRo(tenure),
      totalDays: tenure?.totalDays ?? 0,
    };
  }, [hiredAt]);
};
