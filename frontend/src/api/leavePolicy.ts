// src/api/leavePolicy.ts
import { API_BASE_URL } from './baseUrl';

const API_URL = API_BASE_URL;

export type AccrualMethod = 'DAILY' | 'MONTHLY' | 'AT_YEAR_START' | 'PRO_RATA';
export type RoundingMethod = 'FLOOR' | 'CEIL' | 'ROUND';

export interface LeavePolicy {
  id: string;
  name: string;
  isCompanyDefault: boolean;
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
  active: boolean;
  createdAt: string;
  updatedAt: string;
  blackoutPeriods?: BlackoutPeriod[];
  companyShutdowns?: CompanyShutdown[];
}

export interface BlackoutPeriod {
  id: string;
  policyId: string;
  startDate: string;
  endDate: string;
  reason: string;
  allowExceptions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyShutdown {
  id: string;
  policyId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  deductFromAllowance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicyUpdatePayload {
  name?: string;
  baseAnnualDays?: number;
  seniorityStepYears?: number;
  bonusPerStep?: number;
  accrualMethod?: AccrualMethod;
  roundingMethod?: RoundingMethod;
  allowCarryover?: boolean;
  maxCarryoverDays?: number | null;
  carryoverExpiryMonth?: number | null;
  carryoverExpiryDay?: number | null;
  maxNegativeBalance?: number;
  maxConsecutiveDays?: number | null;
  minNoticeDays?: number | null;
}

export interface BlackoutPeriodPayload {
  startDate: string;
  endDate: string;
  reason: string;
  allowExceptions?: boolean;
}

export interface CompanyShutdownPayload {
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  deductFromAllowance?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    try {
      const j = JSON.parse(text || '{}');
      throw new Error(j.error || j.message || text || res.statusText);
    } catch {
      throw new Error(text || res.statusText);
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Leave Policy
export const getLeavePolicy = () => 
  request<LeavePolicy>('/leave-policy');

export const updateLeavePolicy = (id: string, data: LeavePolicyUpdatePayload) =>
  request<LeavePolicy>(`/leave-policy/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// Blackout Periods
export const createBlackoutPeriod = (policyId: string, data: BlackoutPeriodPayload) =>
  request<BlackoutPeriod>(`/leave-policy/${policyId}/blackout-periods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateBlackoutPeriod = (id: string, data: Partial<BlackoutPeriodPayload>) =>
  request<BlackoutPeriod>(`/blackout-periods/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteBlackoutPeriod = (id: string) =>
  request<void>(`/blackout-periods/${id}`, { method: 'DELETE' });

// Company Shutdowns
export const createCompanyShutdown = (policyId: string, data: CompanyShutdownPayload) =>
  request<CompanyShutdown>(`/leave-policy/${policyId}/company-shutdowns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateCompanyShutdown = (id: string, data: Partial<CompanyShutdownPayload>) =>
  request<CompanyShutdown>(`/company-shutdowns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteCompanyShutdown = (id: string) =>
  request<void>(`/company-shutdowns/${id}`, { method: 'DELETE' });
