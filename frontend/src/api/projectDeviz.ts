// src/api/projectDeviz.ts
import { api } from './axios';

export type ProjectDevizLine = {
  id: string;
  projectId: string;
  orderNum: number;
  code: string;
  description: string;
  priceLei?: number | null;
  priceEuro?: number | null;
  vatPercent?: number | null;
  priceWithVatLei?: number | null;
  priceWithVatEuro?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDevizLinePayload = {
  orderNum: number;
  code: string;
  description: string;
  priceLei?: number | null;
  priceEuro?: number | null;
  vatPercent?: number | null;
  notes?: string | null;
};

export const fetchProjectDevizLines = async (projectId: string): Promise<ProjectDevizLine[]> => {
  const response = await api.get<ProjectDevizLine[]>(`/projects/${projectId}/deviz`);
  return response.data;
};

export const createProjectDevizLine = async (
  projectId: string,
  payload: ProjectDevizLinePayload
): Promise<ProjectDevizLine> => {
  const response = await api.post<ProjectDevizLine>(`/projects/${projectId}/deviz`, payload);
  return response.data;
};

export const updateProjectDevizLine = async (
  projectId: string,
  lineId: string,
  payload: Partial<ProjectDevizLinePayload>
): Promise<ProjectDevizLine> => {
  const response = await api.put<ProjectDevizLine>(`/projects/${projectId}/deviz/${lineId}`, payload);
  return response.data;
};

export const deleteProjectDevizLine = async (projectId: string, lineId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/deviz/${lineId}`);
};
