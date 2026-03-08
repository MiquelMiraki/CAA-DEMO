import { useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Plus, X, GripVertical, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import { useClient } from '../contexts/ClientContext';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const ResponsiveGridLayout = WidthProvider(Responsive);

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Bing Ads': '#00897B',
};
const CHANNELS = Object.keys(CHANNEL_COLORS);

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

// ─── Widget Catalog ───────────────────────────────────────────────────
interface WidgetDef {
  id: string;
  label: string;
  category: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

const WIDGET_CATALOG: WidgetDef[] = [
  { id: 'kpi-spend', label: 'Total Spend', category: 'KPI', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  { id: 'kpi-conversions', label: 'Conversions', category: 'KPI', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  { id: 'kpi-revenue', label: 'Revenue', category: 'KPI', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  { id: 'kpi-roas', label: 'ROAS', category: 'KPI', defaultW: 3, defaultH: 2, minW: 2, minH: 2 },
  { id: 'chart-daily-spend', label: 'Daily Spend by Channel', category: 'Chart', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  { id: 'chart-spend-pie', label: 'Spend Distribution', category: 'Chart', defaultW: 6, defaultH: 4, minW: 3, minH: 3 },
  { id: 'chart-monthly-roas', label: 'Monthly ROAS', category: 'Chart', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  { id: 'chart-conversions-trend', label: 'Conversions Trend', category: 'Chart', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  { id: 'chart-cpa-trend', label: 'CPA Trend', category: 'Chart', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  { id: 'chart-funnel', label: 'Conversion Funnel', category: 'Chart', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  { id: 'table-top-campaigns', label: 'Top Campaigns', category: 'Table', defaultW: 12, defaultH: 5, minW: 6, minH: 3 },
  { id: 'table-budget-pacing', label: 'Budget Pacing', category: 'Table', defaultW: 12, defaultH: 5, minW: 6, minH: 3 },
];

// ─── Default Layout ───────────────────────────────────────────────────
const DEFAULT_WIDGETS = ['kpi-spend', 'kpi-conversions', 'kpi-revenue', 'kpi-roas', 'chart-daily-spend', 'chart-spend-pie'];

function buildDefaultLayout(widgetIds: string[]): Layout[] {
  let x = 0, y = 0;
  return widgetIds.map((id) => {
    const def = WIDGET_CATALOG.find(w => w.id === id)!;
    const layout: Layout = { i: id, x, y, w: def.defaultW, h: def.defaultH, minW: def.minW, minH: def.minH };
    x += def.defaultW;
    if (x >= 12) { x = 0; y += def.defaultH; }
    return layout;
  });
}

// ─── Persistence ──────────────────────────────────────────────────────
function getStorageKey(clientId: string) { return `caa_dashboard_${clientId}`; }

function loadDashboard(clientId: string): { widgets: string[]; layouts: Layout[] } | null {
  try {
    const raw = localStorage.getItem(getStorageKey(clientId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveDashboard(clientId: string, widgets: string[], layouts: Layout[]) {
  localStorage.setItem(getStorageKey(clientId), JSON.stringify({ widgets, layouts }));
}

// ─── Widget Renderer ──────────────────────────────────────────────────
function WidgetContent({ widgetId, data }: { widgetId: string; data: WidgetData }) {
  const { kpi, channelDaily, monthly, funnel, campaigns, budgetPacing } = data;
  const k = kpi?.[0];

  switch (widgetId) {
    case 'kpi-spend':
      return <KPICard title="Total Spend" value={fmtMoney(k?.CURRENT_SPEND || 0)} change={k?.SPEND_CHANGE_PCT} subtitle="vs prev period" />;
    case 'kpi-conversions':
      return <KPICard title="Conversions" value={fmt(k?.CURRENT_CONVERSIONS || 0)} change={k?.CONVERSIONS_CHANGE_PCT} subtitle="vs prev period" />;
    case 'kpi-revenue':
      return <KPICard title="Revenue" value={fmtMoney(k?.CURRENT_REVENUE || 0)} change={k?.REVENUE_CHANGE_PCT} subtitle="vs prev period" />;
    case 'kpi-roas':
      return <KPICard title="ROAS" value={`${(k?.CURRENT_ROAS || 0).toFixed(2)}x`} subtitle="Return on Ad Spend" />;

    case 'chart-daily-spend': {
      const byDate = channelDaily?.reduce((acc: any, row: any) => {
        const d = new Date(row.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[d]) acc[d] = { date: d };
        acc[d][row.CHANNEL] = row.SPEND;
        return acc;
      }, {});
      const chartData: any[] = byDate ? Object.values(byDate) : [];
      return (
        <ChartCard title="Daily Spend by Channel">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} />
              {CHANNELS.map(ch => <Area key={ch} type="monotone" dataKey={ch} stackId="1" stroke={CHANNEL_COLORS[ch]} fill={CHANNEL_COLORS[ch]} fillOpacity={0.3} />)}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'chart-spend-pie': {
      const spendByChannel: Record<string, number> = {};
      monthly?.forEach((m: any) => { spendByChannel[m.CHANNEL] = (spendByChannel[m.CHANNEL] || 0) + m.SPEND; });
      const pieData = Object.entries(spendByChannel).map(([ch, v]) => ({ name: ch, value: v, color: CHANNEL_COLORS[ch] }));
      return (
        <ChartCard title="Spend Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtMoney(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'chart-monthly-roas': {
      const roasMap: Record<string, any> = {};
      monthly?.forEach((m: any) => {
        const lbl = new Date(m.MONTH).toLocaleDateString('en-US', { month: 'short' });
        if (!roasMap[lbl]) roasMap[lbl] = { month: lbl };
        roasMap[lbl][m.CHANNEL] = m.ROAS;
      });
      const roasData: any[] = Object.values(roasMap);
      return (
        <ChartCard title="Monthly ROAS by Channel">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roasData}><CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} />
              {CHANNELS.map(ch => <Bar key={ch} dataKey={ch} fill={CHANNEL_COLORS[ch]} radius={[4,4,0,0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'chart-conversions-trend': {
      const byDate = channelDaily?.reduce((acc: any, row: any) => {
        const d = new Date(row.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[d]) acc[d] = { date: d };
        acc[d][row.CHANNEL] = row.CONVERSIONS;
        return acc;
      }, {});
      const chartData: any[] = byDate ? Object.values(byDate) : [];
      return (
        <ChartCard title="Conversions Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} />
              {CHANNELS.map(ch => <Line key={ch} type="monotone" dataKey={ch} stroke={CHANNEL_COLORS[ch]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'chart-cpa-trend': {
      const byDate = channelDaily?.reduce((acc: any, row: any) => {
        const d = new Date(row.DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[d]) acc[d] = { date: d };
        acc[d][row.CHANNEL] = row.CPA;
        return acc;
      }, {});
      const chartData: any[] = byDate ? Object.values(byDate) : [];
      return (
        <ChartCard title="CPA Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={(v: number) => `€${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} />
              {CHANNELS.map(ch => <Line key={ch} type="monotone" dataKey={ch} stroke={CHANNEL_COLORS[ch]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'chart-funnel': {
      const funnelData = funnel?.map((f: any) => ({
        channel: f.CHANNEL,
        'Click Rate': f.IMPRESSION_TO_CLICK_PCT,
        'Conv Rate': f.CLICK_TO_CONVERSION_PCT,
      })) || [];
      return (
        <ChartCard title="Conversion Funnel">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="channel" tick={{ fill: '#888', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="Click Rate" fill="#C8A84E" radius={[0,4,4,0]} />
              <Bar dataKey="Conv Rate" fill="#22C55E" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }

    case 'table-top-campaigns': {
      const top = campaigns?.slice(0, 8) || [];
      return (
        <ChartCard title="Top Campaigns by ROAS">
          <div className="overflow-auto max-h-[200px]">
            <table className="w-full text-xs">
              <thead><tr className="text-[#555] border-b border-[#1A1A1A]">
                <th className="text-left py-1.5 px-2">Campaign</th><th className="text-left py-1.5 px-2">Channel</th>
                <th className="text-right py-1.5 px-2">Spend</th><th className="text-right py-1.5 px-2">Conv</th><th className="text-right py-1.5 px-2">ROAS</th>
              </tr></thead>
              <tbody>{top.map((c: any, i: number) => (
                <tr key={i} className="border-b border-[#111] text-[#aaa]">
                  <td className="py-1.5 px-2 truncate max-w-[180px]">{c.CAMPAIGN_NAME}</td>
                  <td className="py-1.5 px-2"><span style={{ color: CHANNEL_COLORS[c.CHANNEL] }}>{c.CHANNEL}</span></td>
                  <td className="py-1.5 px-2 text-right">{fmtMoney(c.SPEND)}</td>
                  <td className="py-1.5 px-2 text-right">{fmt(c.CONVERSIONS)}</td>
                  <td className="py-1.5 px-2 text-right font-medium text-white">{c.ROAS?.toFixed(2)}x</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </ChartCard>
      );
    }

    case 'table-budget-pacing': {
      const pacing = budgetPacing?.slice(0, 8) || [];
      return (
        <ChartCard title="Budget Pacing">
          <div className="overflow-auto max-h-[200px]">
            <table className="w-full text-xs">
              <thead><tr className="text-[#555] border-b border-[#1A1A1A]">
                <th className="text-left py-1.5 px-2">Campaign</th><th className="text-right py-1.5 px-2">Budget</th>
                <th className="text-right py-1.5 px-2">Spent</th><th className="text-right py-1.5 px-2">Util %</th><th className="text-left py-1.5 px-2">Status</th>
              </tr></thead>
              <tbody>{pacing.map((p: any, i: number) => (
                <tr key={i} className="border-b border-[#111] text-[#aaa]">
                  <td className="py-1.5 px-2 truncate max-w-[180px]">{p.CAMPAIGN_NAME}</td>
                  <td className="py-1.5 px-2 text-right">{fmtMoney(p.MONTHLY_BUDGET)}</td>
                  <td className="py-1.5 px-2 text-right">{fmtMoney(p.MONTHLY_SPEND)}</td>
                  <td className="py-1.5 px-2 text-right">{p.BUDGET_UTILIZATION_PCT?.toFixed(0)}%</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      p.PACING_STATUS === 'OVERSPENDING' ? 'bg-red-500/10 text-red-400' :
                      p.PACING_STATUS === 'ON_TRACK' ? 'bg-green-500/10 text-green-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>{p.PACING_STATUS}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </ChartCard>
      );
    }

    default:
      return <div className="text-[#555] text-sm p-4">Unknown widget</div>;
  }
}

// ─── Data interface ───────────────────────────────────────────────────
interface WidgetData {
  kpi: any[] | null;
  channelDaily: any[] | null;
  monthly: any[] | null;
  funnel: any[] | null;
  campaigns: any[] | null;
  budgetPacing: any[] | null;
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function CustomDashboard() {
  const { range, label } = useDateRange();
  const { client } = useClient();
  const [showCatalog, setShowCatalog] = useState(false);

  // Load saved dashboard or use defaults
  const saved = useMemo(() => loadDashboard(client.id), [client.id]);
  const [widgets, setWidgets] = useState<string[]>(saved?.widgets || DEFAULT_WIDGETS);
  const [layouts, setLayouts] = useState<Layout[]>(saved?.layouts || buildDefaultLayout(DEFAULT_WIDGETS));

  // Fetch all data sources (only fetches what's needed based on widgets)
  const needsKPI = widgets.some(w => w.startsWith('kpi-'));
  const needsDaily = widgets.some(w => ['chart-daily-spend', 'chart-conversions-trend', 'chart-cpa-trend'].includes(w));
  const needsMonthly = widgets.some(w => ['chart-spend-pie', 'chart-monthly-roas'].includes(w));
  const needsFunnel = widgets.includes('chart-funnel');
  const needsCampaigns = widgets.includes('table-top-campaigns');
  const needsPacing = widgets.includes('table-budget-pacing');

  const { data: kpi, loading: kpiLoading } = useData(() => needsKPI ? api.getKPI(range) : Promise.resolve(null), [range, needsKPI]);
  const { data: channelDaily } = useData(() => needsDaily ? api.getChannelDaily(range) : Promise.resolve(null), [range, needsDaily]);
  const { data: monthly } = useData(() => needsMonthly ? api.getMonthlySummary(range) : Promise.resolve(null), [range, needsMonthly]);
  const { data: funnel } = useData(() => needsFunnel ? api.getFunnel(range) : Promise.resolve(null), [range, needsFunnel]);
  const { data: campaigns } = useData(() => needsCampaigns ? api.getCampaigns(undefined, undefined, range) : Promise.resolve(null), [range, needsCampaigns]);
  const { data: budgetPacing } = useData(() => needsPacing ? api.getBudgetPacing(range) : Promise.resolve(null), [range, needsPacing]);

  const widgetData: WidgetData = { kpi, channelDaily, monthly, funnel, campaigns, budgetPacing };

  const onLayoutChange = useCallback((_: Layout[], allLayouts: any) => {
    const lg = allLayouts.lg || _;
    setLayouts(lg);
    saveDashboard(client.id, widgets, lg);
  }, [client.id, widgets]);

  const addWidget = (widgetId: string) => {
    if (widgets.includes(widgetId)) return;
    const def = WIDGET_CATALOG.find(w => w.id === widgetId)!;
    const maxY = layouts.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newLayout: Layout = { i: widgetId, x: 0, y: maxY, w: def.defaultW, h: def.defaultH, minW: def.minW, minH: def.minH };
    const newWidgets = [...widgets, widgetId];
    const newLayouts = [...layouts, newLayout];
    setWidgets(newWidgets);
    setLayouts(newLayouts);
    saveDashboard(client.id, newWidgets, newLayouts);
  };

  const removeWidget = (widgetId: string) => {
    const newWidgets = widgets.filter(w => w !== widgetId);
    const newLayouts = layouts.filter(l => l.i !== widgetId);
    setWidgets(newWidgets);
    setLayouts(newLayouts);
    saveDashboard(client.id, newWidgets, newLayouts);
  };

  const resetDashboard = () => {
    const w = DEFAULT_WIDGETS;
    const l = buildDefaultLayout(w);
    setWidgets(w);
    setLayouts(l);
    saveDashboard(client.id, w, l);
  };

  if (kpiLoading && needsKPI) return <LoadingSpinner />;

  const availableWidgets = WIDGET_CATALOG.filter(w => !widgets.includes(w.id));
  const categories = [...new Set(availableWidgets.map(w => w.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Custom Dashboard</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Drag, resize, and customize your view · {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1A1A1A] text-[#4A4A4A] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 text-xs font-medium transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showCatalog
                ? 'border-[#C8A84E] text-[#C8A84E] bg-[#C8A84E]/5'
                : 'border-[#1A1A1A] text-[#4A4A4A] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Add Widget
          </button>
        </div>
      </div>

      {/* Widget Catalog */}
      {showCatalog && (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
          <p className="text-white text-sm font-medium mb-3">Available Widgets</p>
          {availableWidgets.length === 0 ? (
            <p className="text-[#555] text-xs">All widgets are already on your dashboard.</p>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-[#555] text-[10px] font-medium tracking-widest mb-1.5">{cat.toUpperCase()}</p>
                  <div className="flex flex-wrap gap-2">
                    {availableWidgets.filter(w => w.category === cat).map(w => (
                      <button
                        key={w.id}
                        onClick={() => addWidget(w.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1A1A1A] text-[#888] text-xs hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 transition-all"
                      >
                        <Plus className="w-3 h-3" /> {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[#555] text-sm mb-2">Your dashboard is empty</p>
          <button
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#C8A84E]/30 text-[#C8A84E] text-xs font-medium hover:bg-[#C8A84E]/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add your first widget
          </button>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="custom-grid"
          layouts={{ lg: layouts }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={50}
          isDraggable
          isResizable
          draggableHandle=".drag-handle"
          onLayoutChange={onLayoutChange}
          compactType="vertical"
          margin={[12, 12]}
        >
          {widgets.map(widgetId => (
            <div key={widgetId} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg overflow-hidden group relative">
              {/* Drag handle + remove button */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5">
                  <GripVertical className="w-3.5 h-3.5 text-[#555]" />
                </div>
                <button onClick={() => removeWidget(widgetId)} className="p-1 rounded hover:bg-red-500/10">
                  <X className="w-3.5 h-3.5 text-[#555] hover:text-red-400" />
                </button>
              </div>
              <div className="h-full overflow-auto p-1">
                <WidgetContent widgetId={widgetId} data={widgetData} />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
