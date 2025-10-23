// src/api/equipment.ts
export type Equipment = {
  id: string;
  category: string;
  code: string; // internal id
  description: string;
  hourlyCost: number;
  status?: string | null;
  serialNumber?: string | null;
  referenceNumber?: string | null;
  lastRepairDate?: string | null;
  repairCost?: number | null;
  repairCount?: number | null;
  warranty?: string | null;
  equipmentNumber?: string | null;
  generation?: string | null;
  purchasePrice?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentPayload = {
  category: string;
  code: string;
  description: string;
  hourlyCost: number;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiError extends Error { status?: number; constructor(message: string, status?: number) { super(message); this.status = status; } }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let msg = res.statusText || 'Request failed';
    try { const j = await res.json(); msg = j?.error || j?.message || msg; } catch {}
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const headers = { 'Content-Type': 'application/json' };

export const listEquipment = () => request<Equipment[]>(`/equipment`);
export const createEquipment = (payload: EquipmentPayload) => request<Equipment>(`/equipment`, { method: 'POST', headers, body: JSON.stringify(payload) });
export const updateEquipment = (id: string, payload: EquipmentPayload) => request<Equipment>(`/equipment/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
export const deleteEquipment = (id: string) => request<void>(`/equipment/${id}`, { method: 'DELETE' });
export const renameEquipmentCategory = (from: string, to: string) => request<{ updated: number }>(`/equipment/rename-category`, { method: 'POST', headers, body: JSON.stringify({ from, to }) });
