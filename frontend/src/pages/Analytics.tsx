import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Paid Search': '#4285F4',
  'Organic Search': '#22C55E',
  'Direct': '#8B5CF6',
  'Email': '#F59E0B',
  'Referral': '#EC4899',
  'Other': '#808080',
};

export default function Analytics() {
  const { range, label } = useDateRange();
  const { data: overview, loading } = useData(() => api.getGA4Overview(range), [range]);
  const { data: daily } = useData(() => api.getGA4Daily(range), [range]);

  if (loading) return <LoadingSpinner />;

  const marchData = overview;
  const totalSessions = marchData?.reduce((s: number, r: any) => s + r.SESSIONS, 0) || 0;
  const totalConv = marchData?.reduce((s: number, r: any) => s + r.CONVERSIONS, 0) || 0;
  const totalRev = marchData?.reduce((s: number, r: any) => s + r.REVENUE, 0) || 0;
  const avgEngRate = marchData?.length
    ? marchData.reduce((s: number, r: any) => s + r.ENGAGEMENT_RATE_PCT, 0) / marchData.length
    : 0;

  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sessions: r.SESSIONS,
    conversions: r.CONVERSIONS,
    engRate: r.ENGAGEMENT_RATE_PCT,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Web Analytics</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">Google Analytics 4 · {label}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Sessions', value: `${(totalSessions / 1000).toFixed(1)}K`, subtitle: label },
          { title: 'Conversions', value: totalConv.toLocaleString('en-US'), subtitle: label },
          { title: 'Revenue', value: `€${(totalRev / 1000).toFixed(1)}K`, subtitle: label },
          { title: 'Engagement Rate', value: `${avgEngRate.toFixed(1)}%`, subtitle: label },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      <ChartCard title="Daily Sessions & Conversions" subtitle="90-day trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis yAxisId="left" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#808080' }} />
            <Line yAxisId="left" type="monotone" dataKey="sessions" name="Sessions" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#22C55E" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Traffic by Channel" subtitle={label}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={marchData} layout="vertical">
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="CHANNEL_GROUPING" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="SESSIONS" name="Sessions" radius={[0, 4, 4, 0]}>
              {marchData?.map((entry: any, i: number) => (
                <Cell key={i} fill={CHANNEL_COLORS[entry.CHANNEL_GROUPING] || '#808080'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
