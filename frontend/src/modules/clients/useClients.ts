import { useEffect, useState } from 'react';

export type Client = {
  id: string;
  name: string;
  location: string;
  contact: string;
  registrulComertului: string;
  cif: string;
};

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      });
  }, []);

  return { clients, loading };
}
