import { api } from './axios';
import type { ClientLocation } from '../types/types';

export const clientLocationsApi = {
  getAll: async (): Promise<ClientLocation[]> => {
    const response = await api.get('/client-locations');
    return response.data as ClientLocation[];
  },

  getById: async (id: string): Promise<ClientLocation> => {
    const response = await api.get(`/client-locations/${id}`);
    return response.data as ClientLocation;
  },

  getByClientId: async (clientId: string): Promise<ClientLocation[]> => {
    const response = await api.get(`/client-locations/client/${clientId}`);
    return response.data as ClientLocation[];
  },

  create: async (location: Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientLocation> => {
    const response = await api.post('/client-locations', location);
    return response.data as ClientLocation;
  },

  update: async (id: string, location: Partial<Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ClientLocation> => {
    const response = await api.put(`/client-locations/${id}`, location);
    return response.data as ClientLocation;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/client-locations/${id}`);
  },
};
