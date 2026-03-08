import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setApiClient } from '../api/client';

export interface Client {
  id: string;   // schema name, e.g. "GOLD", "GOLD_ACME"
  name: string; // display name, e.g. "Default", "ACME"
}

interface ClientContextValue {
  client: Client;
  setClient: (c: Client) => void;
  clients: Client[];
  loading: boolean;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = 'caa_selected_client';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_CLIENT: Client = { id: 'GOLD', name: 'Default' };

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT]);
  const [client, setClientState] = useState<Client>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return DEFAULT_CLIENT;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/data/clients`)
      .then(r => r.json())
      .then((list: Client[]) => {
        if (list.length > 0) {
          setClients(list);
          // If stored client no longer exists, reset to first
          const stored = client.id;
          if (!list.find(c => c.id === stored)) {
            setClientState(list[0]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list[0]));
          }
        }
      })
      .catch(() => { /* keep default */ })
      .finally(() => setLoading(false));
  }, []);

  // Sync global API client on mount and when client changes
  useEffect(() => { setApiClient(client.id); }, [client.id]);

  const setClient = (c: Client) => {
    setClientState(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  };

  return (
    <ClientContext.Provider value={{ client, setClient, clients, loading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}
