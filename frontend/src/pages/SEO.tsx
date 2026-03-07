import { api } from '../api/client';
import { useData } from '../hooks/useData';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function SEO() {
  const { data: seo, loading } = useData(() => api.getSEO(), []);
  const { data: daily } = useData(() => api.getSEODaily(), []);

  if (loading) return <LoadingSpinner />;

  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    clicks: r.CLICKS,
    impressions: r.IMPRESSIONS,
    position: r.AVG_POSITION,
  }));

  const marchQueries = seo?.filter((s: any) => new Date(s.MONTH).getMonth() === 2)
    .sort((a: any, b: any) => b.CLICKS - a.CLICKS);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">SEO Performance</h2>
        <p className="text-white/40 text-sm mt-1">Google Search Console · Q1 2026</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Daily Organic Clicks" subtitle="90-day trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="clicks" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Position" subtitle="Lower is better">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} reversed domain={[0, 'auto']} />
              <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="position" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top Search Queries" subtitle="March 2026 · Sorted by clicks">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/5">
                <th className="text-left py-2 pr-4">Query</th>
                <th className="text-right py-2 px-3">Clicks</th>
                <th className="text-right py-2 px-3">Impressions</th>
                <th className="text-right py-2 px-3">CTR</th>
                <th className="text-right py-2 px-3">Avg Position</th>
                <th className="text-right py-2 pl-3">vs Feb</th>
              </tr>
            </thead>
            <tbody>
              {marchQueries?.map((q: any, i: number) => {
                const clickChange = q.PREV_MONTH_CLICKS ? ((q.CLICKS - q.PREV_MONTH_CLICKS) / q.PREV_MONTH_CLICKS * 100) : null;
                const posChange = q.PREV_MONTH_POSITION ? q.AVG_POSITION - q.PREV_MONTH_POSITION : null;
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4 text-white/80 font-medium">{q.QUERY}</td>
                    <td className="text-right py-2.5 px-3 text-white/60">{q.CLICKS}</td>
                    <td className="text-right py-2.5 px-3 text-white/60">{q.IMPRESSIONS.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 text-white/60">{q.CTR_PCT}%</td>
                    <td className="text-right py-2.5 px-3">
                      <span className={q.AVG_POSITION <= 3 ? 'text-emerald-400' : q.AVG_POSITION <= 10 ? 'text-yellow-400' : 'text-red-400'}>
                        {q.AVG_POSITION}
                      </span>
                    </td>
                    <td className="text-right py-2.5 pl-3">
                      {clickChange != null && (
                        <span className={`flex items-center justify-end gap-1 ${clickChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {clickChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(clickChange).toFixed(0)}%
                        </span>
                      )}
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
