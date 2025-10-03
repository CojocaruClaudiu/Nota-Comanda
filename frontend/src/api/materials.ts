import { api } from './axios';

export interface MaterialGroup {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  groupId?: string | null;
  code: string;
  description: string;
  supplierName?: string | null;
  supplierId?: string | null;
  unit: string;
  price: number;
  currency: 'RON' | 'EUR';
  purchaseDate?: string | null;
  technicalSheet?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Enriched fields from aggregation
  purchaseCount?: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  suppliers?: string[];
}

export interface Supplier {
  supplierName: string;
  supplierId?: string | null;
}

export interface MaterialGroupWithMaterials extends MaterialGroup {
  materials: Material[];
}

export interface MaterialPayload {
  code: string;
  description: string;
  unit?: string | null;
  price?: number | null;
  currency?: 'RON' | 'EUR' | null;
  technicalSheet?: string | null;
  notes?: string | null;
  active?: boolean | null;
}

export interface MaterialGroupPayload {
  name: string;
}

// Material Groups
export const fetchMaterialGroups = async (): Promise<MaterialGroup[]> => {
  const response = await api.get<MaterialGroup[]>('/materials/groups');
  return response.data;
};

export const createMaterialGroup = async (payload: MaterialGroupPayload): Promise<MaterialGroup> => {
  const response = await api.post<MaterialGroup>('/materials/groups', payload);
  return response.data;
};

export const updateMaterialGroup = async (id: string, payload: MaterialGroupPayload): Promise<MaterialGroup> => {
  const response = await api.put<MaterialGroup>(`/materials/groups/${id}`, payload);
  return response.data;
};

export const deleteMaterialGroup = async (id: string): Promise<void> => {
  await api.delete(`/materials/groups/${id}`);
};

// Materials
export const fetchUniqueMaterials = async (): Promise<Material[]> => {
  const response = await api.get<Material[]>('/materials/unique');
  return response.data;
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const response = await api.get<Supplier[]>('/materials/suppliers');
  return response.data;
};

export const fetchMaterialHistory = async (code: string): Promise<Material[]> => {
  const response = await api.get<Material[]>(`/materials/history/${encodeURIComponent(code)}`);
  return response.data;
};

export const fetchMaterialsByGroup = async (groupId: string): Promise<Material[]> => {
  const response = await api.get<Material[]>(`/materials/groups/${groupId}/materials`);
  return response.data;
};

export const fetchAllMaterials = async (): Promise<Material[]> => {
  const response = await api.get<Material[]>('/materials');
  return response.data;
};

export const fetchMaterialGroupsWithMaterials = async (): Promise<MaterialGroupWithMaterials[]> => {
  const response = await api.get<MaterialGroupWithMaterials[]>('/materials/groups-with-materials');
  return response.data;
};

export const createMaterialWithoutGroup = async (payload: MaterialPayload): Promise<Material> => {
  const response = await api.post<Material>('/materials', payload);
  return response.data;
};

export const createMaterial = async (groupId: string, payload: MaterialPayload): Promise<Material> => {
  const response = await api.post<Material>(`/materials/groups/${groupId}/materials`, payload);
  return response.data;
};

export const updateMaterial = async (id: string, payload: MaterialPayload): Promise<Material> => {
  const response = await api.put<Material>(`/materials/${id}`, payload);
  return response.data;
};

export const deleteMaterial = async (id: string): Promise<void> => {
  await api.delete(`/materials/${id}`);
};

// Technical Sheet Management
export const uploadTechnicalSheet = async (materialId: string, file: File): Promise<Material> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<Material>(`/materials/${materialId}/upload-sheet`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteTechnicalSheet = async (materialId: string): Promise<void> => {
  await api.delete(`/materials/${materialId}/technical-sheet`);
};

export const downloadTechnicalSheet = (materialId: string): string => {
  return `${api.defaults.baseURL}/materials/${materialId}/download-sheet`;
};
