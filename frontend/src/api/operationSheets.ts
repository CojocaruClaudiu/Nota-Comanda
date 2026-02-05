import axios from 'axios';

import { API_BASE_URL } from './baseUrl';

export interface OperationSheetItemDTO {
  id: string;
  itemType: 'MATERIAL' | 'CONSUMABLE' | 'EQUIPMENT' | 'LABOR';
  referenceId?: string;
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  packQuantity?: number | null;
  packUnit?: string | null;
  addedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationSheetTemplateDTO {
  id: string;
  operationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  items: OperationSheetItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  items: Array<{
    type: 'MATERIAL' | 'CONSUMABLE' | 'EQUIPMENT' | 'LABOR';
    name: string;
    code?: string;
    unit: string;
    quantity: number;
    price: number;
    packQuantity?: number | null;
    packUnit?: string | null;
  }>;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
  items?: Array<{
    id?: number;
    type: 'MATERIAL' | 'CONSUMABLE' | 'EQUIPMENT' | 'LABOR';
    name: string;
    code?: string;
    unit: string;
    quantity: number;
    price: number;
    packQuantity?: number | null;
    packUnit?: string | null;
  }>;
}

/**
 * Fetch all templates for a specific operation
 */
export async function fetchOperationTemplates(operationId: string): Promise<OperationSheetTemplateDTO[]> {
  const response = await axios.get<OperationSheetTemplateDTO[]>(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates`
  );
  return response.data;
}

/**
 * Fetch a single template by ID
 */
export async function fetchOperationTemplate(
  operationId: string,
  templateId: string
): Promise<OperationSheetTemplateDTO> {
  const response = await axios.get<OperationSheetTemplateDTO>(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates/${templateId}`
  );
  return response.data;
}

/**
 * Create a new template for an operation
 */
export async function createOperationTemplate(
  operationId: string,
  data: CreateTemplateRequest
): Promise<OperationSheetTemplateDTO> {
  const response = await axios.post<OperationSheetTemplateDTO>(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates`,
    data
  );
  return response.data;
}

/**
 * Update an existing template
 */
export async function updateOperationTemplate(
  operationId: string,
  templateId: string,
  data: UpdateTemplateRequest
): Promise<OperationSheetTemplateDTO> {
  const response = await axios.put<OperationSheetTemplateDTO>(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates/${templateId}`,
    data
  );
  return response.data;
}

/**
 * Delete a template (soft delete)
 */
export async function deleteOperationTemplate(
  operationId: string,
  templateId: string
): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates/${templateId}`
  );
}

/**
 * Set a template as the default for an operation
 */
export async function setDefaultTemplate(
  operationId: string,
  templateId: string
): Promise<OperationSheetTemplateDTO> {
  const response = await axios.post<OperationSheetTemplateDTO>(
    `${API_BASE_URL}/operation-sheets/operations/${operationId}/templates/${templateId}/set-default`
  );
  return response.data;
}

// ==================== PROJECT OPERATION SHEET FUNCTIONS ====================

export interface ProjectOperationSheetDTO {
  id: string | null;
  projectId: string;
  operationId: string;
  operationItemId?: string | null;
  templateId?: string | null;
  templateVersion?: number;
  name?: string;
  description?: string;
  items: OperationSheetItemDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveProjectSheetRequest {
  templateId?: string;
  name?: string;
  description?: string;
  items: Array<{
    type: 'MATERIAL' | 'CONSUMABLE' | 'EQUIPMENT' | 'LABOR';
    referenceId?: string;
    code?: string;
    name: string;
    description?: string;
    unit: string;
    quantity: number;
    price: number;
    packQuantity?: number | null;
    packUnit?: string | null;
  }>;
}

/**
 * Fetch operation sheet for a specific project and operation
 */
export async function fetchProjectOperationSheet(
  projectId: string,
  operationId: string
): Promise<ProjectOperationSheetDTO> {
  const response = await axios.get<ProjectOperationSheetDTO>(
    `${API_BASE_URL}/operation-sheets/projects/${projectId}/operations/${operationId}/sheet`
  );
  return response.data;
}

/**
 * Save operation sheet for a specific project and operation
 */
export async function saveProjectOperationSheet(
  projectId: string,
  operationId: string,
  data: SaveProjectSheetRequest
): Promise<ProjectOperationSheetDTO> {
  const response = await axios.post<ProjectOperationSheetDTO>(
    `${API_BASE_URL}/operation-sheets/projects/${projectId}/operations/${operationId}/sheet`,
    data
  );
  return response.data;
}

