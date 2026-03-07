const API_BASE = 'http://localhost:3001/api';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getKPI: () => fetchJSON<any[]>('/data/kpi'),
  getChannelDaily: () => fetchJSON<any[]>('/data/channel-daily'),
  getMonthlySummary: () => fetchJSON<any[]>('/data/monthly-summary'),
  getWeeklyTrends: () => fetchJSON<any[]>('/data/weekly-trends'),
  getCampaigns: (channel?: string, month?: string) => {
    const params = new URLSearchParams();
    if (channel) params.set('channel', channel);
    if (month) params.set('month', month);
    return fetchJSON<any[]>(`/data/campaigns?${params}`);
  },
  getCampaignDaily: (channel?: string) => {
    const params = channel ? `?channel=${encodeURIComponent(channel)}` : '';
    return fetchJSON<any[]>(`/data/campaign-daily${params}`);
  },
  getDeviceBreakdown: () => fetchJSON<any[]>('/data/device-breakdown'),
  getPlacements: () => fetchJSON<any[]>('/data/placements'),
  getCreatives: () => fetchJSON<any[]>('/data/creatives'),
  getKeywords: () => fetchJSON<any[]>('/data/keywords'),
  getBudgetPacing: () => fetchJSON<any[]>('/data/budget-pacing'),
  getFunnel: () => fetchJSON<any[]>('/data/funnel'),
  getChangeAudit: () => fetchJSON<any[]>('/data/change-audit'),
  getGA4Overview: () => fetchJSON<any[]>('/data/ga4-overview'),
  getGA4Daily: () => fetchJSON<any[]>('/data/ga4-daily'),
  getSEO: () => fetchJSON<any[]>('/data/seo'),
  getSEODaily: () => fetchJSON<any[]>('/data/seo-daily'),
  getCRMPipeline: () => fetchJSON<any[]>('/data/crm-pipeline'),
  getCRMLeads: () => fetchJSON<any[]>('/data/crm-leads'),
  getForecast: () => fetchJSON<any[]>('/data/forecast'),
  chat: async (message: string, sessionId = 'default') => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
    });
    if (!res.ok) throw new Error(`Chat error: ${res.status}`);
    return res.json() as Promise<{ response: string; queriesExecuted: number; elapsed: number }>;
  },
  resetChat: (sessionId = 'default') =>
    fetch(`${API_BASE}/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }),
};
