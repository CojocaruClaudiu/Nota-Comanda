import { api } from './axios';

export interface ProjectSheetOperation {
  id?: string;
  orderNum: number;
  operationName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface ProjectSheet {
  id: string;
  projectId: string;
  devizLineId: string;
  initiationDate: string | null;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  standardMarkupPercent: number | null;
  standardDiscountPercent: number | null;
  indirectCostsPercent: number | null;
  operations?: ProjectSheetOperation[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveProjectSheetPayload {
  initiationDate: string | null;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  standardMarkupPercent: number | null;
  standardDiscountPercent: number | null;
  indirectCostsPercent: number | null;
  operations: ProjectSheetOperation[];
}

export const fetchProjectSheet = async (
  projectId: string,
  devizLineId: string
): Promise<ProjectSheet> => {
  const response = await api.get<ProjectSheet>(`/projects/${projectId}/deviz/${devizLineId}/sheet`);
  return response.data;
};

export const saveProjectSheet = async (
  projectId: string,
  devizLineId: string,
  payload: SaveProjectSheetPayload
): Promise<ProjectSheet> => {
  const response = await api.post<ProjectSheet>(
    `/projects/${projectId}/deviz/${devizLineId}/sheet`,
    payload
  );
  return response.data;
};
