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
  expItp?: string | null;  // ISO string from backend
  expRca?: string | null;
  expRovi?: string | null;
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
