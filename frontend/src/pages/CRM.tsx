import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': '#6366F1',
  'Qualification': '#8B5CF6',
  'Needs Analysis': '#A78BFA',
  'Proposal': '#F59E0B',
  'Negotiation': '#F97316',
  'Closed Won': '#22C55E',
  'Closed Lost': '#EF4444',
};

export default function CRM() {
  const { data: pipeline, loading } = useData(() => api.getCRMPipeline(), []);
  const { data: leads } = useData(() => api.getCRMLeads(), []);

  if (loading) return <LoadingSpinner />;

  const byStage = pipeline?.reduce((acc: any, r: any) => {
    if (!acc[r.STAGE]) acc[r.STAGE] = { stage: r.STAGE, deals: 0, value: 0, weighted: 0 };
    acc[r.STAGE].deals += r.NUM_DEALS;
    acc[r.STAGE].value += r.TOTAL_VALUE;
    acc[r.STAGE].weighted += r.WEIGHTED_VALUE;
    return acc;
  }, {});
  const stageData: any[] = byStage ? Object.values(byStage) : [];

  const totalDeals = stageData.reduce((s: number, r: any) => s + r.deals, 0);
  const totalValue = stageData.reduce((s: number, r: any) => s + r.value, 0);
  const totalWeighted = stageData.reduce((s: number, r: any) => s + r.weighted, 0);
  const wonDeals = stageData.find((s: any) => s.stage === 'Closed Won');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">CRM Pipeline</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">Sales Pipeline & Lead Analysis</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Deals', value: totalDeals.toLocaleString('en-US'), subtitle: 'All stages' },
          { title: 'Pipeline Value', value: `€${(totalValue / 1000).toFixed(0)}K`, subtitle: 'Total value' },
          { title: 'Weighted Pipeline', value: `€${(totalWeighted / 1000).toFixed(0)}K`, subtitle: 'Probability-adjusted' },
          { title: 'Won Revenue', value: `€${((wonDeals?.value || 0) / 1000).toFixed(0)}K`, subtitle: 'Closed Won' },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      <ChartCard title="Pipeline by Stage" subtitle="Deal value distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stageData}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey="stage" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: '#4A4A4A', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Deal Value" radius={[4, 4, 0, 0]}>
              {stageData.map((entry: any, i: number) => (
                <Cell key={i} fill={STAGE_COLORS[entry.stage] || '#808080'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Lead Conversion by Source" subtitle="Funnel performance">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#808080', borderColor: '#1A1A1A' }} className="border-b">
                <th className="text-left py-2">Source</th>
                <th className="text-right py-2 px-3">Total Leads</th>
                <th className="text-right py-2 px-3">Qualified</th>
                <th className="text-right py-2 px-3">Converted</th>
                <th className="text-right py-2 px-3">Conv Rate</th>
                <th className="text-right py-2 pl-3 w-32">Progress</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((l: any, i: number) => {
                const rateColor =
                  l.CONVERSION_RATE_PCT >= 20 ? '#22C55E' : l.CONVERSION_RATE_PCT >= 10 ? '#C8A84E' : '#EF4444';
                return (
                  <tr
                    key={i}
                    style={{ borderColor: '#1A1A1A' }}
                    className="border-b hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 text-white/80 font-medium">{l.LEAD_SOURCE}</td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                      {l.TOTAL_LEADS.toLocaleString('en-US')}
                    </td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#808080' }}>
                      {l.QUALIFIED_LEADS.toLocaleString('en-US')}
                    </td>
                    <td className="text-right py-2.5 px-3" style={{ color: '#22C55E' }}>
                      {l.CONVERTED_LEADS.toLocaleString('en-US')}
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span
                        style={{
                          color: rateColor,
                          backgroundColor: `${rateColor}15`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {l.CONVERSION_RATE_PCT}%
                      </span>
                    </td>
                    <td className="text-right py-2.5 pl-3">
                      <div
                        className="w-24 h-2 rounded-full overflow-hidden inline-block"
                        style={{ backgroundColor: '#1A1A1A' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${l.CONVERSION_RATE_PCT}%`, backgroundColor: rateColor }}
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
