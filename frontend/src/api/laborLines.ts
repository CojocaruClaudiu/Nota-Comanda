// src/api/laborLines.ts
export type LaborLine = {
  id: string;
  qualificationId: string;
  name: string;
  unit: string;          // default 'ora'
  hourlyRate: number;    // cost unitar/ora
  currency: 'RON' | 'EUR';
  active: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LaborLinePayload = {
  name: string;
  unit?: string | null;
  hourlyRate: number;
  currency?: 'RON' | 'EUR';
  active?: boolean;
  notes?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    try { const j = JSON.parse(text || '{}'); throw new Error(j.error || j.message || text || res.statusText); }
    catch { throw new Error(text || res.statusText); }
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const getLaborLines = (qualificationId: string) => request<LaborLine[]>(`/qualifications/${qualificationId}/labor-lines`);
export const createLaborLine = (qualificationId: string, data: LaborLinePayload) =>
  request<LaborLine>(`/qualifications/${qualificationId}/labor-lines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const updateLaborLine = (id: string, data: LaborLinePayload) =>
  request<LaborLine>(`/labor-lines/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteLaborLine = (id: string) => request<void>(`/labor-lines/${id}`, { method: 'DELETE' });
