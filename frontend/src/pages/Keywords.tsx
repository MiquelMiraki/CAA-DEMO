import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MATCH_COLORS: Record<string, string> = {
  EXACT: '#22C55E',
  PHRASE: '#C8A84E',
  BROAD: '#0668E1',
};

const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(2)}`;

export default function Keywords() {
  const { range } = useDateRange();
  const { data: keywords, loading } = useData(() => api.getKeywords(range), [range]);
  const [filter, setFilter] = useState('');

  const sorted = useMemo(() => {
    if (!keywords) return [];
    return [...keywords].sort((a: any, b: any) => (b.SPEND || 0) - (a.SPEND || 0));
  }, [keywords]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return sorted;
    const q = filter.toLowerCase();
    return sorted.filter((r: any) => (r.KEYWORD || '').toLowerCase().includes(q));
  }, [sorted, filter]);

  if (loading) return <LoadingSpinner />;

  // KPIs
  const totalKeywords = keywords?.length || 0;
  const totalSpend = keywords?.reduce((s: number, r: any) => s + (r.SPEND || 0), 0) || 0;
  const avgCPA = keywords?.length
    ? keywords.reduce((s: number, r: any) => s + (r.CPA || 0), 0) / keywords.length
    : 0;
  const avgROAS = keywords?.length
    ? keywords.reduce((s: number, r: any) => s + (r.ROAS || 0), 0) / keywords.length
    : 0;

  // Match type spend breakdown
  const matchSpend: Record<string, number> = {};
  keywords?.forEach((r: any) => {
    const mt = r.MATCH_TYPE || 'UNKNOWN';
    matchSpend[mt] = (matchSpend[mt] || 0) + (r.SPEND || 0);
  });
  const matchChart = Object.entries(matchSpend).map(([type, spend]) => ({
    type,
    spend,
    color: MATCH_COLORS[type] || '#808080',
  }));

  const roasBadge = (roas: number) => {
    const color = roas >= 3 ? '#22C55E' : roas >= 2 ? '#C8A84E' : '#EF4444';
    return (
      <span
        style={{
          color,
          backgroundColor: `${color}15`,
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        {roas.toFixed(2)}x
      </span>
    );
  };

  const matchBadge = (type: string) => {
    const color = MATCH_COLORS[type] || '#808080';
    return (
      <span
        style={{
          color,
          backgroundColor: `${color}15`,
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Keyword Performance</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">Google Ads & Bing Ads keyword analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Keywords', value: totalKeywords.toLocaleString('en-US') },
          { title: 'Total Spend', value: fmtMoney(totalSpend) },
          { title: 'Avg CPA', value: fmtMoney(avgCPA) },
          { title: 'Avg ROAS', value: `${avgROAS.toFixed(2)}x` },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} />
          </div>
        ))}
      </div>

      {/* Match Type Breakdown */}
      <ChartCard title="Spend by Match Type" subtitle="All keywords">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={matchChart} layout="horizontal">
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis
              dataKey="type"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]}>
              {matchChart.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Keywords Table */}
      <ChartCard title="All Keywords" subtitle={`${filtered.length} keywords · sorted by spend`}>
        {/* Search filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search keywords..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A4A4A] focus:border-[#C8A84E]/50 focus:outline-none w-full max-w-sm transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#808080', borderColor: '#1A1A1A' }} className="border-b">
                <th className="text-left py-2 pr-4">Keyword</th>
                <th className="text-left py-2 px-3">Channel</th>
                <th className="text-left py-2 px-3">Campaign</th>
                <th className="text-left py-2 px-3">Match Type</th>
                <th className="text-right py-2 px-3">Impressions</th>
                <th className="text-right py-2 px-3">Clicks</th>
                <th className="text-right py-2 px-3">CTR</th>
                <th className="text-right py-2 px-3">CPC</th>
                <th className="text-right py-2 px-3">Conv</th>
                <th className="text-right py-2 px-3">CPA</th>
                <th className="text-right py-2 pl-3">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any, i: number) => (
                <tr
                  key={i}
                  style={{ borderColor: '#1A1A1A' }}
                  className="border-b hover:bg-white/5 transition-colors"
                >
                  <td className="py-2.5 pr-4 text-white/80 font-medium">{r.KEYWORD}</td>
                  <td className="py-2.5 px-3" style={{ color: '#808080' }}>{r.CHANNEL}</td>
                  <td className="py-2.5 px-3" style={{ color: '#808080' }}>{r.CAMPAIGN_NAME}</td>
                  <td className="py-2.5 px-3">{matchBadge(r.MATCH_TYPE)}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    {(r.IMPRESSIONS || 0).toLocaleString('en-US')}
                  </td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    {(r.CLICKS || 0).toLocaleString('en-US')}
                  </td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    {(r.CTR_PCT || 0).toFixed(1)}%
                  </td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    ${(r.AVG_CPC || 0).toFixed(2)}
                  </td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    {(r.CONVERSIONS || 0).toLocaleString('en-US')}
                  </td>
                  <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                    ${(r.CPA || 0).toFixed(2)}
                  </td>
                  <td className="text-right py-2.5 pl-3">
                    {roasBadge(r.ROAS || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
