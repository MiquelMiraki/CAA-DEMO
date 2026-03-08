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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Bing Ads': '#00897B',
};

const MODEL_COLORS = {
  first_touch: '#F59E0B',
  last_touch: '#8B5CF6',
  linear: '#22C55E',
};

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);

const fmtMoney = (n: number) =>
  n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

export default function Attribution() {
  const { range, label } = useDateRange();
  const { data: attribution, loading: loadingA } = useData(() => api.getAttribution(range), [range]);
  const { data: overlap, loading: loadingO } = useData(() => api.getChannelOverlap(range), [range]);

  if (loadingA || loadingO) return <LoadingSpinner />;

  // Aggregate attribution across all months in range
  const channelAgg = useMemo(() => {
    if (!attribution) return [];
    const map: Record<string, any> = {};
    attribution.forEach((r: any) => {
      const ch = r.CHANNEL;
      if (!map[ch]) {
        map[ch] = {
          channel: ch,
          firstTouch: 0, lastTouch: 0, linear: 0,
          firstRev: 0, lastRev: 0, linearRev: 0,
          assisted: 0, touchpoints: 0,
        };
      }
      map[ch].firstTouch += r.FIRST_TOUCH_CONVERSIONS || 0;
      map[ch].lastTouch += r.LAST_TOUCH_CONVERSIONS || 0;
      map[ch].linear += r.LINEAR_CONVERSIONS || 0;
      map[ch].firstRev += r.FIRST_TOUCH_REVENUE || 0;
      map[ch].lastRev += r.LAST_TOUCH_REVENUE || 0;
      map[ch].linearRev += r.LINEAR_REVENUE || 0;
      map[ch].assisted += r.ASSISTED_CONVERSIONS || 0;
      map[ch].touchpoints += r.TOTAL_TOUCHPOINTS || 0;
    });
    return Object.values(map);
  }, [attribution]);

  // Aggregate overlap
  const overlapAgg = useMemo(() => {
    if (!overlap) return [];
    const map: Record<string, any> = {};
    overlap.forEach((r: any) => {
      const key = `${r.SOURCE_CHANNEL}→${r.ASSIST_CHANNEL}`;
      if (!map[key]) {
        map[key] = {
          source: r.SOURCE_CHANNEL,
          assist: r.ASSIST_CHANNEL,
          conversions: 0,
          revenue: 0,
        };
      }
      map[key].conversions += r.SHARED_CONVERSIONS || 0;
      map[key].revenue += r.SHARED_REVENUE || 0;
    });
    return Object.values(map).sort((a: any, b: any) => b.conversions - a.conversions);
  }, [overlap]);

  // KPIs
  const totalConv = channelAgg.reduce((s, r) => s + r.linear, 0);
  const totalAssisted = channelAgg.reduce((s, r) => s + r.assisted, 0);
  const assistedRatio = totalConv > 0 ? ((totalAssisted / totalConv) * 100).toFixed(1) : '0';
  const totalOverlap = overlapAgg.reduce((s: number, r: any) => s + r.conversions, 0);

  // Find biggest attribution gap (channel where first-touch >> last-touch, i.e. initiator)
  const biggestInitiator = channelAgg.reduce((best, r) => {
    const gap = r.firstTouch - r.lastTouch;
    return gap > (best?.gap || 0) ? { channel: r.channel, gap } : best;
  }, { channel: 'N/A', gap: 0 });

  // Chart: Model comparison grouped bars
  const modelComparisonData = channelAgg.map((r) => ({
    channel: r.channel,
    'First Touch': r.firstTouch,
    'Last Touch': r.lastTouch,
    'Linear': r.linear,
  }));

  // Radar chart data (normalized to percentage of total per model)
  const totalFirst = channelAgg.reduce((s, r) => s + r.firstTouch, 0);
  const totalLast = channelAgg.reduce((s, r) => s + r.lastTouch, 0);
  const totalLinear = channelAgg.reduce((s, r) => s + r.linear, 0);

  const radarData = channelAgg.map((r) => ({
    channel: r.channel,
    'First Touch': totalFirst > 0 ? +((r.firstTouch / totalFirst) * 100).toFixed(1) : 0,
    'Last Touch': totalLast > 0 ? +((r.lastTouch / totalLast) * 100).toFixed(1) : 0,
    'Linear': totalLinear > 0 ? +((r.linear / totalLinear) * 100).toFixed(1) : 0,
  }));

  // Assisted vs Direct chart
  const assistedVsDirectData = channelAgg.map((r) => ({
    channel: r.channel,
    'Direct (Last Touch)': r.lastTouch,
    'Assisted': r.assisted,
  }));

  // Channel channels list for overlap matrix
  const channels = ['Google Ads', 'Meta Ads', 'Bing Ads'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Cross-Channel Attribution</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          Multi-touch attribution analysis · {label}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Conversions (Linear)', value: fmt(totalConv), subtitle: label },
          { title: 'Assisted Conversions', value: fmt(totalAssisted), subtitle: `${assistedRatio}% of total` },
          { title: 'Cross-Channel Paths', value: fmt(totalOverlap), subtitle: 'Multi-channel journeys' },
          { title: 'Top Initiator', value: biggestInitiator.channel, subtitle: `+${fmt(biggestInitiator.gap)} first-touch gap` },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      {/* Model Comparison: Grouped Bar Chart */}
      <ChartCard
        title="Attribution Model Comparison"
        subtitle="Conversions per channel under different models"
        onExport={() => exportCsv(modelComparisonData, 'attribution_model_comparison')}
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={modelComparisonData}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis
              dataKey="channel"
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
            <Bar dataKey="First Touch" fill={MODEL_COLORS.first_touch} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Last Touch" fill={MODEL_COLORS.last_touch} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Linear" fill={MODEL_COLORS.linear} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Radar Chart: Channel share by model */}
        <ChartCard title="Channel Share by Model" subtitle="% of conversions per attribution model">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1A1A1A" />
              <PolarAngleAxis
                dataKey="channel"
                tick={{ fill: '#808080', fontSize: 11 }}
              />
              <PolarRadiusAxis
                tick={{ fill: '#4A4A4A', fontSize: 9 }}
                domain={[0, 'auto']}
                axisLine={false}
              />
              <Radar
                name="First Touch"
                dataKey="First Touch"
                stroke={MODEL_COLORS.first_touch}
                fill={MODEL_COLORS.first_touch}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Last Touch"
                dataKey="Last Touch"
                stroke={MODEL_COLORS.last_touch}
                fill={MODEL_COLORS.last_touch}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Linear"
                dataKey="Linear"
                stroke={MODEL_COLORS.linear}
                fill={MODEL_COLORS.linear}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Assisted vs Direct */}
        <ChartCard title="Assisted vs Direct Conversions" subtitle="How often each channel assists vs closes">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={assistedVsDirectData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis
                dataKey="channel"
                tick={{ fill: '#4A4A4A', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#4A4A4A', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
              <Bar
                dataKey="Direct (Last Touch)"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Assisted"
                fill="#C8A84E"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Channel Interaction Matrix */}
      <ChartCard
        title="Channel Interaction Matrix"
        subtitle="How channels assist each other in conversion paths"
        onExport={() => exportCsv(overlapAgg.map((r: any) => ({
          'Source Channel': r.source,
          'Assisted By': r.assist,
          'Shared Conversions': r.conversions,
          'Shared Revenue': r.revenue,
        })), 'channel_overlap')}
      >
        <div className="overflow-x-auto">
          {/* Matrix header */}
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">
                  Source → Assist
                </th>
                {channels.map((ch) => (
                  <th
                    key={ch}
                    className="text-center py-3 px-4 font-medium"
                    style={{ color: CHANNEL_COLORS[ch] }}
                  >
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((source) => (
                <tr
                  key={source}
                  className="border-t border-[var(--color-border)]"
                >
                  <td
                    className="py-3 px-4 font-medium"
                    style={{ color: CHANNEL_COLORS[source] }}
                  >
                    {source}
                  </td>
                  {channels.map((assist) => {
                    if (source === assist) {
                      return (
                        <td
                          key={assist}
                          className="text-center py-3 px-4"
                        >
                          <span className="text-[var(--color-text-muted)]">—</span>
                        </td>
                      );
                    }
                    const match = overlapAgg.find(
                      (r: any) => r.source === source && r.assist === assist
                    );
                    const conv = match?.conversions || 0;
                    const rev = match?.revenue || 0;
                    // Intensity for background
                    const maxConv = Math.max(...overlapAgg.map((r: any) => r.conversions), 1);
                    const intensity = conv / maxConv;
                    return (
                      <td
                        key={assist}
                        className="text-center py-3 px-4"
                      >
                        <div
                          className="rounded-lg px-3 py-2 mx-auto inline-block min-w-[80px]"
                          style={{
                            background: `rgba(200, 168, 78, ${0.05 + intensity * 0.25})`,
                          }}
                        >
                          <div className="text-white font-medium text-sm">
                            {conv}
                          </div>
                          <div className="text-[var(--color-text-muted)] text-[10px]">
                            {fmtMoney(rev)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interpretation */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
            Read as: <span className="text-white">Row channel</span> is the source (first touch),
            <span className="text-white"> Column channel</span> assisted the conversion.
            Higher numbers = stronger cross-channel synergy.
          </p>
        </div>
      </ChartCard>

      {/* Revenue by Model — detailed table */}
      <ChartCard
        title="Revenue Attribution by Model"
        subtitle="How revenue is distributed under each model"
        onExport={() => exportCsv(channelAgg.map((r) => ({
          Channel: r.channel,
          'First Touch Conv': r.firstTouch,
          'Last Touch Conv': r.lastTouch,
          'Linear Conv': r.linear,
          'First Touch Rev': r.firstRev,
          'Last Touch Rev': r.lastRev,
          'Linear Rev': r.linearRev,
          'Assisted Conv': r.assisted,
          'Total Touchpoints': r.touchpoints,
        })), 'attribution_detail')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 px-3 font-medium text-[var(--color-text-muted)]">Channel</th>
                <th className="text-right py-2.5 px-3 font-medium" style={{ color: MODEL_COLORS.first_touch }}>First Touch</th>
                <th className="text-right py-2.5 px-3 font-medium" style={{ color: MODEL_COLORS.last_touch }}>Last Touch</th>
                <th className="text-right py-2.5 px-3 font-medium" style={{ color: MODEL_COLORS.linear }}>Linear</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--color-gold)]">Assisted</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--color-text-muted)]">First Rev</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--color-text-muted)]">Last Rev</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--color-text-muted)]">Linear Rev</th>
                <th className="text-right py-2.5 px-3 font-medium text-[var(--color-text-muted)]">Touchpoints</th>
              </tr>
            </thead>
            <tbody>
              {channelAgg.map((r) => {
                const chColor = CHANNEL_COLORS[r.channel] || '#808080';
                // Highlight if first-touch significantly differs from last-touch
                const isInitiator = r.firstTouch > r.lastTouch * 1.05;
                const isCloser = r.lastTouch > r.firstTouch * 1.05;
                return (
                  <tr
                    key={r.channel}
                    className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: chColor }} />
                        <span className="text-white font-medium">{r.channel}</span>
                        {isInitiator && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                            Initiator
                          </span>
                        )}
                        {isCloser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                            Closer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                      {fmt(r.firstTouch)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">
                      {fmt(r.lastTouch)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-white font-medium">
                      {fmt(r.linear)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-gold)]">
                      {fmt(r.assisted)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-muted)]">
                      {fmtMoney(r.firstRev)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-muted)]">
                      {fmtMoney(r.lastRev)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-muted)]">
                      {fmtMoney(r.linearRev)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-muted)]">
                      {r.touchpoints.toLocaleString()}
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
