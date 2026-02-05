// backend/src/services/leaveCalculations.ts
import { PrismaClient, AccrualMethod, RoundingMethod, type LeavePolicy, type EmployeePolicyOverride } from '@prisma/client';

const prisma = new PrismaClient();

export interface TenureInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface LeaveBalance {
  // Core numbers
  annualEntitlement: number;      // Full year entitlement with seniority
  accrued: number;                 // Accrued to date (rounded)
  carriedOver: number;             // From previous year
  taken: number;                   // Used this year
  available: number;               // Accrued + carried - taken
  
  // Advanced
  canBorrow: boolean;              // Can go negative?
  effectiveBalance: number;        // Considering negative limit
  carriedOverExpiry: Date | null;  // When carryover expires
  
  // Breakdown
  companyShutdownDays: number;     // Forced shutdowns
  voluntaryDays: number;           // Employee-requested
  pendingDays: number;             // Awaiting approval
}

export interface EffectivePolicy {
  baseAnnualDays: number;
  seniorityStepYears: number;
  bonusPerStep: number;
  accrualMethod: AccrualMethod;
  roundingMethod: RoundingMethod;
  allowCarryover: boolean;
  maxCarryoverDays: number | null;
  carryoverExpiryMonth: number | null;
  carryoverExpiryDay: number | null;
  maxNegativeBalance: number;
  maxConsecutiveDays: number | null;
  minNoticeDays: number | null;
}

/**
 * Leap year utilities
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 0-indexed (0 = January, 1 = February, etc.)
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Safe date creation for Feb 29 edge cases
 * If Feb 29 doesn't exist in the year, use Feb 28
 */
export function createSafeDate(year: number, month: number, day: number): Date {
  // For February 29 in non-leap years, use February 28
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(year, month, 28);
  }
  
  // Handle other invalid dates (e.g., April 31)
  const maxDays = getDaysInMonth(year, month);
  const safeDay = Math.min(day, maxDays);
  
  return new Date(year, month, safeDay);
}

/**
 * Calculate tenure from hire date
 */
export function calculateTenure(hiredAt: Date, asOf: Date = new Date()): TenureInfo {
  const start = new Date(hiredAt);
  const end = new Date(asOf);
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  
  // Adjust for negative days
  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return { years, months, days, totalDays };
}

/**
 * Merge policy with employee override
 */
export function mergePolicy(
  policy: LeavePolicy,
  override?: EmployeePolicyOverride | null
): EffectivePolicy {
  return {
    baseAnnualDays: override?.baseAnnualDays ?? policy.baseAnnualDays,
    seniorityStepYears: override?.seniorityStepYears ?? policy.seniorityStepYears,
    bonusPerStep: override?.bonusPerStep ?? policy.bonusPerStep,
    accrualMethod: override?.accrualMethod ?? policy.accrualMethod,
    roundingMethod: override?.roundingMethod ?? policy.roundingMethod,
    allowCarryover: override?.allowCarryover ?? policy.allowCarryover,
    maxCarryoverDays: override?.maxCarryoverDays ?? policy.maxCarryoverDays,
    carryoverExpiryMonth: policy.carryoverExpiryMonth,
    carryoverExpiryDay: policy.carryoverExpiryDay,
    maxNegativeBalance: override?.maxNegativeBalance ?? policy.maxNegativeBalance,
    maxConsecutiveDays: override?.maxConsecutiveDays ?? policy.maxConsecutiveDays,
    minNoticeDays: policy.minNoticeDays,
  };
}

/**
 * Calculate annual entitlement with seniority bonus
 */
export function calculateAnnualEntitlement(
  hiredAt: Date,
  policy: EffectivePolicy,
  asOf: Date = new Date()
): number {
  const tenure = calculateTenure(hiredAt, asOf);
  const seniorityBonus = Math.floor(tenure.years / policy.seniorityStepYears) * policy.bonusPerStep;
  return policy.baseAnnualDays + seniorityBonus;
}

/**
 * Calculate accrued days based on accrual method (LEAP YEAR AWARE)
 */
