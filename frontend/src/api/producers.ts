// src/api/producers.ts
export type Producer = {
  id: string;
  name: string;
  status: 'activ' | 'inactiv';
  adresa?: string | null;
  contBancar?: string | null;
  banca?: string | null;
  email?: string | null;
  telefon?: string | null;
  site?: string | null;
  observatii?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProducerPayload = {
  name: string;
  status?: 'activ' | 'inactiv';
  adresa?: string | null;
  contBancar?: string | null;
  banca?: string | null;
  email?: string | null;
  telefon?: string | null;
  site?: string | null;
  observatii?: string | null;
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

export const getProducers = () => request<Producer[]>('/producatori');
export const createProducer = (payload: ProducerPayload) =>
  request<Producer>('/producatori', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
export const updateProducer = (id: string, payload: ProducerPayload) =>
  request<Producer>(`/producatori/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
export const deleteProducer = (id: string) =>
  request<void>(`/producatori/${id}`, { method: 'DELETE' });
