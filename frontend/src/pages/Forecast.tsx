import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
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

/* ── Channel config ────────────────────────────────────────────── */
const CHANNELS = ['Google Ads', 'Meta Ads', 'Bing Ads'] as const;
const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads':   '#0668E1',
  'Bing Ads':   '#00897B',
};

/* ── Component ─────────────────────────────────────────────────── */
export default function Forecast() {
  const { data: forecast, loading } = useData(() => api.getForecast(), []);
  const [selectedChannel, setSelectedChannel] = useState<string>('Google Ads');
  const [spendIncrease, setSpendIncrease] = useState(0);
  const [forecastDays, setForecastDays] = useState(30);

  /* --- filtered channel rows --- */
  const channelData = useMemo(() => {
    if (!forecast) return [];
    return forecast
      .filter((r: any) => r.CHANNEL === selectedChannel)
      .map((r: any) => ({
        date: new Date(r.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend: r.SPEND,
        conversions: r.CONVERSIONS,
        revenue: r.REVENUE,
        roas: r.ROAS,
        spend7d: r.SPEND_7D_AVG,
        conv7d: r.CONVERSIONS_7D_AVG,
        rev7d: r.REVENUE_7D_AVG,
      }));
  }, [forecast, selectedChannel]);

  /* --- projected data with efficiency decay --- */
  const forecastData = useMemo(() => {
    if (!channelData.length) return [];
    const last30 = channelData.slice(-30);
    const avgSpend = last30.reduce((s, r) => s + r.spend, 0) / last30.length;
    const avgConv  = last30.reduce((s, r) => s + r.conversions, 0) / last30.length;
    const avgRev   = last30.reduce((s, r) => s + r.revenue, 0) / last30.length;

    // Efficiency decay: for every 10% budget increase, ROAS drops ~2%
    const multiplier       = 1 + spendIncrease / 100;
    const efficiencyFactor = 1 - Math.max(0, spendIncrease) * 0.002;
    const projSpend = avgSpend * multiplier;
    const projConv  = avgConv  * multiplier * efficiencyFactor;
    const projRev   = avgRev   * multiplier * efficiencyFactor;
    const projRoas  = projSpend > 0 ? projRev / projSpend : 0;

    const result = [];
    for (let i = 1; i <= forecastDays; i++) {
      const dayNoise = 1 + Math.sin(i * 0.3) * 0.05;
      result.push({
        date: `Day +${i}`,
        spend:       +(projSpend * dayNoise).toFixed(2),
        conversions: Math.round(projConv * dayNoise),
        revenue:     +(projRev * dayNoise).toFixed(2),
        roas:        +(projRoas * dayNoise).toFixed(2),
        isProjection: true,
      });
    }
    return result;
  }, [channelData, spendIncrease, forecastDays]);

  /* --- combined timeline --- */
  const combinedData = useMemo(() => {
    const historical = channelData.slice(-30).map((r) => ({ ...r, isProjection: false }));
    return [...historical, ...forecastData];
  }, [channelData, forecastData]);

  /* --- summary KPIs --- */
  const totalProjectedSpend = forecastData.reduce((s, r) => s + r.spend, 0);
  const totalProjectedConv  = forecastData.reduce((s, r) => s + r.conversions, 0);
  const totalProjectedRev   = forecastData.reduce((s, r) => s + r.revenue, 0);
  const projectedRoas       = totalProjectedSpend > 0 ? totalProjectedRev / totalProjectedSpend : 0;

  /* --- "Today" divider position --- */
  const todayLabel = channelData.slice(-30).at(-1)?.date ?? '';

  if (loading) return <LoadingSpinner />;

  /* ── KPI cards with stagger animation ────────────────────────── */
  const kpis = [
    { label: 'Projected Spend',       value: `$${(totalProjectedSpend / 1000).toFixed(1)}K`, color: 'text-white' },
    { label: 'Projected Conversions',  value: totalProjectedConv.toLocaleString(),            color: 'text-emerald-400' },
    { label: 'Projected Revenue',      value: `$${(totalProjectedRev / 1000).toFixed(1)}K`,  color: 'text-white' },
    {
      label: 'Expected ROAS',
      value: `${projectedRoas.toFixed(2)}x`,
      color: projectedRoas >= 2 ? 'text-emerald-400' : projectedRoas >= 1 ? 'text-[#C8A84E]' : 'text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white text-xl font-semibold">Forecast Simulator</h2>
        <p className="text-[#808080] text-sm mt-1">
          Budget scenario modeling &amp; projections
        </p>
      </div>

      {/* ── Controls panel ─────────────────────────────────────── */}
      <div
        className="rounded-lg p-6"
        style={{ background: colors.surface, border: `1px solid ${colors.gold}33` }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Channel selector */}
          <div>
            <label className="text-[#808080] text-xs uppercase tracking-wider block mb-2">
              Channel
            </label>
            <div className="flex gap-2">
              {CHANNELS.map((ch) => {
                const active = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active ? 'text-white shadow-lg' : 'text-[#4A4A4A] hover:text-[#808080]'
                    }`}
                    style={
                      active
                        ? { background: CHANNEL_COLORS[ch] }
                        : { background: `${colors.border}` }
                    }
                  >
                    {ch.replace(' Ads', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget slider */}
          <div>
            <label className="text-[#808080] text-xs uppercase tracking-wider block mb-2">
              Budget Change:{' '}
              <span
                className={`font-bold ${
                  spendIncrease > 0
                    ? 'text-emerald-400'
                    : spendIncrease < 0
                    ? 'text-red-400'
                    : 'text-white'
                }`}
              >
                {spendIncrease > 0 ? '+' : ''}
                {spendIncrease}%
              </span>
            </label>
            <input
              type="range"
              min={-50}
              max={100}
              step={5}
              value={spendIncrease}
              onChange={(e) => setSpendIncrease(+e.target.value)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: colors.gold, background: colors.border }}
            />
            <div className="flex justify-between text-[10px] text-[#4A4A4A] mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="text-[#808080] text-xs uppercase tracking-wider block mb-2">
              Forecast Period
            </label>
            <div className="flex gap-2">
              {[14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setForecastDays(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    forecastDays === d
                      ? 'text-black'
                      : 'text-[#4A4A4A] hover:text-[#808080]'
                  }`}
                  style={
                    forecastDays === d
                      ? { background: colors.gold }
                      : { background: colors.border }
                  }
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Projected KPI cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
          {kpis.map((kpi, idx) => (
            <div
              key={kpi.label}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' }}
            >
              <p className="text-[#4A4A4A] text-xs">{kpi.label}</p>
              <p className={`text-lg font-semibold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chart: Spend & Revenue ────────────────────────── */}
      <ChartCard title="Spend & Revenue Projection" subtitle="Historical (solid) + Forecast (dashed)">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: colors.muted, fontSize: 10 }}
              interval={3}
              axisLine={{ stroke: colors.border }}
              tickLine={{ stroke: colors.border }}
            />
            <YAxis
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: colors.secondary }} />
            <ReferenceLine
              x={todayLabel}
              stroke={colors.muted}
              strokeDasharray="4 4"
              label={{ value: 'Today', fill: colors.secondary, fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke={CHANNEL_COLORS[selectedChannel]}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Secondary chart: Conversions ───────────────────────── */}
      <ChartCard title="Conversions Projection">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: colors.muted, fontSize: 10 }}
              interval={3}
              axisLine={{ stroke: colors.border }}
              tickLine={{ stroke: colors.border }}
            />
            <YAxis
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke={colors.gold}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
