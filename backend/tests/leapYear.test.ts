// backend/tests/leapYear.test.ts - Leap Year Edge Case Tests
import { describe, it, expect } from '@jest/globals';
import { 
  isLeapYear, 
  getDaysInYear, 
  getDaysInMonth,
  createSafeDate,
  calculateAccrued,
  calculateTenure
} from '../src/services/leaveCalculations';
import { AccrualMethod } from '@prisma/client';

describe('Leap Year Detection', () => {
  it('should correctly identify leap years', () => {
    // Divisible by 4
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2020)).toBe(true);
    expect(isLeapYear(2028)).toBe(true);
    
    // Not divisible by 4
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
  });

  it('should handle century edge cases', () => {
    // Divisible by 100 but not 400 (NOT leap years)
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
    
    // Divisible by 400 (leap years)
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2400)).toBe(true);
  });

  it('should return correct days in year', () => {
    expect(getDaysInYear(2024)).toBe(366); // Leap
    expect(getDaysInYear(2025)).toBe(365); // Normal
    expect(getDaysInYear(2000)).toBe(366); // Leap (divisible by 400)
    expect(getDaysInYear(1900)).toBe(365); // Normal (divisible by 100, not 400)
  });
});

describe('Days in Month Calculations', () => {
  it('should return correct days for February in leap years', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29); // Feb in leap year
    expect(getDaysInMonth(2025, 1)).toBe(28); // Feb in normal year
  });

  it('should return correct days for other months', () => {
    expect(getDaysInMonth(2024, 0)).toBe(31);  // January
    expect(getDaysInMonth(2024, 2)).toBe(31);  // March
    expect(getDaysInMonth(2024, 3)).toBe(30);  // April
    expect(getDaysInMonth(2024, 4)).toBe(31);  // May
    expect(getDaysInMonth(2024, 5)).toBe(30);  // June
    expect(getDaysInMonth(2024, 6)).toBe(31);  // July
    expect(getDaysInMonth(2024, 7)).toBe(31);  // August
    expect(getDaysInMonth(2024, 8)).toBe(30);  // September
    expect(getDaysInMonth(2024, 9)).toBe(31);  // October
    expect(getDaysInMonth(2024, 10)).toBe(30); // November
    expect(getDaysInMonth(2024, 11)).toBe(31); // December
  });
});

describe('Safe Date Creation (Feb 29 Edge Cases)', () => {
  it('should create Feb 29 in leap years', () => {
    const date = createSafeDate(2024, 1, 29);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(1); // February (0-indexed)
    expect(date.getDate()).toBe(29);
  });

  it('should convert Feb 29 to Feb 28 in non-leap years', () => {
    const date = createSafeDate(2025, 1, 29);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(1); // February
    expect(date.getDate()).toBe(28); // Converted to 28
  });

  it('should handle other invalid dates', () => {
    // April 31 doesn't exist (April has 30 days)
    const date = createSafeDate(2024, 3, 31);
    expect(date.getDate()).toBe(30); // Converted to April 30
  });

  it('should handle valid dates normally', () => {
    const date = createSafeDate(2024, 2, 15); // March 15
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(15);
  });
});

describe('Pro-Rata Accrual in Leap vs Non-Leap Years', () => {
  it('should calculate pro-rata correctly in leap year', () => {
    const hiredAt = new Date(2024, 0, 1); // Jan 1, 2024 (leap year)
    const asOf = new Date(2024, 11, 31);  // Dec 31, 2024
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      asOf
    );
    
    // Full year in leap year: should accrue full entitlement
    expect(accrued).toBeCloseTo(21, 1);
  });

  it('should calculate pro-rata correctly in non-leap year', () => {
    const hiredAt = new Date(2025, 0, 1); // Jan 1, 2025 (non-leap year)
    const asOf = new Date(2025, 11, 31);  // Dec 31, 2025
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      asOf
    );
    
    // Full year in non-leap year: should accrue full entitlement
    expect(accrued).toBeCloseTo(21, 1);
  });

  it('should calculate mid-year accrual correctly in leap year', () => {
    const hiredAt = new Date(2024, 0, 1);  // Jan 1, 2024
    const asOf = new Date(2024, 6, 1);     // July 1, 2024 (183 days in leap year)
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      asOf
    );
    
    // Half year in leap year: ~10.5 days
    expect(accrued).toBeGreaterThan(10);
    expect(accrued).toBeLessThan(11);
  });

  it('should calculate mid-year accrual correctly in non-leap year', () => {
    const hiredAt = new Date(2025, 0, 1);  // Jan 1, 2025
    const asOf = new Date(2025, 6, 1);     // July 1, 2025 (182 days in normal year)
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      asOf
    );
    
    // Half year in non-leap year: ~10.5 days
    expect(accrued).toBeGreaterThan(10);
    expect(accrued).toBeLessThan(11);
  });
});

describe('DAILY Accrual Method in Leap Years', () => {
  it('should use 366 days for leap year', () => {
    const hiredAt = new Date(2024, 0, 1);  // Jan 1, 2024 (leap year)
    const asOf = new Date(2024, 1, 29);    // Feb 29, 2024 (60 days)
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'DAILY' as AccrualMethod,
      asOf
    );
    
    // (21 / 366) × 60 ≈ 3.44 days
    expect(accrued).toBeCloseTo(3.44, 1);
  });

  it('should use 365 days for non-leap year', () => {
    const hiredAt = new Date(2025, 0, 1);  // Jan 1, 2025 (non-leap year)
    const asOf = new Date(2025, 1, 28);    // Feb 28, 2025 (59 days)
    const annualEntitlement = 21;
    
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'DAILY' as AccrualMethod,
      asOf
    );
    
    // (21 / 365) × 59 ≈ 3.40 days
    expect(accrued).toBeCloseTo(3.40, 1);
  });
});

