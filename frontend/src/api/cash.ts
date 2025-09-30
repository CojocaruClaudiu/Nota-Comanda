import { api } from './axios';

export interface CashEntryDTO {
  id: string; companyId: string; cashAccountId: string; effectiveAt: string; type: 'IN'|'OUT'; amount: number; currency: string; categoryId?: string|null; personId?: string|null; projectId?: string|null; notes?: string|null; transferGroupId?: string|null; documentNo?: string|null; documentType?: string|null; attachmentUrls: string[]; sequenceYear: number; sequenceNo?: number; createdBy: number; approvedBy?: number|null; createdAt: string; updatedAt: string; lockedAt?: string|null; runningBalance?: number;
  category?: { id: string; name: string } | null; person?: { id: string; name: string } | null; project?: { id: string; name: string } | null; cashAccount?: { id: string; name: string };
}

export interface ListCashEntriesResponse { total: number; page: number; pageSize: number; rows: CashEntryDTO[]; sumIn: number; sumOut: number }

export async function listCashEntries(params: Record<string, any>): Promise<ListCashEntriesResponse> {
  const { data } = await api.get('/api/cash-entries', { params });
  return data as ListCashEntriesResponse;
}

export async function createCashEntry(payload: any): Promise<CashEntryDTO> { const { data } = await api.post('/api/cash-entries', payload); return data as CashEntryDTO; }
export async function updateCashEntry(id: string, payload: any): Promise<CashEntryDTO> { const { data } = await api.patch(`/api/cash-entries/${id}`, payload); return data as CashEntryDTO; }
export async function transferCash(payload: any) { const { data } = await api.post('/api/cash-entries/transfer', payload); return data as { out: CashEntryDTO; in: CashEntryDTO }; }
export async function getBalances(params: Record<string, any>) { const { data } = await api.get('/api/balances', { params }); return data as { accountId: string; accountName: string; companyId: string; balance: number }[]; }

// Meta lists
export async function listCompanies() { const { data } = await api.get('/api/companies'); return data as { id: string; name: string; code?: string|null }[]; }
export async function listCashAccounts(companyId?: string) { const { data } = await api.get('/api/cash-accounts', { params: { companyId } }); return data as { id: string; name: string; companyId: string; currency: string }[]; }
export async function listCashCategories() { const { data } = await api.get('/api/cash-categories'); return data as { id: string; name: string }[]; }
export async function createCashCategory(name: string) { const { data } = await api.post('/api/cash-categories', { name }); return data as { id: string; name: string }; }
export async function listPersons() { const { data } = await api.get('/api/persons'); return data as { id: string; name: string }[]; }
export async function createPerson(name: string) { const { data } = await api.post('/api/persons', { name }); return data as { id: string; name: string }; }

