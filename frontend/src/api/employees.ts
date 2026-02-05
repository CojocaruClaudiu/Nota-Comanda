// src/api/employees.ts
import { API_BASE_URL } from './baseUrl';

export type Employee = {
  id: string;
  name: string;
  isActive?: boolean;
  qualifications: string[];
  hiredAt: string;             // ISO
  birthDate?: string | null;   // NEW (ISO)
  cnp?: string;                // NEW
  phone?: string;              // NEW
  idSeries?: string;           // NEW
  idNumber?: string;           // NEW
  idIssuer?: string;           // NEW
  idIssueDateISO?: string;     // NEW
  county?: string;             // NEW
  locality?: string;           // NEW
  address?: string;            // NEW
  manualCarryOverDays?: number; // NEW
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeWithStats = Employee & {
  entitledDays: number;
  takenDays: number;
  remainingDays: number;
  age?: number | null;         // 👈 NEW (computed)
  leaveBalance?: {             // 👈 NEW (leave policy breakdown)
    accrued: number;           // Days accrued pro-rata
    carriedOver: number;       // Days carried from previous year
    companyShutdownDays: number; // Days taken for company shutdowns (Dec)
    voluntaryDays: number;     // Days taken by choice
    pendingDays: number;       // Days pending approval
  };
};

export type EmployeePayload = {
  name: string;
  cnp?: string;
  qualifications?: string[];
  hiredAt: string;             // ISO
  birthDate?: string | null;   // NEW
  phone?: string;              // NEW
  idSeries?: string;           // NEW
  idNumber?: string;           // NEW
  idIssuer?: string;           // NEW
  idIssueDateISO?: string;     // NEW
  county?: string;             // NEW
  locality?: string;           // NEW
  address?: string;            // NEW
  isActive?: boolean;
  deactivatedAt?: string | null; // Date when employee left (freezes leave calculations)
  manualCarryOverDays?: number; // NEW
};

export type Leave = {
  id: string;
  employeeId: string;
  startDate: string; // ISO
  endDate?: string | null;
  days: number;
  note?: string | null;
  createdAt?: string;
};

export type LeavePayload = {
  startDate: string;
  days: number;
  note?: string;
};

const API_URL = API_BASE_URL;

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

export const getEmployees = () => request<EmployeeWithStats[]>('/employees');
export const createEmployee = (data: EmployeePayload) =>
  request<Employee>('/employees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
export const updateEmployee = (id: string, data: EmployeePayload) =>
  request<Employee>(`/employees/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
export const deleteEmployee = (id: string) =>
  request<void>(`/employees/${id}`, { method: 'DELETE' });

export const addLeave = (employeeId: string, data: LeavePayload) =>
  request<Leave>(`/employees/${employeeId}/leaves`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
export const getLeaves = (employeeId: string) => request<Leave[]>(`/employees/${employeeId}/leaves`);
export const deleteLeave = (leaveId: string) => request<void>(`/leaves/${leaveId}`, { method: 'DELETE' });


