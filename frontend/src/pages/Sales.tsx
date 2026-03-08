import { useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportCsv } from '../utils/exportCsv';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Microsoft Ads': '#00897B',
  'Bing Ads': '#00897B',
  'Organic Search': '#22C55E',
  'Direct': '#F59E0B',
  'Referral': '#A78BFA',
  'Social Organic': '#EC4899',
};

const STAGE_ORDER = ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS: Record<string, string> = {
  'Prospecting': '#6366F1',
  'Qualification': '#8B5CF6',
  'Needs Analysis': '#A78BFA',
  'Proposal': '#F59E0B',
  'Negotiation': '#F97316',
  'Closed Won': '#22C55E',
  'Closed Lost': '#EF4444',
};

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

export default function Sales() {
  const { range, label } = useDateRange();

  // Fetch all data sources
  const { data: pipeline, loading: pipeLoading } = useData(() => api.getCRMPipeline(), []);
  const { data: leads } = useData(() => api.getCRMLeads(), []);
  const { data: kpi } = useData(() => api.getKPI(range), [range]);
  const { data: monthly } = useData(() => api.getMonthlySummary(range), [range]);
  const { data: funnel } = useData(() => api.getFunnel(range), [range]);

  // ── Sales KPIs ──────────────────────────────────────────
  const salesMetrics = useMemo(() => {
    if (!pipeline) return null;

    const byStage: Record<string, { deals: number; value: number; weighted: number }> = {};
    pipeline.forEach((r: any) => {
      if (!byStage[r.STAGE]) byStage[r.STAGE] = { deals: 0, value: 0, weighted: 0 };
      byStage[r.STAGE].deals += r.NUM_DEALS;
      byStage[r.STAGE].value += r.TOTAL_VALUE;
      byStage[r.STAGE].weighted += r.WEIGHTED_VALUE;
    });

    const won = byStage['Closed Won'] || { deals: 0, value: 0 };
    const lost = byStage['Closed Lost'] || { deals: 0, value: 0 };
    const totalDeals = Object.values(byStage).reduce((s, v) => s + v.deals, 0);
    const totalValue = Object.values(byStage).reduce((s, v) => s + v.value, 0);
    const pipelineValue = totalValue - won.value - lost.value;
    const winRate = (won.deals + lost.deals) > 0
      ? (won.deals / (won.deals + lost.deals) * 100)
      : 0;
    const avgDealSize = won.deals > 0 ? won.value / won.deals : 0;

    return { won, lost, totalDeals, totalValue, pipelineValue, winRate, avgDealSize, byStage };
  }, [pipeline]);

  // ── ROI by Channel: spend vs closed revenue ─────────────
  const channelROI = useMemo(() => {
    if (!monthly || !pipeline) return [];

    // Spend by channel from ads
    const spendByChannel: Record<string, number> = {};
    const revenueByChannel: Record<string, number> = {};
    monthly.forEach((m: any) => {
      spendByChannel[m.CHANNEL] = (spendByChannel[m.CHANNEL] || 0) + m.SPEND;
      revenueByChannel[m.CHANNEL] = (revenueByChannel[m.CHANNEL] || 0) + (m.CONVERSION_VALUE || 0);
    });

    // Closed Won revenue by lead source (approximate channel mapping)
    const closedBySource: Record<string, number> = {};
    pipeline.forEach((r: any) => {
      if (r.STAGE === 'Closed Won' && r.LEAD_SOURCE) {
        closedBySource[r.LEAD_SOURCE] = (closedBySource[r.LEAD_SOURCE] || 0) + r.TOTAL_VALUE;
      }
    });

    // Map lead sources to channels
    const sourceToChannel: Record<string, string> = {
      'Google Ads': 'Google Ads',
      'Meta Ads': 'Meta Ads',
      'Microsoft Ads': 'Microsoft Ads',
      'Bing Ads': 'Bing Ads',
      'Organic Search': 'Organic Search',
      'Direct': 'Direct',
      'Referral': 'Referral',
      'Social Organic': 'Social Organic',
    };

    const allChannels = new Set([...Object.keys(spendByChannel), ...Object.keys(closedBySource)]);
    return Array.from(allChannels).map(ch => {
      const mappedCh = sourceToChannel[ch] || ch;
      const spend = spendByChannel[mappedCh] || 0;
      const adRevenue = revenueByChannel[mappedCh] || 0;
      const closedRevenue = closedBySource[mappedCh] || closedBySource[ch] || 0;
      const roi = spend > 0 ? closedRevenue / spend : 0;
      return {
        channel: ch,
        spend,
        adRevenue,
        closedRevenue,
        roi: parseFloat(roi.toFixed(2)),
        color: CHANNEL_COLORS[ch] || '#808080',
      };
    }).filter(c => c.spend > 0 || c.closedRevenue > 0)
      .sort((a, b) => b.closedRevenue - a.closedRevenue);
  }, [monthly, pipeline]);

  // ── Full Funnel by Channel ──────────────────────────────
  const fullFunnel = useMemo(() => {
    if (!funnel || !leads) return [];

    // Merge ads funnel with lead funnel
    const channels: Record<string, any> = {};
    funnel.forEach((f: any) => {
      if (!channels[f.CHANNEL]) channels[f.CHANNEL] = { channel: f.CHANNEL };
      channels[f.CHANNEL].impressions = (channels[f.CHANNEL].impressions || 0) + f.TOTAL_IMPRESSIONS;
      channels[f.CHANNEL].clicks = (channels[f.CHANNEL].clicks || 0) + f.TOTAL_CLICKS;
      channels[f.CHANNEL].conversions = (channels[f.CHANNEL].conversions || 0) + f.TOTAL_CONVERSIONS;
    });

    leads.forEach((l: any) => {
      const ch = l.LEAD_SOURCE;
      if (!channels[ch]) channels[ch] = { channel: ch };
      channels[ch].totalLeads = l.TOTAL_LEADS;
      channels[ch].qualifiedLeads = l.QUALIFIED_LEADS;
      channels[ch].convertedLeads = l.CONVERTED_LEADS;
      channels[ch].conversionRate = l.CONVERSION_RATE_PCT;
    });

    return Object.values(channels);
  }, [funnel, leads]);

  // ── Pipeline by Stage ───────────────────────────────────
  const stageData = useMemo(() => {
    if (!salesMetrics?.byStage) return [];
    return STAGE_ORDER
      .filter(s => salesMetrics.byStage[s])
      .map(s => ({
        stage: s,
        deals: salesMetrics.byStage[s].deals,
        value: salesMetrics.byStage[s].value,
        color: STAGE_COLORS[s],
      }));
  }, [salesMetrics]);

  // ── Pipeline by Industry ────────────────────────────────
  const industryData = useMemo(() => {
    if (!pipeline) return [];
    const byIndustry: Record<string, { deals: number; value: number; won: number }> = {};
    pipeline.forEach((r: any) => {
      if (!byIndustry[r.INDUSTRY]) byIndustry[r.INDUSTRY] = { deals: 0, value: 0, won: 0 };
      byIndustry[r.INDUSTRY].deals += r.NUM_DEALS;
      byIndustry[r.INDUSTRY].value += r.TOTAL_VALUE;
      if (r.STAGE === 'Closed Won') byIndustry[r.INDUSTRY].won += r.TOTAL_VALUE;
    });
    return Object.entries(byIndustry)
      .map(([industry, data]) => ({ industry, ...data, winPct: data.value > 0 ? (data.won / data.value * 100) : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [pipeline]);

  // ── Pipeline by Deal Size ───────────────────────────────
  const dealSizeData = useMemo(() => {
    if (!pipeline) return [];
    const bySize: Record<string, { deals: number; value: number }> = {};
    pipeline.forEach((r: any) => {
      const size = r.DEAL_SIZE || 'Unknown';
      if (!bySize[size]) bySize[size] = { deals: 0, value: 0 };
      bySize[size].deals += r.NUM_DEALS;
      bySize[size].value += r.TOTAL_VALUE;
    });
    const order = ['Small', 'Medium', 'Large', 'Enterprise'];
    return order
      .filter(s => bySize[s])
      .map((size, i) => ({
        name: size,
        value: bySize[size].value,
        deals: bySize[size].deals,
        color: ['#6366F1', '#8B5CF6', '#C8A84E', '#22C55E'][i],
      }));
  }, [pipeline]);

  if (pipeLoading) return <LoadingSpinner />;

  const k = kpi?.[0];
  const totalAdSpend = k?.CURRENT_SPEND || 0;
  const wonRevenue = salesMetrics?.won.value || 0;
  const realROI = totalAdSpend > 0 ? (wonRevenue / totalAdSpend) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[var(--color-text)] text-xl font-semibold">Sales Performance</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          End-to-end: Ad Spend → Leads → Closed Revenue · {label}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-in">
        <KPICard
          title="Closed Revenue"
          value={fmtMoney(wonRevenue)}
          subtitle={`${salesMetrics?.won.deals || 0} deals won`}
        />
        <KPICard
          title="Ad Spend"
          value={fmtMoney(totalAdSpend)}
          subtitle="All channels"
        />
        <KPICard
          title="Real ROI"
          value={`${realROI.toFixed(1)}x`}
          subtitle="Closed Revenue / Spend"
        />
        <KPICard
          title="Win Rate"
          value={`${(salesMetrics?.winRate || 0).toFixed(1)}%`}
          subtitle="Won / (Won+Lost)"
        />
        <KPICard
          title="Avg Deal Size"
          value={fmtMoney(salesMetrics?.avgDealSize || 0)}
          subtitle="Closed Won avg"
        />
      </div>

      {/* ROI by Channel */}
      <ChartCard
        title="Real ROI by Channel"
        subtitle="Ad Spend vs Closed Won Revenue"
        onExport={() => exportCsv(channelROI, 'channel_roi')}
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={channelROI} barGap={4}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="channel"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="money"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtMoney(v)}
            />
            <YAxis
              yAxisId="roi"
              orientation="right"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}x`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="money" dataKey="spend" name="Ad Spend" fill="#EF4444" opacity={0.7} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="money" dataKey="closedRevenue" name="Closed Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
            <Line yAxisId="roi" type="monotone" dataKey="roi" name="ROI" stroke="#C8A84E" strokeWidth={2} dot={{ r: 4, fill: '#C8A84E' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Full Funnel Table */}
      <ChartCard
        title="Full Funnel by Channel"
        subtitle="Impressions → Clicks → Conversions → Leads → Qualified → Closed"
        onExport={() => exportCsv(fullFunnel, 'full_funnel')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }} className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 font-medium">Channel</th>
                <th className="text-right py-2.5 px-3 font-medium">Impressions</th>
                <th className="text-right py-2.5 px-3 font-medium">Clicks</th>
                <th className="text-right py-2.5 px-3 font-medium">Conversions</th>
                <th className="text-right py-2.5 px-3 font-medium">Total Leads</th>
                <th className="text-right py-2.5 px-3 font-medium">Qualified</th>
                <th className="text-right py-2.5 px-3 font-medium">Closed</th>
                <th className="text-right py-2.5 px-3 font-medium">Conv Rate</th>
              </tr>
            </thead>
            <tbody>
              {fullFunnel.map((row: any, i: number) => (
                <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-text)]/[0.03] transition-colors">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[row.channel] || '#808080' }} />
                      <span className="text-[var(--color-text)]/80 font-medium">{row.channel}</span>
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                    {row.impressions ? fmt(row.impressions) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                    {row.clicks ? fmt(row.clicks) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                    {row.conversions ? fmt(row.conversions) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                    {row.totalLeads ? fmt(row.totalLeads) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                    {row.qualifiedLeads ? fmt(row.qualifiedLeads) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3 font-medium" style={{ color: '#22C55E' }}>
                    {row.convertedLeads ? fmt(row.convertedLeads) : '—'}
                  </td>
                  <td className="text-right py-2.5 px-3">
                    {row.conversionRate != null ? (
                      <span
                        className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                          color: row.conversionRate >= 20 ? '#22C55E' : row.conversionRate >= 10 ? '#C8A84E' : '#EF4444',
                          background: (row.conversionRate >= 20 ? '#22C55E' : row.conversionRate >= 10 ? '#C8A84E' : '#EF4444') + '15',
                        }}
                      >
                        {row.conversionRate}%
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Pipeline + Deal Size Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Pipeline by Stage */}
        <ChartCard title="Pipeline by Stage" subtitle="Deal value at each stage">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageData} layout="vertical">
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtMoney(v)}
              />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Deal Value" radius={[0, 4, 4, 0]}>
                {stageData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Deal Size Distribution */}
        <ChartCard title="Deal Size Distribution" subtitle="Revenue by deal tier">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dealSizeData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={false}
              >
                {dealSizeData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {dealSizeData.map((entry: any) => {
              const total = dealSizeData.reduce((s: number, e: any) => s + e.value, 0);
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-[var(--color-text-secondary)]">{entry.name}</span>
                  </div>
                  <span className="text-[var(--color-text)] font-medium">
                    {pct}% · {fmtMoney(entry.value)} · {entry.deals} deals
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Industry Breakdown Table */}
      <ChartCard
        title="Revenue by Industry"
        subtitle="Pipeline and closed revenue by vertical"
        onExport={() => exportCsv(industryData, 'industry_breakdown')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }} className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 font-medium">Industry</th>
                <th className="text-right py-2.5 px-3 font-medium">Deals</th>
                <th className="text-right py-2.5 px-3 font-medium">Pipeline Value</th>
                <th className="text-right py-2.5 px-3 font-medium">Won Revenue</th>
                <th className="text-right py-2.5 px-3 font-medium">Win %</th>
                <th className="text-right py-2.5 pl-3 w-28">Progress</th>
              </tr>
            </thead>
            <tbody>
              {industryData.map((row, i) => {
                const barColor = row.winPct >= 40 ? '#22C55E' : row.winPct >= 20 ? '#C8A84E' : '#EF4444';
                return (
                  <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-text)]/[0.03] transition-colors">
                    <td className="py-2.5 text-[var(--color-text)]/80 font-medium">{row.industry}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">{row.deals}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">{fmtMoney(row.value)}</td>
                    <td className="text-right py-2.5 px-3 font-medium" style={{ color: '#22C55E' }}>{fmtMoney(row.won)}</td>
                    <td className="text-right py-2.5 px-3">
                      <span
                        className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ color: barColor, background: barColor + '15' }}
                      >
                        {row.winPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="text-right py-2.5 pl-3">
                      <div className="w-24 h-2 rounded-full overflow-hidden inline-block" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(row.winPct, 100)}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
