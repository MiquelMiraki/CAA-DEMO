import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': '#6366F1', 'Qualification': '#8B5CF6', 'Needs Analysis': '#A78BFA',
  'Proposal': '#F59E0B', 'Negotiation': '#F97316', 'Closed Won': '#10B981', 'Closed Lost': '#EF4444',
};

export default function CRM() {
  const { data: pipeline, loading } = useData(() => api.getCRMPipeline(), []);
  const { data: leads } = useData(() => api.getCRMLeads(), []);

  if (loading) return <LoadingSpinner />;

  // Aggregate by stage
  const byStage = pipeline?.reduce((acc: any, r: any) => {
    if (!acc[r.STAGE]) acc[r.STAGE] = { stage: r.STAGE, deals: 0, value: 0, weighted: 0 };
    acc[r.STAGE].deals += r.NUM_DEALS;
    acc[r.STAGE].value += r.TOTAL_VALUE;
    acc[r.STAGE].weighted += r.WEIGHTED_VALUE;
    return acc;
  }, {});
  const stageData = byStage ? Object.values(byStage) : [];

  const totalDeals = stageData.reduce((s: number, r: any) => s + r.deals, 0);
  const totalValue = stageData.reduce((s: number, r: any) => s + r.value, 0);
  const totalWeighted = stageData.reduce((s: number, r: any) => s + r.weighted, 0);
  const wonDeals = stageData.find((s: any) => s.stage === 'Closed Won');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">CRM Pipeline</h2>
        <p className="text-white/40 text-sm mt-1">Salesforce · Sales Pipeline & Lead Analysis</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Deals" value={totalDeals.toString()} />
        <KPICard title="Pipeline Value" value={`€${(totalValue / 1000).toFixed(0)}K`} />
        <KPICard title="Weighted Pipeline" value={`€${(totalWeighted / 1000).toFixed(0)}K`} />
        <KPICard title="Won Revenue" value={`€${((wonDeals?.value || 0) / 1000).toFixed(0)}K`} />
      </div>

      <ChartCard title="Pipeline by Stage" subtitle="Deal value distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="stage" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => `€${v.toLocaleString()}`} />
            <Bar dataKey="value" name="Deal Value" radius={[4, 4, 0, 0]}>
              {(stageData as any[]).map((entry: any, i: number) => (
                <Cell key={i} fill={STAGE_COLORS[entry.stage] || '#6B7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Lead Conversion by Source">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/5">
                <th className="text-left py-2">Source</th>
                <th className="text-right py-2 px-3">Total Leads</th>
                <th className="text-right py-2 px-3">Qualified</th>
                <th className="text-right py-2 px-3">Converted</th>
                <th className="text-right py-2 px-3">Conv Rate</th>
                <th className="text-right py-2 pl-3">Funnel</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((l: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 text-white/80 font-medium">{l.LEAD_SOURCE}</td>
                  <td className="text-right py-2.5 px-3 text-white/60">{l.TOTAL_LEADS}</td>
                  <td className="text-right py-2.5 px-3 text-white/60">{l.QUALIFIED_LEADS}</td>
                  <td className="text-right py-2.5 px-3 text-emerald-400">{l.CONVERTED_LEADS}</td>
                  <td className="text-right py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      l.CONVERSION_RATE_PCT >= 20 ? 'bg-emerald-500/15 text-emerald-400' :
                      l.CONVERSION_RATE_PCT >= 10 ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>{l.CONVERSION_RATE_PCT}%</span>
                  </td>
                  <td className="text-right py-2.5 pl-3">
                    <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden inline-block">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${l.CONVERSION_RATE_PCT}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
