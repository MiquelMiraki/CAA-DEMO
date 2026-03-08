const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface DateRange {
  from: string;
  to: string;
}

async function fetchJSON<T>(path: string, dateRange?: DateRange): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  let url = `${API_BASE}${path}`;
  if (dateRange) url += `${sep}from=${dateRange.from}&to=${dateRange.to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getKPI: (dr?: DateRange) => fetchJSON<any[]>('/data/kpi', dr),
  getChannelDaily: (dr?: DateRange) => fetchJSON<any[]>('/data/channel-daily', dr),
  getMonthlySummary: (dr?: DateRange) => fetchJSON<any[]>('/data/monthly-summary', dr),
  getWeeklyTrends: (dr?: DateRange) => fetchJSON<any[]>('/data/weekly-trends', dr),
  getCampaigns: (channel?: string, month?: string, dr?: DateRange) => {
    const params = new URLSearchParams();
    if (channel) params.set('channel', channel);
    if (month) params.set('month', month);
    return fetchJSON<any[]>(`/data/campaigns?${params}`, dr);
  },
  getCampaignDaily: (channel?: string, dr?: DateRange) => {
    const params = new URLSearchParams();
    if (channel) params.set('channel', channel);
    return fetchJSON<any[]>(`/data/campaign-daily?${params}`, dr);
  },
  getDeviceBreakdown: (dr?: DateRange) => fetchJSON<any[]>('/data/device-breakdown', dr),
  getPlacements: (dr?: DateRange) => fetchJSON<any[]>('/data/placements', dr),
  getCreatives: (dr?: DateRange) => fetchJSON<any[]>('/data/creatives', dr),
  getKeywords: (dr?: DateRange) => fetchJSON<any[]>('/data/keywords', dr),
  getBudgetPacing: (dr?: DateRange) => fetchJSON<any[]>('/data/budget-pacing', dr),
  getFunnel: (dr?: DateRange) => fetchJSON<any[]>('/data/funnel', dr),
  getChangeAudit: (dr?: DateRange) => fetchJSON<any[]>('/data/change-audit', dr),
  getGA4Overview: (dr?: DateRange) => fetchJSON<any[]>('/data/ga4-overview', dr),
  getGA4Daily: (dr?: DateRange) => fetchJSON<any[]>('/data/ga4-daily', dr),
  getSEO: (dr?: DateRange) => fetchJSON<any[]>('/data/seo', dr),
  getSEODaily: (dr?: DateRange) => fetchJSON<any[]>('/data/seo-daily', dr),
  getCRMPipeline: (dr?: DateRange) => fetchJSON<any[]>('/data/crm-pipeline', dr),
  getCRMLeads: (dr?: DateRange) => fetchJSON<any[]>('/data/crm-leads', dr),
  getAttribution: (dr?: DateRange) => fetchJSON<any[]>('/data/attribution', dr),
  getChannelOverlap: (dr?: DateRange) => fetchJSON<any[]>('/data/channel-overlap', dr),
  getAlerts: (dr?: DateRange) => fetchJSON<any[]>('/data/alerts', dr),
  getForecast: (dr?: DateRange) => fetchJSON<any[]>('/data/forecast', dr),
  chat: async (message: string, sessionId = 'default') => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
    });
    if (!res.ok) throw new Error(`Chat error: ${res.status}`);
    return res.json() as Promise<{ response: string; queriesExecuted: number; elapsed: number; sqlQueries?: { sql: string; purpose: string }[] }>;
  },
  resetChat: (sessionId = 'default') =>
    fetch(`${API_BASE}/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }),
};
