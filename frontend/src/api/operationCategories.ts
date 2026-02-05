// src/api/operationCategories.ts
export type OperationCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  operations?: Operation[];
};

export type Operation = {
  id: string;
  categoryId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type OperationItem = {
  id: string;
  operationId: string;
  name: string;
  unit?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationCategoryPayload = { name: string };
export type OperationPayload = { name: string };
export type OperationItemPayload = { name: string; unit?: string | null };

import { API_BASE_URL } from './baseUrl';

const API_URL = API_BASE_URL;

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let msg = res.statusText || 'Request failed';
    try {
      const j = await res.json();
      msg = j?.error || j?.message || msg;
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const headers = { 'Content-Type': 'application/json' };

// Fetch all operations across all categories
export const fetchAllOperations = () => request<Operation[]>(`/operations`);

// Categories
export const listOperationCategories = () => request<OperationCategory[]>(`/operation-categories`);
export const createOperationCategory = (payload: OperationCategoryPayload) =>
  request<OperationCategory>(`/operation-categories`, { method: 'POST', headers, body: JSON.stringify(payload) });
export const updateOperationCategory = (id: string, payload: OperationCategoryPayload) =>
  request<OperationCategory>(`/operation-categories/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
export const deleteOperationCategory = (id: string) => request<void>(`/operation-categories/${id}`, { method: 'DELETE' });

// Operations
export const listOperations = (categoryId: string) =>
  request<Operation[]>(`/operation-categories/${categoryId}/operations`);
export const createOperation = (categoryId: string, payload: OperationPayload) =>
  request<Operation>(`/operation-categories/${categoryId}/operations`, { method: 'POST', headers, body: JSON.stringify(payload) });
export const updateOperation = (opId: string, payload: OperationPayload) =>
  request<Operation>(`/operations/${opId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
export const deleteOperation = (opId: string) => request<void>(`/operations/${opId}`, { method: 'DELETE' });

// Operation Items (3rd level)
export const listOperationItems = (operationId: string) =>
  request<OperationItem[]>(`/operations/${operationId}/items`);
export const createOperationItem = (operationId: string, payload: OperationItemPayload) =>
  request<OperationItem>(`/operations/${operationId}/items`, { method: 'POST', headers, body: JSON.stringify(payload) });
export const updateOperationItem = (itemId: string, payload: OperationItemPayload) =>
  request<OperationItem>(`/items/${itemId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
export const deleteOperationItem = (itemId: string) => request<void>(`/items/${itemId}`, { method: 'DELETE' });
