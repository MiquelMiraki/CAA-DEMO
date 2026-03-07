import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function SEO() {
  const { data: seo, loading } = useData(() => api.getSEO(), []);
  const { data: daily } = useData(() => api.getSEODaily(), []);

  if (loading) return <LoadingSpinner />;

  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: r.CLICKS,
    impressions: r.IMPRESSIONS,
    position: r.AVG_POSITION,
  }));

  const marchQueries = seo
    ?.filter((s: any) => new Date(s.MONTH).getMonth() === 2)
    .sort((a: any, b: any) => b.CLICKS - a.CLICKS);

  const totalClicks = marchQueries?.reduce((s: number, r: any) => s + r.CLICKS, 0) || 0;
  const totalImpressions = marchQueries?.reduce((s: number, r: any) => s + r.IMPRESSIONS, 0) || 0;
  const avgCTR = marchQueries?.length
    ? marchQueries.reduce((s: number, r: any) => s + r.CTR_PCT, 0) / marchQueries.length
    : 0;
  const avgPosition = marchQueries?.length
    ? marchQueries.reduce((s: number, r: any) => s + r.AVG_POSITION, 0) / marchQueries.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">SEO Performance</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">Google Search Console · Q1 2026</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Clicks', value: totalClicks.toLocaleString('en-US'), subtitle: 'March 2026' },
          { title: 'Impressions', value: totalImpressions.toLocaleString('en-US'), subtitle: 'March 2026' },
          { title: 'Avg CTR', value: `${avgCTR.toFixed(1)}%`, subtitle: 'March 2026' },
          { title: 'Avg Position', value: avgPosition.toFixed(1), subtitle: 'March 2026' },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Daily Clicks" subtitle="90-day trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Position" subtitle="Lower is better">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} reversed domain={[0, 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="position" name="Avg Position" stroke="#C8A84E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top Search Queries" subtitle="March 2026 · Sorted by clicks">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#808080', borderColor: '#1A1A1A' }} className="border-b">
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
                const clickChange = q.PREV_MONTH_CLICKS
                  ? ((q.CLICKS - q.PREV_MONTH_CLICKS) / q.PREV_MONTH_CLICKS) * 100
                  : null;
                const posColor =
                  q.AVG_POSITION <= 3 ? '#22C55E' : q.AVG_POSITION <= 10 ? '#C8A84E' : '#EF4444';
                return (
                  <tr
                    key={i}
                    style={{ borderColor: '#1A1A1A' }}
                    className="border-b hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-white/80 font-medium">{q.QUERY}</td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                      {q.CLICKS.toLocaleString('en-US')}
                    </td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                      {q.IMPRESSIONS.toLocaleString('en-US')}
                    </td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                      {q.CTR_PCT}%
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span
                        style={{
                          color: posColor,
                          backgroundColor: `${posColor}15`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {q.AVG_POSITION}
                      </span>
                    </td>
                    <td className="text-right py-2.5 pl-3">
                      {clickChange != null && (
                        <span
                          className="flex items-center justify-end gap-1"
                          style={{ color: clickChange > 0 ? '#22C55E' : '#EF4444' }}
                        >
                          {clickChange > 0 ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
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
