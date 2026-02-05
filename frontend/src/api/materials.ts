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
  packQuantity?: number | null;
  packUnit?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Reception fields
  invoiceNumber?: string | null;
  receivedQuantity?: number | null;
  receptionType?: string | null; // Can be 'MAGAZIE', 'SANTIER', or project ID
  manufacturer?: string | null;
  // Enriched fields from aggregation
  purchaseCount?: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  suppliers?: string[];
}

export type MaterialFamilyConfidence = 'auto' | 'manual' | 'suspect';

export interface MaterialFamilySummary {
  id: string;
  name: string;
  normalizedKey: string;
  variantsCount: number;
  totalOrders: number;
  suppliersCount: number;
  minPrice?: number;
  maxPrice?: number;
  lastPurchaseAt?: string;
  confidence: MaterialFamilyConfidence;
}

export interface MaterialFamilyVariant {
  id: string;
  materialId?: string;
  name: string;
  packValue?: number;
  packUnit?: string;
  color?: string;
  brand?: string;
  defaultSupplier?: string;
  latestPrice?: number;
  priceRange?: { min?: number; max?: number };
  purchasesCount?: number;
  confidence: MaterialFamilyConfidence;
  assignedByUser?: boolean;
  updatedAt?: string;
}

export interface MaterialFamilyAggregatedStats {
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  totalOrders: number;
  suppliersCount: number;
  latestPurchaseAt?: string;
}

export interface MaterialFamily {
  summary: MaterialFamilySummary;
  variants: MaterialFamilyVariant[];
  aggregatedStats: MaterialFamilyAggregatedStats;
}

export interface MaterialFamiliesPreviewMeta {
  hasSuspects?: boolean;
  suspectsCount?: number;
  generatedAt?: string;
}

export interface MaterialFamiliesPreviewResponse {
  families: MaterialFamily[];
  meta?: MaterialFamiliesPreviewMeta;
}

// Basic family record (for CRUD endpoints)
export interface MaterialFamilyRecord {
  id: string;
  name: string;
  normalizedKey?: string | null;
  confidence?: MaterialFamilyConfidence | string | null;
  createdAt?: string;
  updatedAt?: string;
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
  packQuantity?: number | null;
  packUnit?: string | null;
  receptionType?: string | null;
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
  const response = await api.get<Material[]>(`/materials/history/${code}`);
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

export const updateMaterial = async (id: string, payload: Partial<MaterialPayload>): Promise<Material> => {
  const response = await api.put<Material>(`/materials/${id}`, payload);
  return response.data;
};

export const deleteMaterial = async (id: string): Promise<void> => {
  await api.delete(`/materials/${id}`);
};

export const fetchMaterialFamiliesPreview = async (): Promise<MaterialFamiliesPreviewResponse> => {
  const response = await api.get<MaterialFamiliesPreviewResponse>('/materials/families/preview');
  return response.data;
};

// Families CRUD
export const fetchMaterialFamilies = async (): Promise<MaterialFamilyRecord[]> => {
  const response = await api.get<MaterialFamilyRecord[]>('/materials/families');
  return response.data;
};

export const createMaterialFamily = async (name: string): Promise<MaterialFamilyRecord> => {
  const response = await api.post<MaterialFamilyRecord>('/materials/families', { name });
  return response.data;
};

export const updateMaterialFamily = async (id: string, name: string): Promise<MaterialFamilyRecord> => {
  const response = await api.put<MaterialFamilyRecord>(`/materials/families/${id}`, { name });
  return response.data;
};

export const deleteMaterialFamily = async (id: string): Promise<void> => {
  await api.delete(`/materials/families/${id}`);
};

export const assignMaterialsToFamily = async (familyId: string, materialIds: string[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>(`/materials/families/${familyId}/assign`, { materialIds });
  return response.data;
};

export const unassignMaterialsFromFamily = async (familyId: string, materialIds: string[]): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>(`/materials/families/${familyId}/unassign`, { materialIds });
  return response.data;
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
