import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Bing Ads': '#00897B',
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2035] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/60 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: kpi, loading: kpiLoading } = useData(() => api.getKPI(), []);
  const { data: channelDaily } = useData(() => api.getChannelDaily(), []);
  const { data: monthly } = useData(() => api.getMonthlySummary(), []);
  const { data: funnel } = useData(() => api.getFunnel(), []);

  if (kpiLoading) return <LoadingSpinner />;
  const k = kpi?.[0];

  // Process channel daily for chart
  const dailyByDate = channelDaily?.reduce((acc: any, row: any) => {
    const date = new Date(row.DATE).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = { date };
    acc[date][`${row.CHANNEL}_spend`] = row.SPEND;
    acc[date][`${row.CHANNEL}_conv`] = row.CONVERSIONS;
    acc[date][`${row.CHANNEL}_roas`] = row.ROAS;
    return acc;
  }, {});
  const dailyChart = dailyByDate ? Object.values(dailyByDate) : [];

  // Monthly pie chart for spend distribution
  const latestMonth = monthly?.filter((m: any) => {
    const d = new Date(m.MONTH);
    return d.getMonth() === 2; // March
  });

  const pieData = latestMonth?.map((m: any) => ({
    name: m.CHANNEL,
    value: m.SPEND,
    color: CHANNEL_COLORS[m.CHANNEL],
  }));

  // Funnel data for March
  const marchFunnel = funnel?.filter((f: any) => new Date(f.MONTH).getMonth() === 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Dashboard Overview</h2>
        <p className="text-white/40 text-sm mt-1">Cross-platform performance · Q1 2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Spend" value={fmtMoney(k?.CURRENT_SPEND || 0)} change={k?.SPEND_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard title="Conversions" value={fmt(k?.CURRENT_CONVERSIONS || 0)} change={k?.CONVERSIONS_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard title="Revenue" value={fmtMoney(k?.CURRENT_REVENUE || 0)} change={k?.REVENUE_CHANGE_PCT} subtitle="vs prev month" />
        <KPICard title="Blended ROAS" value={`${k?.CURRENT_ROAS || 0}x`} change={k?.CURRENT_ROAS && k?.PREV_ROAS ? ((k.CURRENT_ROAS - k.PREV_ROAS) / k.PREV_ROAS * 100) : null} subtitle="vs prev month" />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Daily Spend by Channel" subtitle="Last 90 days" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                <Line key={ch} type="monotone" dataKey={`${ch}_spend`} name={ch} stroke={color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spend Distribution" subtitle="March 2026">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#4b5563' }}
              >
                {pieData?.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monthly Comparison & Funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Monthly ROAS by Channel" subtitle="Q1 2026">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="MONTH" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { month: 'short' })} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                <Bar key={ch} dataKey="ROAS" name={ch} fill={color} radius={[4, 4, 0, 0]}
                  data={monthly?.filter((m: any) => m.CHANNEL === ch)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion Funnel" subtitle="March 2026">
          <div className="space-y-3 mt-2">
            {marchFunnel?.map((f: any) => {
              const maxImp = Math.max(...(marchFunnel?.map((x: any) => x.TOTAL_IMPRESSIONS) || [1]));
              return (
                <div key={f.CHANNEL} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: CHANNEL_COLORS[f.CHANNEL] }} className="font-medium">{f.CHANNEL}</span>
                    <span className="text-white/40">AOV: €{f.AVG_ORDER_VALUE}</span>
                  </div>
                  <div className="relative h-8 rounded-lg overflow-hidden bg-white/5">
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
