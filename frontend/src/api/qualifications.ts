// src/api/qualifications.ts
import type { LaborLine } from './laborLines';

export type Qualification = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type QualificationWithLines = {
  id: string;
  name: string;
  laborLines: LaborLine[];
  createdAt?: string;
  updatedAt?: string;
};

export type QualificationPayload = { name: string };

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

export const getQualifications = () => request<Qualification[]>('/qualifications');
export const getQualificationsWithLines = () => request<QualificationWithLines[]>('/qualifications-with-lines');
export const createQualification = (data: QualificationPayload) =>
  request<Qualification>('/qualifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const updateQualification = (id: string, data: QualificationPayload) =>
  request<Qualification>(`/qualifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteQualification = (id: string) =>
  request<void>(`/qualifications/${id}`, { method: 'DELETE' });
