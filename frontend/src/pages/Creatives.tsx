import { useState } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
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

function compareMetric(a: number, b: number): { winner: 'a' | 'b' | 'tie'; diff: string } {
  if (a === b) return { winner: 'tie', diff: '0%' };
  const pct = ((a - b) / Math.max(Math.abs(b), 0.01)) * 100;
  return { winner: a > b ? 'a' : 'b', diff: `${Math.abs(pct).toFixed(1)}%` };
}

export default function Creatives() {
  const { range, label } = useDateRange();
  const { data: creatives, loading: loadingC } = useData(() => api.getCreatives(range), [range]);
  const { data: placements, loading: loadingP } = useData(() => api.getPlacements(range), [range]);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const toggleCompare = (idx: number) => {
    setCompareIds((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= 2) return [prev[1], idx];
      return [...prev, idx];
    });
  };

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

  // --- Placement chart data (filtered by date range) ---
  const marchPlacements = placements || [];
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
      <ChartCard title="Placement Performance" subtitle={`${label} · Spend & ROAS by placement`}>
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

      {/* A/B Comparison Panel */}
      {compareIds.length === 2 && (() => {
        const a = sortedCreatives[compareIds[0]];
        const b = sortedCreatives[compareIds[1]];
        if (!a || !b) return null;

        const metrics = [
          { label: 'Spend', key: 'SPEND', fmt: (v: number) => `\u20AC${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, lower: true },
          { label: 'Conversions', key: 'CONVERSIONS', fmt: (v: number) => v.toLocaleString('en-US'), lower: false },
          { label: 'CTR', key: 'CTR_PCT', fmt: (v: number) => `${v.toFixed(2)}%`, lower: false },
          { label: 'CPA', key: 'CPA', fmt: (v: number) => `\u20AC${v.toFixed(2)}`, lower: true },
          { label: 'ROAS', key: 'ROAS', fmt: (v: number) => v.toFixed(2), lower: false },
        ];

        return (
          <div className="rounded-lg border overflow-hidden" style={{ background: '#0A0A0A', borderColor: '#C8A84E30' }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#1A1A1A' }}>
              <div>
                <h3 className="text-white font-medium text-sm">A/B Creative Comparison</h3>
                <p className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>Side-by-side metric comparison</p>
              </div>
              <button
                onClick={() => setCompareIds([])}
                className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                style={{ borderColor: '#1A1A1A', color: '#808080' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF444460'; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#808080'; }}
              >
                Clear
              </button>
            </div>

            {/* Creative headers */}
            <div className="grid grid-cols-[1fr_80px_1fr] gap-0">
              {/* Creative A header */}
              <div className="p-4 text-center border-r" style={{ borderColor: '#1A1A1A' }}>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-2" style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.15)' }}>A</span>
                <p className="text-white text-sm font-medium truncate">{a.AD_NAME}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: '#4A4A4A' }}>{a.CAMPAIGN_NAME}</p>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ color: FORMAT_COLORS[a.FORMAT] || '#808080', background: FORMAT_BG[a.FORMAT] || 'rgba(128,128,128,0.15)' }}>{a.FORMAT}</span>
                </div>
              </div>

              {/* VS divider */}
              <div className="flex items-center justify-center" style={{ background: '#0D0D0D' }}>
                <span className="text-[#C8A84E] text-xs font-bold">VS</span>
              </div>

              {/* Creative B header */}
              <div className="p-4 text-center border-l" style={{ borderColor: '#1A1A1A' }}>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-2" style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.15)' }}>B</span>
                <p className="text-white text-sm font-medium truncate">{b.AD_NAME}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: '#4A4A4A' }}>{b.CAMPAIGN_NAME}</p>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ color: FORMAT_COLORS[b.FORMAT] || '#808080', background: FORMAT_BG[b.FORMAT] || 'rgba(128,128,128,0.15)' }}>{b.FORMAT}</span>
                </div>
              </div>
            </div>

            {/* Metrics comparison rows */}
            {metrics.map(({ label: metricLabel, key, fmt, lower }) => {
              const valA = a[key] || 0;
              const valB = b[key] || 0;
              const cmp = compareMetric(valA, valB);
              const aWins = lower ? cmp.winner === 'b' : cmp.winner === 'a';
              const bWins = lower ? cmp.winner === 'a' : cmp.winner === 'b';

              return (
                <div key={key} className="grid grid-cols-[1fr_80px_1fr] border-t" style={{ borderColor: '#1A1A1A' }}>
                  <div className={`px-4 py-3 text-right ${aWins ? 'bg-[rgba(34,197,94,0.05)]' : ''}`}>
                    <span className={`text-sm font-medium ${aWins ? 'text-[#22C55E]' : 'text-white'}`}>{fmt(valA)}</span>
                    {aWins && <span className="ml-1.5 text-[10px] text-[#22C55E]">BEST</span>}
                  </div>
                  <div className="px-2 py-3 text-center flex flex-col items-center justify-center" style={{ background: '#0D0D0D' }}>
                    <span className="text-[10px] font-medium" style={{ color: '#4A4A4A' }}>{metricLabel}</span>
                    <span className="text-[10px] mt-0.5" style={{ color: '#C8A84E' }}>{cmp.diff}</span>
                  </div>
                  <div className={`px-4 py-3 text-left ${bWins ? 'bg-[rgba(34,197,94,0.05)]' : ''}`}>
                    {bWins && <span className="mr-1.5 text-[10px] text-[#22C55E]">BEST</span>}
                    <span className={`text-sm font-medium ${bWins ? 'text-[#22C55E]' : 'text-white'}`}>{fmt(valB)}</span>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            {(() => {
              const aScore = metrics.filter(({ key, lower }) => {
                const cmp = compareMetric(a[key] || 0, b[key] || 0);
                return lower ? cmp.winner === 'b' : cmp.winner === 'a';
              }).length;
              const bScore = metrics.length - aScore;
              const winner = aScore > bScore ? 'A' : aScore < bScore ? 'B' : 'Tie';
              const winnerColor = winner === 'A' ? '#3B82F6' : winner === 'B' ? '#8B5CF6' : '#C8A84E';
              return (
                <div className="p-4 border-t text-center" style={{ borderColor: '#1A1A1A' }}>
                  <span className="text-xs" style={{ color: '#4A4A4A' }}>Overall: </span>
                  <span className="text-xs font-bold" style={{ color: winnerColor }}>
                    {winner === 'Tie' ? 'Tie' : `Creative ${winner} wins ${Math.max(aScore, bScore)}/${metrics.length} metrics`}
                  </span>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Creative Performance Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: '#0A0A0A', borderColor: '#1A1A1A' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#1A1A1A' }}>
          <div>
            <h3 className="text-white font-medium text-sm">Creative Performance Table</h3>
            <p className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>
              {compareIds.length < 2 ? `Select 2 creatives to compare (${compareIds.length}/2)` : 'Sorted by ROAS (descending)'}
            </p>
          </div>
          {compareIds.length > 0 && (
            <button
              onClick={() => setCompareIds([])}
              className="text-xs px-3 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: '#1A1A1A', color: '#4A4A4A' }}
            >
              Clear selection
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                <th className="px-3 py-3 w-10" style={{ color: '#808080' }}>
                  <span className="text-[10px]">A/B</span>
                </th>
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
                const isSelected = compareIds.includes(i);
                const selIndex = compareIds.indexOf(i);
                const selLabel = selIndex === 0 ? 'A' : selIndex === 1 ? 'B' : '';
                const selColor = selIndex === 0 ? '#3B82F6' : '#8B5CF6';
                return (
                  <tr
                    key={i}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
                    style={{ borderBottom: '1px solid #1A1A1A' }}
                    onClick={() => toggleCompare(i)}
                  >
                    <td className="px-3 py-3 text-center">
                      {isSelected ? (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
                          style={{ color: selColor, background: `${selColor}20` }}
                        >
                          {selLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#2A2A2A] text-[#2A2A2A] text-[10px]">
                          +
                        </span>
                      )}
                    </td>
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
