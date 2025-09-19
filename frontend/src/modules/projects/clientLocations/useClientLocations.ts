import { useState, useEffect } from 'react';
import { clientLocationsApi } from '../../../api/clientLocations';
import type { ClientLocation } from '../../../types/types';

export const useClientLocations = () => {
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientLocationsApi.getAll();
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch client locations');
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (location: Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newLocation = await clientLocationsApi.create(location);
      setLocations(prev => [...prev, newLocation]);
      return newLocation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client location');
      throw err;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Omit<ClientLocation, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const updatedLocation = await clientLocationsApi.update(id, updates);
      setLocations(prev => prev.map(l => l.id === id ? updatedLocation : l));
      return updatedLocation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client location');
      throw err;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      await clientLocationsApi.delete(id);
      setLocations(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client location');
      throw err;
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
