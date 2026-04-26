import { useState, useEffect } from 'react';
import { useClient } from '../contexts/ClientContext';

export function useData<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const { client } = useClient();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, ...deps]);

  return { data, loading, error };
}
