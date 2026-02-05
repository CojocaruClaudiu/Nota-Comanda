import { SheetItemType } from '@prisma/client';

export interface OperationSheetItemDTO {
  id?: string;
  itemType: SheetItemType;
  referenceId?: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  // Enriched from Materials catalog when applicable (MATERIAL/CONSUMABLE)
  packQuantity?: number | null;
  packUnit?: string | null;
}

export interface OperationSheetTemplateDTO {
  id?: string;
  operationId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  version?: number;
  items?: OperationSheetItemDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectOperationSheetDTO {
  id?: string;
  projectId: string;
  operationId: string;
  templateId?: string;
  templateVersion?: number;
  name?: string;
  description?: string;
  items?: OperationSheetItemDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTemplateRequest {
  operationId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  items: OperationSheetItemDTO[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
  items?: OperationSheetItemDTO[];
}

export interface CreateProjectSheetRequest {
  operationId: string;
  templateId?: string;
  name?: string;
  description?: string;
  items: OperationSheetItemDTO[];
}

export interface OperationSheetModificationDTO {
  id: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  action: string;
  itemType?: SheetItemType;
  itemDescription?: string;
  oldValue?: any;
  newValue?: any;
  deviationFromTemplate: boolean;
}
