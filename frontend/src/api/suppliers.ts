// src/api/suppliers.ts
export type Supplier = {
  id: string;
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  tip: string;
  tva: boolean;
  tvaData?: string | null;     // ISO date
  adresa: string;
  oras: string;
  judet: string;
  tara: string;
  contactNume: string;
  email: string;
  telefon: string;
  site?: string | null;
  metodaPlata: string;
  termenPlata: number;         // zile
  contBancar: string;
  banca: string;
  status: "activ" | "inactiv";
  notite?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayload = {
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  tip?: string;
  tva?: boolean;
  tvaData?: string | null;
  adresa?: string;
  oras?: string;
  judet?: string;
  tara?: string;
  contactNume?: string;
  email?: string;
  telefon?: string;
  site?: string | null;
  metodaPlata?: string;
  termenPlata?: number;
  contBancar?: string;
  banca?: string;
  status?: "activ" | "inactiv";
  notite?: string | null;
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

export const getSuppliers = () => request<Supplier[]>('/furnizori');
export const createSupplier = (payload: SupplierPayload) =>
  request<Supplier>('/furnizori', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
export const updateSupplier = (id: string, payload: SupplierPayload) =>
  request<Supplier>(`/furnizori/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
export const deleteSupplier = (id: string) =>
  request<void>(`/furnizori/${id}`, { method: 'DELETE' });
