// src/api/employees.ts
import { ApiError } from './shared'; // optional if you have one; otherwise inline like in clients.ts

export type Employee = {
  id: string;
  name: string;
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
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeWithStats = Employee & {
  entitledDays: number;
  takenDays: number;
  remainingDays: number;
  age?: number | null;         // 👈 NEW (computed)
};

export type EmployeePayload = {
  name: string;
  cnp: string;
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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


