import { api } from './axios';

export interface MaterialItem {
  id?: string;
  orderNum: number;
  operationCode: string;
  operationDescription: string;
  materialCode: string;
  materialDescription: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  baseValue: number;
  markupPercent: number | null;
  valueWithMarkup: number;
  discountPercent: number | null;
  finalValue: number;
  supplier?: string | null;
  packageSize?: number | null;
  packageUnit?: string | null;
}

export interface LaborItem {
  id?: string;
  orderNum: number;
  operationCode: string;
  operationDescription: string;
  laborDescription: string;
  quantity: number;
  unitPrice: number;
  baseValue: number;
  markupPercent: number | null;
  valueWithMarkup: number;
  discountPercent: number | null;
  finalValue: number;
}

// ==================== MATERIALS ====================

export const fetchProjectDevizMaterials = async (
  projectId: string,
  devizLineId: string
): Promise<MaterialItem[]> => {
  const response = await api.get<MaterialItem[]>(
    `/projects/${projectId}/deviz/${devizLineId}/materials`
  );
  return response.data;
};

export const saveProjectDevizMaterials = async (
  projectId: string,
  devizLineId: string,
  materials: MaterialItem[]
): Promise<MaterialItem[]> => {
  const response = await api.post<MaterialItem[]>(
    `/projects/${projectId}/deviz/${devizLineId}/materials`,
    { materials }
  );
  return response.data;
};

// ==================== LABOR ====================

export const fetchProjectDevizLabor = async (
  projectId: string,
  devizLineId: string
): Promise<LaborItem[]> => {
  const response = await api.get<LaborItem[]>(
    `/projects/${projectId}/deviz/${devizLineId}/labor`
  );
  return response.data;
};

export const saveProjectDevizLabor = async (
  projectId: string,
  devizLineId: string,
  labor: LaborItem[]
): Promise<LaborItem[]> => {
  const response = await api.post<LaborItem[]>(
    `/projects/${projectId}/deviz/${devizLineId}/labor`,
    { labor }
  );
  return response.data;
};
