import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import { exportCsv } from '../utils/exportCsv';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Bing Ads': '#00897B',
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

export default function Dashboard() {
  const { range, label } = useDateRange();
  const { data: kpi, loading: kpiLoading } = useData(() => api.getKPI(range), [range]);
  const { data: channelDaily } = useData(() => api.getChannelDaily(range), [range]);
  const { data: monthly } = useData(() => api.getMonthlySummary(range), [range]);
  const { data: funnel } = useData(() => api.getFunnel(range), [range]);

  if (kpiLoading) return <LoadingSpinner />;
  const k = kpi?.[0];

  // --- Daily spend by channel (pivoted for stacked AreaChart) ---
  const dailyByDate = channelDaily?.reduce((acc: any, row: any) => {
    const date = new Date(row.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = { date };
    acc[date][`${row.CHANNEL}_spend`] = row.SPEND;
    return acc;
  }, {});
  const dailyChart: any[] = dailyByDate ? Object.values(dailyByDate) : [];

  // --- Spend distribution pie (aggregate across selected range) ---
  const spendByChannel: Record<string, number> = {};
  monthly?.forEach((m: any) => {
    spendByChannel[m.CHANNEL] = (spendByChannel[m.CHANNEL] || 0) + m.SPEND;
  });
  const latestMonth = Object.entries(spendByChannel).map(([ch, spend]) => ({
    CHANNEL: ch, SPEND: spend,
  }));

  const pieData = latestMonth?.map((m: any) => ({
    name: m.CHANNEL,
    value: m.SPEND,
    color: CHANNEL_COLORS[m.CHANNEL],
  }));

  // --- Monthly ROAS grouped bar data ---
  const monthlyRoasMap: Record<string, any> = {};
  monthly?.forEach((m: any) => {
    const label = new Date(m.MONTH).toLocaleDateString('en-US', { month: 'short' });
    if (!monthlyRoasMap[label]) monthlyRoasMap[label] = { month: label };
    monthlyRoasMap[label][m.CHANNEL] = m.ROAS;
  });
  const monthlyRoasChart: any[] = Object.values(monthlyRoasMap);

  // --- Funnel data (use all data from selected range) ---
  const marchFunnel = funnel;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Dashboard Overview</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Cross-platform performance · {label}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        <KPICard title="Total Spend" value={fmtMoney(k?.CURRENT_SPEND || 0)} change={k?.SPEND_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard title="Conversions" value={fmt(k?.CURRENT_CONVERSIONS || 0)} change={k?.CONVERSIONS_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard title="Revenue" value={fmtMoney(k?.CURRENT_REVENUE || 0)} change={k?.REVENUE_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard
          title="Blended ROAS"
          value={`${k?.CURRENT_ROAS || 0}x`}
          change={k?.CURRENT_ROAS && k?.PREV_ROAS ? ((k.CURRENT_ROAS - k.PREV_ROAS) / k.PREV_ROAS * 100) : null}
          subtitle="vs prev month"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Daily Spend — stacked area */}
        <ChartCard title="Daily Spend by Channel" subtitle="Last 90 days" className="xl:col-span-2" onExport={() => exportCsv(channelDaily || [], 'daily_spend_by_channel')}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyChart}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#4A4A4A', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: '#4A4A4A', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                <Area
                  key={ch}
                  type="monotone"
                  dataKey={`${ch}_spend`}
                  name={ch}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  stackId="spend"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spend Distribution — donut */}
        <ChartCard title="Spend Distribution" subtitle={label}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={false}
              >
                {pieData?.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {pieData?.map((entry: any) => {
              const total = pieData.reduce((s: number, e: any) => s + e.value, 0);
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-[#808080]">{entry.name}</span>
                  </div>
                  <span className="text-white font-medium">{pct}% · {fmtMoney(entry.value)}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly ROAS — grouped bars */}
        <ChartCard title="Monthly ROAS by Channel" subtitle={label} onExport={() => exportCsv(monthly || [], 'monthly_summary')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRoasChart}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                <Bar key={ch} dataKey={ch} name={ch} fill={color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Conversion Funnel — custom HTML */}
        <ChartCard title="Conversion Funnel" subtitle={label}>
          <div className="space-y-3 mt-2">
            {marchFunnel?.map((f: any) => {
              const maxImp = Math.max(...(marchFunnel?.map((x: any) => x.TOTAL_IMPRESSIONS) || [1]));
              return (
                <div key={f.CHANNEL} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: CHANNEL_COLORS[f.CHANNEL] }} className="font-medium">{f.CHANNEL}</span>
                    <span className="text-[var(--color-text-muted)]">AOV: €{f.AVG_ORDER_VALUE}</span>
                  </div>
                  <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{
                      width: `${(f.TOTAL_IMPRESSIONS / maxImp) * 100}%`,
                      background: CHANNEL_COLORS[f.CHANNEL] + '20',
                    }} />
                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{
                      width: `${(f.TOTAL_CLICKS / maxImp) * 100}%`,
                      background: CHANNEL_COLORS[f.CHANNEL] + '40',
                    }} />
                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{
                      width: `${(f.TOTAL_CONVERSIONS / maxImp) * 100}%`,
                      background: CHANNEL_COLORS[f.CHANNEL],
                    }} />
                    <div className="absolute inset-0 flex items-center px-3 text-[11px] text-white/80 gap-4">
                      <span>{(f.TOTAL_IMPRESSIONS / 1000).toFixed(0)}K imp</span>
                      <span>→ {(f.TOTAL_CLICKS / 1000).toFixed(1)}K clicks ({f.IMPRESSION_TO_CLICK_PCT}%)</span>
                      <span>→ {f.TOTAL_CONVERSIONS} conv ({f.CLICK_TO_CONVERSION_PCT}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