describe('Tenure Calculation with Feb 29 Hire Date', () => {
  it('should calculate correct tenure for Feb 29 hire date after 1 year', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2025, 2, 1);      // March 1, 2025
    
    const tenure = calculateTenure(hiredAt, asOf);
    
    // 1 year, 0 months, 1 day (Feb 29, 2024 → Mar 1, 2025)
    expect(tenure.years).toBe(1);
    expect(tenure.months).toBe(0);
    expect(tenure.days).toBe(1);
    expect(tenure.totalDays).toBe(366); // Includes the leap day
  });

  it('should calculate correct tenure for Feb 29 hire date on next leap year', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2028, 1, 29);     // Feb 29, 2028 (next leap year)
    
    const tenure = calculateTenure(hiredAt, asOf);
    
    // Exactly 4 years
    expect(tenure.years).toBe(4);
    expect(tenure.months).toBe(0);
    expect(tenure.days).toBe(0);
  });

  it('should calculate tenure on Feb 28 for non-leap years', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2025, 1, 28);     // Feb 28, 2025
    
    const tenure = calculateTenure(hiredAt, asOf);
    
    // 11 months, 30 days (almost 1 year)
    expect(tenure.years).toBe(0);
    expect(tenure.months).toBe(11);
    expect(tenure.days).toBe(30);
  });
});

describe('Comparative Fairness Tests', () => {
  it('should give similar accrual for employees hired same day in different years', () => {
    const annualEntitlement = 21;
    
    // Employee A: Hired Jan 1, 2024 (leap year)
    const accruedA = calculateAccrued(
      new Date(2024, 0, 1),
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      new Date(2024, 9, 2) // Oct 3, 2024 (277 days)
    );
    
    // Employee B: Hired Jan 1, 2025 (non-leap year)
    const accruedB = calculateAccrued(
      new Date(2025, 0, 1),
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      new Date(2025, 9, 2) // Oct 3, 2025 (276 days)
    );
    
    // Both should have very similar accrual (~15.9 days)
    expect(Math.abs(accruedA - accruedB)).toBeLessThan(0.1);
  });

  it('should give full entitlement by year end regardless of leap year', () => {
    const annualEntitlement = 21;
    
    // Leap year
    const accruedLeap = calculateAccrued(
      new Date(2024, 0, 1),
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      new Date(2024, 11, 31)
    );
    
    // Non-leap year
    const accruedNormal = calculateAccrued(
      new Date(2025, 0, 1),
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      new Date(2025, 11, 31)
    );
    
    // Both should accrue full entitlement
    expect(accruedLeap).toBeCloseTo(21, 1);
    expect(accruedNormal).toBeCloseTo(21, 1);
  });
});

describe('Real-World Scenarios', () => {
  it('Scenario: Maria hired Feb 29, 2024, check balance Oct 3, 2024', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2024, 9, 2);      // Oct 3, 2024
    const annualEntitlement = 21;
    
    // Pro-rata from Feb 29 to Oct 3
    const accrued = calculateAccrued(
      hiredAt,
      annualEntitlement,
      'PRO_RATA' as AccrualMethod,
      asOf
    );
    
    // ~217 days from Feb 29 to Oct 3 out of ~306 days total (Feb 29 - Dec 31)
    // Should have accrued ~15 days
    expect(accrued).toBeGreaterThan(14);
    expect(accrued).toBeLessThan(16);
  });

  it('Scenario: Carryover expires Feb 29 in 2025 (converts to Feb 28)', () => {
    // This is tested via createSafeDate
    const expiryDate = createSafeDate(2025, 1, 29);
    
    expect(expiryDate.getMonth()).toBe(1);   // February
    expect(expiryDate.getDate()).toBe(28);   // Converted to 28
    expect(expiryDate.getFullYear()).toBe(2025);
  });

  it('Scenario: Compare accrual rate between leap and non-leap year', () => {
    const annualEntitlement = 21;
    
    // Daily rate in leap year
    const dailyRateLeap = annualEntitlement / getDaysInYear(2024);
    expect(dailyRateLeap).toBeCloseTo(0.0574, 4);
    
    // Daily rate in non-leap year
    const dailyRateNormal = annualEntitlement / getDaysInYear(2025);
    expect(dailyRateNormal).toBeCloseTo(0.0575, 4);
    
    // Difference should be minimal
    expect(Math.abs(dailyRateLeap - dailyRateNormal)).toBeLessThan(0.0001);
  });
});

describe('Edge Case Coverage', () => {
  it('should handle employee hired on Feb 29 requesting leave on Feb 28 next year', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2025, 1, 28);     // Feb 28, 2025
    
    const tenure = calculateTenure(hiredAt, asOf);
    
    // Almost 1 year
    expect(tenure.years).toBe(0);
    expect(tenure.months).toBe(11);
  });

  it('should handle multi-year tenure across leap years', () => {
    const hiredAt = new Date(2024, 1, 29);  // Feb 29, 2024
    const asOf = new Date(2029, 1, 28);     // Feb 28, 2029 (5 years later)
    
    const tenure = calculateTenure(hiredAt, asOf);
    
    // Should be close to 5 years
    expect(tenure.years).toBeGreaterThanOrEqual(4);
    expect(tenure.totalDays).toBeGreaterThan(1800); // ~5 years worth
  });

  it('should handle invalid dates gracefully', () => {
    // Trying to create Feb 30 (doesn't exist)
    const date = createSafeDate(2024, 1, 30);
    expect(date.getDate()).toBe(29); // Max in Feb 2024 (leap year)
    
    const date2 = createSafeDate(2025, 1, 30);
    expect(date2.getDate()).toBe(28); // Max in Feb 2025 (non-leap)
  });
});
