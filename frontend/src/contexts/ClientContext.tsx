import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setApiClient } from '../api/client';

export type Currency = 'EUR' | 'MXN' | 'USD';

export interface BrandTheme {
  primary: string;
  secondary: string;
  logo: string;
  tagline: string;
  channelColors: Record<string, string>;
}

export interface Client {
  id: string;
  name: string;
  currency: Currency;
  brand?: BrandTheme;
}

const BRAND_OVERRIDES: Record<string, Partial<Client>> = {
  GOLD_LALA: {
    currency: 'MXN',
    brand: {
      primary: '#27418F',
      secondary: '#ED1C24',
      logo: '/lala-logo.svg',
      tagline: 'LALA × BCG · Performance Hub',
      channelColors: {
        'Google Ads': '#4285F4',
        'Meta Ads': '#0668E1',
        'TikTok Ads': '#FE2C55',
        'Influencer Marketing': '#8B5CF6',
      },
    },
  },
};

function applyOverrides(c: Client): Client {
  const override = BRAND_OVERRIDES[c.id];
  return override ? { ...c, ...override } : c;
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

const DEFAULT_CLIENT: Client = { id: 'GOLD', name: 'Default', currency: 'EUR' };

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT]);
  const [client, setClientState] = useState<Client>(() => {
    let initial: Client = DEFAULT_CLIENT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initial = applyOverrides(JSON.parse(stored));
    } catch { /* ignore */ }
    setApiClient(initial.id);
    return initial;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/data/clients`)
      .then(r => r.json())
      .then((list: Client[]) => {
        if (list.length > 0) {
          const merged = list.map(c => applyOverrides({ ...DEFAULT_CLIENT, ...c }));
          setClients(merged);
          const stored = client.id;
          if (!merged.find(c => c.id === stored)) {
            setApiClient(merged[0].id);
            setClientState(merged[0]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged[0]));
          } else {
            // Reapply overrides in case BRAND_OVERRIDES changed since persistence
            const current = merged.find(c => c.id === stored)!;
            setClientState(current);
          }
        }
      })
      .catch(() => { /* keep default */ })
      .finally(() => setLoading(false));
  }, []);

  const setClient = (c: Client) => {
    const withOverrides = applyOverrides(c);
    setApiClient(withOverrides.id);
    setClientState(withOverrides);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withOverrides));
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
