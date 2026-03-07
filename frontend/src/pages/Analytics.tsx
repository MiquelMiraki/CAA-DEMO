import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  'Paid Search': '#4285F4', 'Organic Search': '#10B981', 'Direct': '#8B5CF6',
  'Email': '#F59E0B', 'Referral': '#EC4899', 'Other': '#6B7280',
};

export default function Analytics() {
  const { data: overview, loading } = useData(() => api.getGA4Overview(), []);
  const { data: daily } = useData(() => api.getGA4Daily(), []);

  if (loading) return <LoadingSpinner />;

  const marchData = overview?.filter((o: any) => new Date(o.MONTH).getMonth() === 2);
  const totalSessions = marchData?.reduce((s: number, r: any) => s + r.SESSIONS, 0) || 0;
  const totalConv = marchData?.reduce((s: number, r: any) => s + r.CONVERSIONS, 0) || 0;
  const totalRev = marchData?.reduce((s: number, r: any) => s + r.REVENUE, 0) || 0;

  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    sessions: r.SESSIONS,
    conversions: r.CONVERSIONS,
    engRate: r.ENGAGEMENT_RATE_PCT,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Web Analytics (GA4)</h2>
        <p className="text-white/40 text-sm mt-1">Google Analytics 4 · Q1 2026</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Sessions" value={`${(totalSessions / 1000).toFixed(1)}K`} subtitle="March 2026" />
        <KPICard title="Conversions" value={totalConv.toLocaleString()} subtitle="March 2026" />
        <KPICard title="Revenue" value={`€${(totalRev / 1000).toFixed(1)}K`} subtitle="March 2026" />
        <KPICard title="Conv Rate" value={`${totalSessions > 0 ? (totalConv / totalSessions * 100).toFixed(1) : 0}%`} />
      </div>

      <ChartCard title="Daily Sessions & Conversions" subtitle="90-day trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
            <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
            <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="sessions" name="Sessions" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Traffic by Channel" subtitle="March 2026">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={marchData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis type="category" dataKey="CHANNEL_GROUPING" tick={{ fill: '#6b7280', fontSize: 11 }} width={100} />
            <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="SESSIONS" name="Sessions" radius={[0, 4, 4, 0]}>
              {marchData?.map((entry: any, i: number) => (
                <cell key={i} fill={CHANNEL_COLORS[entry.CHANNEL_GROUPING] || '#6B7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
