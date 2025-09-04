// src/api/clients.ts
export type Client = {
  id: string;
  name: string;
  location: string;
  contact: string;
  registrulComertului?: string | null; // optional
  cif?: string | null;                 // optional
  createdAt?: string;
  updatedAt?: string;
};

// What you send when creating/updating:
export type ClientPayload = {
  name: string;
  location: string;
  contact: string;
  registrulComertului?: string | null;
  cif?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* --------------------- helpers --------------------- */

function isJson(ct: string | null) {
  return !!ct && ct.toLowerCase().includes('application/json');
}

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = res.statusText || 'Eroare necunoscută';

  try {
    if (isJson(res.headers.get('content-type'))) {
      const body = await res.json().catch(() => null as any);
      const m = body?.error ?? body?.message;
      if (m) message = m;
    } else {
      const txt = await res.text().catch(() => '');
      if (txt) {
        try {
          const obj = JSON.parse(txt);
          message = obj?.error ?? obj?.message ?? txt;
        } catch {
          message = txt;
        }
      }
    }
  } catch {
    // ignore parsing issues; keep fallback message
  }

  // Map common statuses to friendlier Romanian text
  if (res.status === 409) message = 'CIF sau Registrul Comerțului este deja folosit.';
  if (res.status === 400 && !message) message = 'Date invalide.';
  if (res.status >= 500) message = 'Eroare de server. Încearcă din nou.';

  throw new ApiError(message, res.status);
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) return parseError(res);
    // DELETE may have no body; guard
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Cererea a expirat. Verifică conexiunea și încearcă din nou.');
    }
    throw new ApiError('Nu s-a putut contacta serverul. Verifică dacă API-ul rulează.');
  } finally {
    clearTimeout(timer);
  }
}

// Trim required strings; for optional ones, empty => null
const trim = (v: string) => String(v ?? '').trim();
const toNullIfEmpty = (v?: string | null) => {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
};

function sanitizePayload(p: ClientPayload): ClientPayload {
  return {
    name: trim(p.name),
    location: trim(p.location),
    contact: trim(p.contact),
    registrulComertului: toNullIfEmpty(p.registrulComertului ?? null),
    cif: toNullIfEmpty(p.cif ?? null),
  };
}

/* --------------------- API calls --------------------- */

export async function fetchClients(): Promise<Client[]> {
  return request<Client[]>('/clients');
}

export async function createClient(data: ClientPayload): Promise<Client> {
  const body = JSON.stringify(sanitizePayload(data));
  return request<Client>('/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function updateClient(id: string, data: ClientPayload): Promise<Client> {
  const body = JSON.stringify(sanitizePayload(data));
  return request<Client>(`/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function deleteClient(id: string): Promise<void> {
  await request<void>(`/clients/${id}`, { method: 'DELETE' });
}