export function calculateAccrued(
  hiredAt: Date,
  annualEntitlement: number,
  method: AccrualMethod,
  asOf: Date = new Date()
): number {
  const currentYear = asOf.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);
  
  // If hired before year start, use year start
  const startDate = hiredAt < yearStart ? yearStart : hiredAt;
  
  switch (method) {
    case 'DAILY': {
      // Accrue daily: (annualEntitlement / daysInYear) * days elapsed
      const daysInYear = getDaysInYear(currentYear); // 365 or 366 for leap years
      const daysElapsed = Math.floor((asOf.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return (annualEntitlement / daysInYear) * daysElapsed;
    }
    
    case 'MONTHLY': {
      // Accrue monthly: (annualEntitlement / 12) * months elapsed
      const monthsElapsed = (asOf.getFullYear() - startDate.getFullYear()) * 12 
                           + (asOf.getMonth() - startDate.getMonth()) + 1; // +1 to include current month
      return (annualEntitlement / 12) * monthsElapsed;
    }
    
    case 'AT_YEAR_START': {
      // Full entitlement on Jan 1
      return hiredAt < yearStart ? annualEntitlement : 0;
    }
    
    case 'PRO_RATA': {
      // Pro-rata based on days worked in the year (LEAP YEAR AWARE)
      // Formula: (annualEntitlement / daysInYear) * daysElapsed
      // This matches DAILY method - they should be identical
      const daysInYear = getDaysInYear(currentYear); // 365 or 366 for leap years
      const daysElapsed = Math.floor((asOf.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return (annualEntitlement / daysInYear) * daysElapsed;
    }
    
    default:
      return 0;
  }
}

/**
 * Apply rounding method
 */
export function applyRounding(value: number, method: RoundingMethod): number {
  switch (method) {
    case 'FLOOR':
      return Math.floor(value);
    case 'CEIL':
      return Math.ceil(value);
    case 'ROUND':
      return Math.round(value);
    default:
      return Math.floor(value);
  }
}

/**
 * Calculate carryover from previous year (LEAP YEAR AWARE)
 */
export async function calculateCarryover(
  employeeId: string,
  hiredAt: Date,
  currentYear: number,
  policy: EffectivePolicy
): Promise<number> {
  if (!policy.allowCarryover) return 0;
  
  // Get previous year balance
  const previousBalance = await getYearEndBalance(employeeId, hiredAt, currentYear - 1, policy);
  
  if (previousBalance <= 0) return 0;
  
  // No cap: carry over full remaining balance
  return previousBalance;
}

/**
 * Get year-end balance for a specific year
 */
async function getYearEndBalance(
  employeeId: string,
  hiredAt: Date,
  year: number,
  policy: EffectivePolicy
): Promise<number> {
  const yearEnd = new Date(year, 11, 31);

  // Not employed yet by year end
  if (hiredAt > yearEnd) return 0;

  const annualEntitlement = calculateAnnualEntitlement(hiredAt, policy, yearEnd);
  const accruedRaw = calculateAccrued(hiredAt, annualEntitlement, policy.accrualMethod, yearEnd);
  const accrued = applyRounding(accruedRaw, policy.roundingMethod);

  const taken = await getTakenDays(employeeId, year);
  const remaining = Math.max(0, accrued - taken.total);

  return remaining;
}

/**
 * Get taken days for current year
 */
export async function getTakenDays(employeeId: string, year: number = new Date().getFullYear()): Promise<{
  total: number;
  companyShutdown: number;
  voluntary: number;
  pending: number;
}> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  
  const leaves = await prisma.leave.findMany({
    where: {
      employeeId,
      startDate: { gte: yearStart, lt: yearEnd },
      status: { in: ['APPROVED', 'COMPLETED'] },
    },
  });
  
  const pending = await prisma.leave.findMany({
    where: {
      employeeId,
      startDate: { gte: yearStart, lt: yearEnd },
      status: 'PENDING',
    },
  });
  
  const total = leaves.reduce((sum, leave) => sum + leave.days, 0);
  const companyShutdown = leaves.filter(l => l.isCompanyShutdown).reduce((sum, l) => sum + l.days, 0);
  const voluntary = total - companyShutdown;
  const pendingDays = pending.reduce((sum, leave) => sum + leave.days, 0);
  
  return { total, companyShutdown, voluntary, pending: pendingDays };
}

/**
 * Calculate complete leave balance for an employee
 */
export async function calculateLeaveBalance(
  employeeId: string,
  hiredAt: Date,
  manualCarryOverDays?: number,
  asOf: Date = new Date()
): Promise<LeaveBalance> {
  // Get default company policy
  const policy = await prisma.leavePolicy.findFirst({
    where: { isCompanyDefault: true, active: true },
  });
  
  if (!policy) {
    throw new Error('No active company policy found');
  }
  
  // Get employee override if exists
  const override = await prisma.employeePolicyOverride.findUnique({
    where: { employeeId },
  });
  
  const effectivePolicy = mergePolicy(policy, override);
  
  // Calculate base entitlement with seniority
  const annualEntitlement = calculateAnnualEntitlement(hiredAt, effectivePolicy, asOf);
  
  // Calculate accrued
  const accruedRaw = calculateAccrued(hiredAt, annualEntitlement, effectivePolicy.accrualMethod, asOf);
  const accrued = applyRounding(accruedRaw, effectivePolicy.roundingMethod);
  
  // Get carryover
  const systemCarryover = await calculateCarryover(employeeId, hiredAt, asOf.getFullYear(), effectivePolicy);
  const hasManualOverride = manualCarryOverDays !== undefined && manualCarryOverDays !== null;
  const carriedOver = hasManualOverride ? manualCarryOverDays : systemCarryover;
  
  // Get taken days
  const taken = await getTakenDays(employeeId, asOf.getFullYear());
  
  // Calculate available
  const available = accrued + carriedOver - taken.total;
  
  // Check borrowing
  const canBorrow = available < 0 && Math.abs(available) <= effectivePolicy.maxNegativeBalance;
  const effectiveBalance = Math.max(available, -effectivePolicy.maxNegativeBalance);
  
  // Carryover expiry date
  let carriedOverExpiry: Date | null = null;
  if (effectivePolicy.carryoverExpiryMonth && effectivePolicy.carryoverExpiryDay) {
    carriedOverExpiry = new Date(
      asOf.getFullYear(),
      effectivePolicy.carryoverExpiryMonth - 1,
      effectivePolicy.carryoverExpiryDay
    );
  }
  
  return {
    annualEntitlement,
    accrued,
    carriedOver,
    taken: taken.total,
    available,
    canBorrow,
    effectiveBalance,
    carriedOverExpiry,
    companyShutdownDays: taken.companyShutdown,
    voluntaryDays: taken.voluntary,
    pendingDays: taken.pending,
  };
}

/**
 * Validate a leave request
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateLeaveRequest(
  employeeId: string,
  hiredAt: Date,
  startDate: Date,
  endDate: Date,
  requestedDays: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get policy
  const policy = await prisma.leavePolicy.findFirst({
    where: { isCompanyDefault: true, active: true },
    include: {
      blackoutPeriods: true,
      companyShutdowns: true,
    },
  });
  
  if (!policy) {
    return { valid: false, errors: ['No active policy found'], warnings: [] };
  }
  
  const override = await prisma.employeePolicyOverride.findUnique({
    where: { employeeId },
  });
  
  const effectivePolicy = mergePolicy(policy, override);
  
  // Check blackout periods
  const blackouts = policy.blackoutPeriods.filter(bp => 
    (startDate <= bp.endDate && endDate >= bp.startDate)
  );
  
  if (blackouts.length > 0) {
    const blocking = blackouts.filter(bp => !bp.allowExceptions);
    if (blocking.length > 0) {
      errors.push(`Leave overlaps with blackout period: ${blocking[0].reason}`);
    } else {
      warnings.push(`Leave overlaps with blackout period (exceptions allowed): ${blackouts[0].reason}`);
    }
  }
  
  // Check company shutdowns
  const shutdowns = policy.companyShutdowns.filter(cs =>
    (startDate <= cs.endDate && endDate >= cs.startDate)
  );
  
  if (shutdowns.length > 0) {
    warnings.push(`Company shutdown during period: ${shutdowns[0].reason}`);
  }
  
  // Check max consecutive days
  if (effectivePolicy.maxConsecutiveDays && requestedDays > effectivePolicy.maxConsecutiveDays) {
    errors.push(`Maximum ${effectivePolicy.maxConsecutiveDays} consecutive days allowed`);
  }
  
  // Check minimum notice
  if (effectivePolicy.minNoticeDays) {
    const daysUntil = Math.floor((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < effectivePolicy.minNoticeDays) {
      errors.push(`Minimum ${effectivePolicy.minNoticeDays} days notice required`);
    }
  }
  
  // Check balance
  const balance = await calculateLeaveBalance(employeeId, hiredAt);
  if (requestedDays > balance.effectiveBalance) {
    if (balance.canBorrow) {
      warnings.push(`This will result in negative balance: ${balance.effectiveBalance - requestedDays} days`);
    } else {
      errors.push(`Insufficient balance: ${balance.effectiveBalance} days available, ${requestedDays} requested`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
