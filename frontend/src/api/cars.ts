// src/api/cars.ts
import { API_BASE_URL } from "./baseUrl";

export type FuelType =
  | 'MOTORINA'
  | 'BENZINA'
  | 'BENZINA_GPL'
  | 'HIBRID_MOTORINA'
  | 'HIBRID_BENZINA'
  | 'ELECTRIC'
  | 'ALT';

export type NormaEuro = 'EURO_3' | 'EURO_4' | 'EURO_5' | 'EURO_6';

export type CarStatus = 'ACTIV' | 'IN_REPARATIE' | 'RETRAS' | 'VANDUT';

export type CarDocumentType = 'RCA' | 'CASCO' | 'VINIETA' | 'ITP';

export type TireSeason = 'WINTER' | 'SUMMER';

export type Car = {
  id: string;
  vin: string;
  marca: string;
  model: string;
  an: number;
  culoare?: string | null;
  placute: string;
  driverId?: string | null;
  driver?: { id: string; name: string } | null;
  driverNote?: string | null;
  combustibil?: FuelType | null;
  normaEuro?: NormaEuro | null;
  status?: CarStatus | null;
  expItp?: string | null;  // ISO string from backend
  expRca?: string | null;
  expRovi?: string | null;
  expCasco?: string | null;
  // legacy tire fields (kept for compatibility)
  tiresChangedAt?: string | null;
  tiresGood?: boolean | null;
  // seasonal tire fields
  winterTiresChangedAt?: string | null;
  winterTiresGood?: boolean | null;
  winterTireName?: string | null;
  winterTireDimensions?: string | null;
  summerTiresChangedAt?: string | null;
  summerTiresGood?: boolean | null;
  summerTireName?: string | null;
  summerTireDimensions?: string | null;
  itpDocument?: string | null;
  rcaDocument?: string | null;
  vinietaDocument?: string | null;
  cascoDocument?: string | null;
  rcaDecontareDirecta?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CarPayload = Omit<Car, 'id'|'createdAt'|'updatedAt'|'driver'>;

const API_URL = API_BASE_URL;

const isJson = (ct: string | null) => !!ct && ct.toLowerCase().includes('application/json');

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
        try { const obj = JSON.parse(txt); message = obj?.error ?? obj?.message ?? txt; }
        catch { message = txt; }
      }
    }
  } catch {}

  if (res.status === 409) message = 'VIN sau plăcuțele sunt deja folosite.';
  if (res.status >= 500) message = 'Eroare de server. Încearcă din nou.';
  const err = new Error(message); (err as any).status = res.status; throw err;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function getCars(): Promise<Car[]> {
  return request<Car[]>('/cars');
}

export async function createCar(data: CarPayload): Promise<Car> {
  return request<Car>('/cars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateCar(id: string, data: CarPayload): Promise<Car> {
  return request<Car>(`/cars/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteCar(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/cars/${id}`, { method: 'DELETE' });
  if (!res.ok) await parseError(res);
}

export async function uploadCarDocument(id: string, type: CarDocumentType, file: File, placute?: string): Promise<Car> {
  const formData = new FormData();
  formData.append('file', file);

  // Pass the sanitized plate so the backend can name the file descriptively
  const qs = placute ? `?placute=${encodeURIComponent(placute.replace(/\s+/g, ''))}` : '';
  const res = await fetch(`${API_URL}/cars/${id}/upload-document/${type}${qs}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<Car>;
}

export async function deleteCarDocument(id: string, type: CarDocumentType): Promise<Car> {
  return request<Car>(`/cars/${id}/document/${type}`, {
    method: 'DELETE',
  });
}

export function getCarDocumentUrl(storedPath?: string | null): string {
  if (!storedPath) return '';
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  const base = API_URL.replace(/\/$/, '');
  const rel = storedPath.replace(/^\//, '');
  return `${base}/${rel}`;
}

export type CarDocumentHistoryEntry = {
  id: string;
  carId: string;
  docType: CarDocumentType;
  path: string;
  filename: string;
  uploadedAt: string;
};

export type CarTireHistoryEntry = {
  id: string;
  carId: string;
  season: TireSeason;
  changedAt?: string | null;
  isGood?: boolean | null;
  tireName?: string | null;
  tireDimensions?: string | null;
  note?: string | null;
  replacedAt: string;
};

export type CarTireHistoryPayload = {
  season?: TireSeason;
  changedAt?: string | null;
  isGood?: boolean | null;
  tireName?: string | null;
  tireDimensions?: string | null;
  note?: string | null;
};

export async function fetchCarDocumentHistory(carId: string): Promise<CarDocumentHistoryEntry[]> {
  return request<CarDocumentHistoryEntry[]>(`/cars/${carId}/document-history`);
}

export async function fetchCarTireHistory(carId: string): Promise<CarTireHistoryEntry[]> {
  return request<CarTireHistoryEntry[]>(`/cars/${carId}/tire-history`);
}

export async function updateCarTireHistoryEntry(
  carId: string,
  historyId: string,
  data: CarTireHistoryPayload,
): Promise<CarTireHistoryEntry> {
  return request<CarTireHistoryEntry>(`/cars/${carId}/tire-history/${historyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteCarTireHistoryEntry(carId: string, historyId: string): Promise<void> {
  const res = await fetch(`${API_URL}/cars/${carId}/tire-history/${historyId}`, { method: 'DELETE' });
  if (!res.ok) await parseError(res);
}

export async function deleteCarDocumentHistoryEntry(carId: string, historyId: string): Promise<void> {
  const res = await fetch(`${API_URL}/cars/${carId}/document-history/${historyId}`, { method: 'DELETE' });
  if (!res.ok) await parseError(res);
}
