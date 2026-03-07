import { api } from '../api/client';
import { useData } from '../hooks/useData';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

const COLORS: Record<string, string> = { 'Google Ads': '#4285F4', 'Meta Ads': '#0668E1', 'Bing Ads': '#00897B' };

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

const TITLES: Record<string, string> = { google: 'Google Ads', meta: 'Meta Ads', bing: 'Bing Ads' };
const CHANNELS: Record<string, string> = { google: 'Google Ads', meta: 'Meta Ads', bing: 'Bing Ads' };

interface Props {
  platform: 'google' | 'meta' | 'bing';
}

export default function PlatformPage({ platform }: Props) {
  const channel = CHANNELS[platform];
  const title = TITLES[platform];
  const color = COLORS[channel];
  const { data: daily, loading } = useData(() => api.getCampaignDaily(channel), [channel]);
  const { data: campaigns } = useData(() => api.getCampaigns(channel, '2026-03-01'), [channel]);
  const { data: monthly } = useData(() => api.getMonthlySummary(), []);
  const { data: devices } = useData(() => api.getDeviceBreakdown(), []);

  if (loading) return <LoadingSpinner />;

  // Process daily data
  const chartData = daily?.map((r: any) => ({
    date: new Date(r.DATE).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    spend: r.SPEND,
    conversions: r.CONVERSIONS,
    roas: r.ROAS,
    ctr: r.CTR_PCT,
  }));

  // Monthly data for this channel
  const channelMonthly = monthly?.filter((m: any) => m.CHANNEL === channel);
  const marchData = channelMonthly?.find((m: any) => new Date(m.MONTH).getMonth() === 2);
  const febData = channelMonthly?.find((m: any) => new Date(m.MONTH).getMonth() === 1);

  // Devices for this channel
  const channelDevices = devices?.filter((d: any) => d.CHANNEL === channel && new Date(d.MONTH).getMonth() === 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color }}>{title}</h2>
        <p className="text-white/40 text-sm mt-1">Q1 2026 Performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Spend" value={fmtMoney(marchData?.SPEND || 0)} change={marchData?.SPEND_MOM_CHANGE_PCT} prefix="" />
        <KPICard title="Conversions" value={fmt(marchData?.CONVERSIONS || 0)} change={marchData?.CONVERSIONS_MOM_CHANGE_PCT} />
        <KPICard title="ROAS" value={`${marchData?.ROAS || 0}x`} change={febData?.ROAS ? ((marchData?.ROAS - febData.ROAS) / febData.ROAS * 100) : null} />
        <KPICard title="CTR" value={`${marchData?.CTR_PCT || 0}%`} />
        <KPICard title="CPA" value={fmtMoney(marchData?.CPA || 0)} />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Daily Spend & Conversions" subtitle="90-day trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke={color} strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily ROAS" subtitle="90-day trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="roas" name="ROAS" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Campaigns Table & Device Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Campaign Performance" subtitle="March 2026 · Sorted by ROAS" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="text-left py-2 pr-4">Campaign</th>
                  <th className="text-right py-2 px-2">Spend</th>
                  <th className="text-right py-2 px-2">Conv</th>
                  <th className="text-right py-2 px-2">ROAS</th>
                  <th className="text-right py-2 px-2">CPA</th>
                  <th className="text-right py-2 pl-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {campaigns?.slice(0, 12).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="text-white/80">{c.CAMPAIGN_NAME}</span>
                      <span className="ml-2 text-white/30 text-[10px]">{c.CAMPAIGN_TYPE}</span>
                    </td>
                    <td className="text-right py-2.5 px-2 text-white/60">{fmtMoney(c.SPEND)}</td>
                    <td className="text-right py-2.5 px-2 text-white/60">{c.CONVERSIONS}</td>
                    <td className="text-right py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        c.ROAS >= 3 ? 'bg-emerald-500/15 text-emerald-400' :
                        c.ROAS >= 1 ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>{c.ROAS}x</span>
                    </td>
                    <td className="text-right py-2.5 px-2 text-white/60">{c.CPA ? fmtMoney(c.CPA) : '-'}</td>
                    <td className="text-right py-2.5 pl-2">
                      {c.PREV_MONTH_ROAS != null && (
                        <span className={`text-[11px] ${c.ROAS > c.PREV_MONTH_ROAS ? 'text-emerald-400' : 'text-red-400'}`}>
                          {c.ROAS > c.PREV_MONTH_ROAS ? '↑' : '↓'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Device Split" subtitle="March 2026">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={channelDevices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
              <YAxis type="category" dataKey="DEVICE" tick={{ fill: '#6b7280', fontSize: 11 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="SPEND" name="Spend" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {channelDevices?.map((d: any) => (
              <div key={d.DEVICE} className="flex justify-between text-xs text-white/50">
                <span>{d.DEVICE}</span>
                <span>ROAS: <span className="text-white/80">{d.ROAS}x</span> · CPA: <span className="text-white/80">{fmtMoney(d.CPA)}</span></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
