import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import { useClient } from '../contexts/ClientContext';
import { fmtMoney, moneyAxis } from '../utils/formatMoney';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportCsv } from '../utils/exportCsv';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

/* ── Formatters ───────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` :
  n.toFixed(0);

/* ── Platform mapping ─────────────────────────────────────────── */
const PLATFORM_MAP: Record<string, { channel: string; title: string; color: string }> = {
  google:      { channel: 'Google Ads',           title: 'Google Ads',      color: '#4285F4' },
  meta:        { channel: 'Meta Ads',             title: 'Meta Ads',        color: '#0668E1' },
  bing:        { channel: 'Bing Ads',             title: 'Bing Ads',        color: '#00897B' },
  tiktok:      { channel: 'TikTok Ads',           title: 'TikTok Ads',      color: '#FE2C55' },
  influencers: { channel: 'Influencer Marketing', title: 'Influencer Marketing', color: '#8B5CF6' },
};

/* ── Props ────────────────────────────────────────────────────── */
interface Props {
  platform: 'google' | 'meta' | 'bing' | 'tiktok' | 'influencers';
}

/* ── Component ────────────────────────────────────────────────── */
export default function PlatformPage({ platform }: Props) {
  const { channel, title, color } = PLATFORM_MAP[platform];
  const { range } = useDateRange();
  const { client } = useClient();
  const money = (n: number) => fmtMoney(n, client.currency);
  const axisFmt = moneyAxis(client.currency);

  const { data: campaigns, loading: campsLoading } = useData(() => api.getCampaigns(channel, undefined, range), [channel, range]);
  const { data: daily, loading: dailyLoading } = useData(() => api.getCampaignDaily(channel, range), [channel, range]);
  const { data: devices, loading: devicesLoading } = useData(() => api.getDeviceBreakdown(range), [range]);

  const loading = campsLoading || dailyLoading || devicesLoading;
  if (loading) return <LoadingSpinner />;

  /* ── Aggregate KPIs from campaign data ─────────────────────── */
  const channelCampaigns = campaigns?.filter((c: any) => c.CHANNEL === channel) ?? [];
  const totalSpend       = channelCampaigns.reduce((s: number, c: any) => s + (c.SPEND || 0), 0);
  const totalImpressions = channelCampaigns.reduce((s: number, c: any) => s + (c.IMPRESSIONS || 0), 0);
  const totalClicks      = channelCampaigns.reduce((s: number, c: any) => s + (c.CLICKS || 0), 0);
  const totalConversions = channelCampaigns.reduce((s: number, c: any) => s + (c.CONVERSIONS || 0), 0);
  const totalConvValue   = channelCampaigns.reduce((s: number, c: any) => s + (c.CONVERSION_VALUE || 0), 0);
  const avgRoas          = totalSpend > 0 ? totalConvValue / totalSpend : 0;

  /* ── Daily chart data ──────────────────────────────────────── */
  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    spend: r.SPEND,
    conversions: r.CONVERSIONS,
    roas: r.ROAS,
  })) ?? [];

  /* ── Device data for this channel ──────────────────────────── */
  const channelDevices = devices?.filter((d: any) => d.CHANNEL === channel) ?? [];

  /* ── Sorted campaigns for table ────────────────────────────── */
  const sortedCampaigns = [...channelCampaigns].sort((a: any, b: any) => (b.ROAS || 0) - (a.ROAS || 0));

  /* ── ROAS badge helper ─────────────────────────────────────── */
  const roasBadge = (roas: number) => {
    if (roas >= 3) return 'bg-emerald-500/15 text-emerald-400';
    if (roas >= 2) return 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]';
    return 'bg-red-500/15 text-red-400';
  };

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold" style={{ color }}>
          {title}
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          Platform performance overview
        </p>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Spend',       value: money(totalSpend),          delay: 0 },
          { title: 'Impressions', value: fmt(totalImpressions),      delay: 1 },
          { title: 'Clicks',      value: fmt(totalClicks),           delay: 2 },
          { title: 'Conversions', value: fmt(totalConversions),      delay: 3 },
          { title: 'ROAS',        value: `${avgRoas.toFixed(2)}x`,   delay: 4 },
        ].map((kpi) => (
          <div
            key={kpi.title}
            className="animate-fade-in-up"
            style={{ animationDelay: `${kpi.delay * 80}ms`, animationFillMode: 'both' }}
          >
            <KPICard title={kpi.title} value={kpi.value} />
          </div>
        ))}
      </div>

      {/* ── Daily Spend + Conversions (dual-axis) ────────────── */}
      <ChartCard title="Daily Spend & Conversions" subtitle="Dual-axis trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={{ stroke: '#1A1A1A' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={axisFmt}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Daily ROAS AreaChart ──────────────────────────────── */}
      <ChartCard title="Daily ROAS" subtitle="Area trend with gradient fill">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`roasGrad-${platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={{ stroke: '#1A1A1A' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="roas"
              name="ROAS"
              stroke={color}
              strokeWidth={2}
              fill={`url(#roasGrad-${platform})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Campaign Performance Table ────────────────────────── */}
      <ChartCard title="Campaign Performance" subtitle="Sorted by ROAS" onExport={() => exportCsv(sortedCampaigns, `${title.replace(' ', '_')}_campaigns`)}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Campaign', 'Type', 'Spend', 'Impressions', 'Clicks', 'Conversions', 'CPA', 'ROAS'].map((h) => (
                  <th
                    key={h}
                    className={`py-2.5 font-medium text-[var(--color-text-muted)] cursor-pointer select-none hover:text-[var(--color-text-secondary)] transition-colors ${
                      h === 'Campaign' || h === 'Type' ? 'text-left pr-4' : 'text-right px-2'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.slice(0, 15).map((c: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 pr-4 text-white/80 max-w-[220px] truncate">
                    {c.CAMPAIGN_NAME}
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--color-text-muted)] text-[10px]">
                    {c.CAMPAIGN_TYPE}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[var(--color-text-secondary)]">
                    {money(c.SPEND || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[var(--color-text-secondary)]">
                    {fmt(c.IMPRESSIONS || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[var(--color-text-secondary)]">
                    {fmt(c.CLICKS || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[var(--color-text-secondary)]">
                    {fmt(c.CONVERSIONS || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[var(--color-text-secondary)]">
                    {c.CPA ? money(c.CPA) : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${roasBadge(c.ROAS || 0)}`}
                    >
                      {(c.ROAS || 0).toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── Device Breakdown (horizontal bar) ─────────────────── */}
      <ChartCard title="Device Breakdown" subtitle="Spend by device">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={channelDevices} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={{ stroke: '#1A1A1A' }}
              tickLine={false}
              tickFormatter={axisFmt}
            />
            <YAxis
              type="category"
              dataKey="DEVICE"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="SPEND" name="Spend" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {channelDevices.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-[var(--color-border)] pt-3">
            {channelDevices.map((d: any) => (
              <div key={d.DEVICE} className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>{d.DEVICE}</span>
                <span>
                  ROAS: <span className="text-white/80">{(d.ROAS || 0).toFixed(2)}x</span>
                  {' · '}
                  Conv: <span className="text-white/80">{fmt(d.CONVERSIONS || 0)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
