// src/api/suppliers.ts
export type Supplier = {
  id: string;
  id_tert?: string | null;
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  den_catart?: string | null;
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
  contBancar: string;
  banca: string;
  status: "activ" | "inactiv";
  notite?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayload = {
  id_tert?: string | null;
  denumire: string;
  cui_cif: string;
  nrRegCom?: string | null;
  den_catart?: string | null;
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
  contBancar?: string;
  banca?: string;
  status?: "activ" | "inactiv";
  notite?: string | null;
};

import { API_BASE_URL } from './baseUrl';

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
