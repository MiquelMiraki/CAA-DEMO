import { useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import { exportCsv } from '../utils/exportCsv';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';

/* ── Design tokens ─────────────────────────────────────────────── */
const colors = {
  bg:        '#000000',
  surface:   '#0A0A0A',
  border:    '#1A1A1A',
  gold:      '#C8A84E',
  secondary: '#808080',
  muted:     '#4A4A4A',
} as const;

/* ── Status colors ─────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  ON_TRACK:       '#22C55E',
  UNDERSPENDING:  '#C8A84E',
  SEVERELY_UNDER: '#F97316',
  OVERSPENDING:   '#EF4444',
};

/* ── Channel colors ────────────────────────────────────────────── */
const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads':   '#0668E1',
  'Bing Ads':   '#00897B',
};

/* ── Helpers ───────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

const statusLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ── Component ─────────────────────────────────────────────────── */
export default function BudgetPacing() {
  const { range } = useDateRange();
  const { data: raw, loading } = useData(() => api.getBudgetPacing(range), [range]);

  /* --- data from selected date range --- */
  const marchData = useMemo(() => {
    if (!raw) return [];
    return raw
      .map((r: any) => ({
        campaignId:    r.CAMPAIGN_ID,
        campaignName:  r.CAMPAIGN_NAME,
        channel:       r.CHANNEL,
        avgDailyBudget:       r.AVG_DAILY_BUDGET,
        monthlyBudget:        r.MONTHLY_BUDGET,
        monthlySpend:         r.MONTHLY_SPEND,
        daysActive:           r.DAYS_ACTIVE,
        daysInMonth:          r.DAYS_IN_MONTH,
        utilization:          r.BUDGET_UTILIZATION_PCT,
        remainingBudget:      r.REMAINING_BUDGET,
        pacingStatus:         r.PACING_STATUS,
      }))
      .sort((a: any, b: any) => b.utilization - a.utilization);
  }, [raw]);

  /* --- KPI aggregates --- */
  const totalBudget  = marchData.reduce((s, r) => s + r.monthlyBudget, 0);
  const totalSpend   = marchData.reduce((s, r) => s + r.monthlySpend, 0);
  const overallUtil  = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
  const offTrack     = marchData.filter((r) => r.pacingStatus !== 'ON_TRACK').length;

  /* --- chart data: spend vs remaining per campaign --- */
  const chartData = useMemo(
    () =>
      marchData.map((r) => ({
        name:
          r.campaignName.length > 28
            ? r.campaignName.slice(0, 26) + '...'
            : r.campaignName,
        spend:     r.monthlySpend,
        remaining: Math.max(0, r.remainingBudget),
        status:    r.pacingStatus,
      })),
    [marchData],
  );

  if (loading) return <LoadingSpinner />;

  /* ── KPI cards ───────────────────────────────────────────────── */
  const kpis = [
    { title: 'Total Monthly Budget', value: fmt(totalBudget) },
    { title: 'Total Spend',          value: fmt(totalSpend) },
    { title: 'Overall Utilization',  value: `${overallUtil.toFixed(1)}%` },
    { title: 'Campaigns Off Track',  value: String(offTrack) },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white text-xl font-semibold">Budget Pacing</h2>
        <p className="text-[#808080] text-sm mt-1">
          Monthly budget utilization &amp; spend tracking
        </p>
      </div>

      {/* ── KPI cards with stagger animation ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.title}
            className="animate-fade-in"
            style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' }}
          >
            <KPICard title={kpi.title} value={kpi.value} />
          </div>
        ))}
      </div>

      {/* ── Stacked bar chart: Spend vs Remaining ──────────────── */}
      <ChartCard title="Campaign Spend vs Remaining Budget" subtitle="Colored by pacing status" onExport={() => exportCsv(marchData, 'budget_pacing')}>
        <ResponsiveContainer width="100%" height={Math.max(350, marchData.length * 38)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmt(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: colors.secondary }} />
            <Bar dataKey="spend" name="Spend" stackId="budget" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={STATUS_COLORS[entry.status] || colors.gold} />
              ))}
            </Bar>
            <Bar
              dataKey="remaining"
              name="Remaining"
              stackId="budget"
              fill={colors.border}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Detailed table ─────────────────────────────────────── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="p-5 pb-3">
          <h3 className="text-white font-medium text-sm">Campaign Budget Details</h3>
          <p className="text-[#4A4A4A] text-xs mt-0.5">Sorted by utilization (descending)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Campaign', 'Channel', 'Monthly Budget', 'Spend', 'Remaining', 'Utilization %', 'Pacing Status'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 font-medium"
                      style={{ color: colors.muted }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {marchData.map((r) => {
                const statusColor = STATUS_COLORS[r.pacingStatus] || colors.muted;
                const channelColor = CHANNEL_COLORS[r.channel] || colors.secondary;
                return (
                  <tr
                    key={r.campaignId}
                    className="transition-colors hover:bg-[#111]"
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                  >
                    {/* Campaign */}
                    <td className="px-5 py-3 text-white font-medium max-w-[220px] truncate">
                      {r.campaignName}
                    </td>

                    {/* Channel */}
                    <td className="px-5 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ color: channelColor, background: `${channelColor}18` }}
                      >
                        {r.channel}
                      </span>
                    </td>

                    {/* Monthly Budget */}
                    <td className="px-5 py-3 text-[#808080]">{fmt(r.monthlyBudget)}</td>

                    {/* Spend */}
                    <td className="px-5 py-3 text-white">{fmt(r.monthlySpend)}</td>

                    {/* Remaining */}
                    <td className="px-5 py-3 text-[#808080]">{fmt(r.remainingBudget)}</td>

                    {/* Utilization % with mini progress bar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white w-10 text-right">
                          {r.utilization.toFixed(0)}%
                        </span>
                        <div className="w-20 h-2 rounded-full bg-[#1A1A1A]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, r.utilization)}%`,
                              background: statusColor,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Pacing Status badge */}
                    <td className="px-5 py-3">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold"
                        style={{
                          color: statusColor,
                          background: `${statusColor}18`,
                        }}
                      >
                        {statusLabel(r.pacingStatus)}
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
