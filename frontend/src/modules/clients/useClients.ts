import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/baseUrl';

export type Client = {
  id: string;
  name: string;
  location: string;
  phone: string;
  email?: string | null;
  registrulComertului?: string | null;
  cui?: string | null;
};

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/clients`)
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      });
  }, []);

  return { clients, loading };
}
