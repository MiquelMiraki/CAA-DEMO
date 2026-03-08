import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';

const FORMAT_COLORS: Record<string, string> = {
  IMAGE: '#0668E1',
  CAROUSEL: '#8B5CF6',
  VIDEO: '#EC4899',
};

const FORMAT_BG: Record<string, string> = {
  IMAGE: 'rgba(6,104,225,0.15)',
  CAROUSEL: 'rgba(139,92,246,0.15)',
  VIDEO: 'rgba(236,72,153,0.15)',
};

function roasBadge(roas: number) {
  if (roas >= 3) return { color: '#22C55E', bg: 'rgba(34,197,94,0.15)' };
  if (roas >= 2) return { color: '#C8A84E', bg: 'rgba(200,168,78,0.15)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
}

export default function Creatives() {
  const { data: creatives, loading: loadingC } = useData(() => api.getCreatives(), []);
  const { data: placements, loading: loadingP } = useData(() => api.getPlacements(), []);

  if (loadingC || loadingP) return <LoadingSpinner />;

  // --- KPI calculations ---
  const totalCreatives = creatives?.length || 0;
  const avgRoas = creatives?.length
    ? creatives.reduce((s: number, r: any) => s + (r.ROAS || 0), 0) / creatives.length
    : 0;
  const totalSpend = creatives?.reduce((s: number, r: any) => s + (r.SPEND || 0), 0) || 0;

  // Best performing format by avg ROAS
  const formatMap: Record<string, { sum: number; count: number }> = {};
  creatives?.forEach((r: any) => {
    const f = r.FORMAT || 'OTHER';
    if (!formatMap[f]) formatMap[f] = { sum: 0, count: 0 };
    formatMap[f].sum += r.ROAS || 0;
    formatMap[f].count += 1;
  });
  const bestFormat = Object.entries(formatMap).sort(
    (a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count,
  )[0]?.[0] || 'N/A';

  // --- Format breakdown chart data ---
  const formatChartData = Object.entries(formatMap).map(([format, { sum, count }]) => ({
    format,
    ROAS: parseFloat((sum / count).toFixed(2)),
  }));

  // --- Placement chart data (March only) ---
  const marchPlacements = placements?.filter((p: any) => {
    const d = new Date(p.MONTH);
    return d.getMonth() === 2; // March
  }) || [];
  const placementChartData = marchPlacements.map((p: any) => ({
    placement: p.PLACEMENT,
    Spend: p.SPEND,
    ROAS: p.ROAS,
  }));

  // --- Creative table sorted by ROAS desc ---
  const sortedCreatives = [...(creatives || [])].sort(
    (a: any, b: any) => (b.ROAS || 0) - (a.ROAS || 0),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Creative Performance</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">
          Meta Ads creative analysis &amp; placement insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Creatives', value: totalCreatives.toLocaleString('en-US'), subtitle: 'All creatives' },
          { title: 'Avg ROAS', value: avgRoas.toFixed(2), subtitle: 'Across all creatives' },
          { title: 'Best Performing Format', value: bestFormat, subtitle: 'By avg ROAS' },
          { title: 'Total Spend', value: `\u20AC${(totalSpend / 1000).toFixed(1)}K`, subtitle: 'All creatives' },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      {/* Format Breakdown */}
      <ChartCard title="ROAS by Format" subtitle="Average ROAS per creative format">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formatChartData} layout="horizontal">
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey="format" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="ROAS" name="ROAS" radius={[4, 4, 0, 0]}>
              {formatChartData.map((entry, i) => (
                <Cell key={i} fill={FORMAT_COLORS[entry.format] || '#808080'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Placement Performance */}
      <ChartCard title="Placement Performance" subtitle="March · Spend & ROAS by placement">
        <ResponsiveContainer width="100%" height={Math.max(250, placementChartData.length * 40)}>
          <BarChart data={placementChartData} layout="vertical">
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="placement"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
            <Bar dataKey="Spend" name="Spend" fill="#C8A84E" radius={[0, 4, 4, 0]} />
            <Bar dataKey="ROAS" name="ROAS" fill="#22C55E" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Creative Performance Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: '#0A0A0A', borderColor: '#1A1A1A' }}
      >
        <div className="p-5 border-b" style={{ borderColor: '#1A1A1A' }}>
          <h3 className="text-white font-medium text-sm">Creative Performance Table</h3>
          <p className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>
            Sorted by ROAS (descending)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                {['Campaign', 'Ad Name', 'Format', 'Headline', 'Spend', 'Conversions', 'CTR', 'CPA', 'ROAS'].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-3 font-medium"
                      style={{ color: '#808080' }}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sortedCreatives.map((row: any, i: number) => {
                const roas = row.ROAS || 0;
                const rb = roasBadge(roas);
                const format = row.FORMAT || 'OTHER';
                return (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid #1A1A1A' }}
                  >
                    <td className="px-4 py-3 text-white">{row.CAMPAIGN_NAME}</td>
                    <td className="px-4 py-3 text-white">{row.AD_NAME}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          color: FORMAT_COLORS[format] || '#808080',
                          background: FORMAT_BG[format] || 'rgba(128,128,128,0.15)',
                        }}
                      >
                        {format}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#808080' }}>
                      {row.HEADLINE}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {'\u20AC'}{(row.SPEND || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-white">{(row.CONVERSIONS || 0).toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-white">{(row.CTR_PCT || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-white">
                      {'\u20AC'}{(row.CPA || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{ color: rb.color, background: rb.bg }}
                      >
                        {roas.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
