import axios from 'axios';

const API_BASE = 'http://localhost:4000';

export type EquipmentType = 'BOOTS' | 'PANTS' | 'JACKET' | 'GLOVES' | 'HELMET' | 'VEST' | 'OTHER';
export type EquipmentCondition = 'NEW' | 'GOOD' | 'WORN' | 'DAMAGED' | 'DESTROYED';

export interface EquipmentIssue {
  id: string;
  employeeId: string;
  equipmentType: EquipmentType;
  issuedDate: Date;
  returnedDate?: Date | null;
  destroyedDate?: Date | null;
  size?: string | null;
  condition: EquipmentCondition;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEquipmentIssueDTO {
  equipmentType: EquipmentType;
  size?: string | null;
  condition?: EquipmentCondition;
  notes?: string | null;
  issuedDate?: Date;
}

export interface UpdateEquipmentIssueDTO {
  returnedDate?: Date | null;
  destroyedDate?: Date | null;
  size?: string | null;
  condition?: EquipmentCondition;
  notes?: string | null;
}

export const workerEquipmentApi = {
  // Get all equipment issues for an employee
  getEmployeeEquipment: async (employeeId: string): Promise<EquipmentIssue[]> => {
    const response = await axios.get(`${API_BASE}/equipment/employees/${employeeId}/equipment`);
    return response.data.map((item: any) => ({
      ...item,
      issuedDate: new Date(item.issuedDate),
      returnedDate: item.returnedDate ? new Date(item.returnedDate) : null,
      destroyedDate: item.destroyedDate ? new Date(item.destroyedDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  },

  // Get active (not returned) equipment for an employee
  getActiveEquipment: async (employeeId: string): Promise<EquipmentIssue[]> => {
    const response = await axios.get(`${API_BASE}/equipment/employees/${employeeId}/equipment/active`);
    return response.data.map((item: any) => ({
      ...item,
      issuedDate: new Date(item.issuedDate),
      returnedDate: item.returnedDate ? new Date(item.returnedDate) : null,
      destroyedDate: item.destroyedDate ? new Date(item.destroyedDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  },

  // Issue new equipment to employee
  issueEquipment: async (employeeId: string, data: CreateEquipmentIssueDTO): Promise<EquipmentIssue> => {
    const response = await axios.post(`${API_BASE}/equipment/employees/${employeeId}/equipment`, data);
    return {
      ...response.data,
      issuedDate: new Date(response.data.issuedDate),
      returnedDate: response.data.returnedDate ? new Date(response.data.returnedDate) : null,
      destroyedDate: response.data.destroyedDate ? new Date(response.data.destroyedDate) : null,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
  },

  // Update equipment issue (e.g., mark as returned, update condition)
  updateEquipment: async (id: string, data: UpdateEquipmentIssueDTO): Promise<EquipmentIssue> => {
    const response = await axios.put(`${API_BASE}/equipment/equipment/${id}`, data);
    return {
      ...response.data,
      issuedDate: new Date(response.data.issuedDate),
      returnedDate: response.data.returnedDate ? new Date(response.data.returnedDate) : null,
      destroyedDate: response.data.destroyedDate ? new Date(response.data.destroyedDate) : null,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };
  },

  // Delete equipment issue
  deleteEquipment: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/equipment/equipment/${id}`);
  },

  // Get equipment summary by type
  getSummary: async (): Promise<Array<{ equipmentType: EquipmentType; _count: { id: number } }>> => {
    const response = await axios.get(`${API_BASE}/equipment/equipment/summary`);
    return response.data;
  },

  // Get ALL equipment across all employees (for overview page)
  getAllEquipment: async (): Promise<Array<EquipmentIssue & { employee: { id: string; name: string; active: boolean } }>> => {
    const response = await axios.get(`${API_BASE}/equipment/equipment/all`);
    return response.data.map((item: any) => ({
      ...item,
      issuedDate: new Date(item.issuedDate),
      returnedDate: item.returnedDate ? new Date(item.returnedDate) : null,
      destroyedDate: item.destroyedDate ? new Date(item.destroyedDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  },

  // Get equipment statistics (for charts)
  getStats: async (): Promise<{
    totalIssued: number;
    active: number;
    returned: number;
    destroyed: number;
    byType: Record<string, { active: number; returned: number; destroyed: number }>;
    byCondition: Record<string, number>;
    byEmployee: Array<{ employeeId: string; employeeName: string; count: number }>;
  }> => {
    const response = await axios.get(`${API_BASE}/equipment/equipment/stats`);
    return response.data;
  },
};

// Helper function to get equipment type display name in Romanian
export const getEquipmentTypeName = (type: EquipmentType): string => {
  const names: Record<EquipmentType, string> = {
    BOOTS: 'Bocanci',
    PANTS: 'Pantaloni',
    JACKET: 'Jachetă',
    GLOVES: 'Mănuși',
    HELMET: 'Cască',
    VEST: 'Vestă',
    OTHER: 'Altele',
  };
  return names[type] || type;
};

// Helper function to get equipment condition display name in Romanian
export const getEquipmentConditionName = (condition: EquipmentCondition): string => {
  const names: Record<EquipmentCondition, string> = {
    NEW: 'Nou',
    GOOD: 'Bună',
    WORN: 'Uzată',
    DAMAGED: 'Deteriorată',
    DESTROYED: 'Distrus',
  };
  return names[condition] || condition;
};

// Helper to get equipment icon emoji
export const getEquipmentIcon = (type: EquipmentType): string => {
  const icons: Record<EquipmentType, string> = {
    BOOTS: '👢',
    PANTS: '👖',
    JACKET: '🧥',
    GLOVES: '🧤',
    HELMET: '⛑️',
    VEST: '🦺',
    OTHER: '📦',
  };
  return icons[type] || '📦';
};
