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
    let initial: Client = DEFAULT_CLIENT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
    } catch { /* ignore */ }
    // Sync the global API client schema before any child component mounts and fetches.
    setApiClient(initial.id);
    return initial;
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
            setApiClient(list[0].id);
            setClientState(list[0]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list[0]));
          }
        }
      })
      .catch(() => { /* keep default */ })
      .finally(() => setLoading(false));
  }, []);

  const setClient = (c: Client) => {
    // Update the global API client schema synchronously, before React re-renders
    // and child components remount + refetch. Otherwise the first fetch after a
    // client switch reads the previous schema.
    setApiClient(c.id);
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
