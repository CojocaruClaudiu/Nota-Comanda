import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface ReceptionDTO {
  id: string;
  date: string; // ISO date string
  invoice: string; // e.g., "ANR TGV 56836"
  supplier: string;
  manufacturer: string;
  material: string;
  unit: string; // U.M.
  quantity: number;
  unitPrice: number;
  orderId?: string | null; // Reference to Comanda (order)
  receptionType: 'SANTIER' | 'MAGAZIE'; // Tip Receptie
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReceptionRequest {
  date: string;
  invoice: string;
  supplier: string;
  manufacturer: string;
  material: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  orderId?: string | null;
  receptionType: 'SANTIER' | 'MAGAZIE';
}

export interface UpdateReceptionRequest {
  date?: string;
  invoice?: string;
  supplier?: string;
  manufacturer?: string;
  material?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  orderId?: string | null;
  receptionType?: 'SANTIER' | 'MAGAZIE';
}

/**
 * Fetch all receptions
 */
export async function fetchReceptions(): Promise<ReceptionDTO[]> {
  const response = await axios.get<ReceptionDTO[]>(`${API_BASE_URL}/receptions`);
  return response.data;
}

/**
 * Fetch a single reception by ID
 */
export async function fetchReception(id: string): Promise<ReceptionDTO> {
  const response = await axios.get<ReceptionDTO>(`${API_BASE_URL}/receptions/${id}`);
  return response.data;
}

/**
 * Create a new reception
 */
export async function createReception(data: CreateReceptionRequest): Promise<ReceptionDTO> {
  const response = await axios.post<ReceptionDTO>(`${API_BASE_URL}/receptions`, data);
  return response.data;
}

/**
 * Update an existing reception
 */
export async function updateReception(id: string, data: UpdateReceptionRequest): Promise<ReceptionDTO> {
  const response = await axios.put<ReceptionDTO>(`${API_BASE_URL}/receptions/${id}`, data);
  return response.data;
}

/**
 * Delete a reception
 */
export async function deleteReception(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/receptions/${id}`);
}
