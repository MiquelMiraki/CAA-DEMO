import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';

/* ── Constants ───────────────────────────────────────────────── */
const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical' },
  warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Warning' },
  info:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'Info' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active:       { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Active' },
  acknowledged: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Ack' },
  resolved:     { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', label: 'Resolved' },
};

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads':   '#0668E1',
  'Bing Ads':   '#00897B',
};

const METRIC_ICONS: Record<string, string> = {
  CPA: '$',
  ROAS: '%',
  CTR: '%',
  SPEND: '$',
  CONVERSIONS: '#',
  IMPRESSIONS: '#',
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date('2026-03-08T12:00:00');
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'SPEND') return value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(0)}`;
  if (metric === 'CPA' || metric === 'CPC') return `$${value.toFixed(2)}`;
  if (metric === 'ROAS') return `${value.toFixed(2)}x`;
  if (metric === 'CTR') return `${value.toFixed(2)}%`;
  if (metric === 'IMPRESSIONS') return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
  return `${value}`;
}

/* ── Component ───────────────────────────────────────────────── */
export default function Alerts() {
  const { range } = useDateRange();
  const { data: alerts, loading } = useData(() => api.getAlerts(range), [range]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  /* --- Computed data --- */
  const sorted = useMemo(() => {
    if (!alerts) return [];
    return [...alerts].sort(
      (a: any, b: any) => new Date(b.ALERT_DATETIME).getTime() - new Date(a.ALERT_DATETIME).getTime()
    );
  }, [alerts]);

  const filtered = useMemo(() => {
    return sorted.filter((a: any) => {
      if (severityFilter !== 'all' && a.SEVERITY !== severityFilter) return false;
      if (statusFilter !== 'all' && a.STATUS !== statusFilter) return false;
      if (channelFilter !== 'all' && a.CHANNEL !== channelFilter) return false;
      return true;
    });
  }, [sorted, severityFilter, statusFilter, channelFilter]);

  /* --- KPIs --- */
  const totalAlerts = sorted.length;
  const activeAlerts = sorted.filter((a: any) => a.STATUS === 'active').length;
  const criticalActive = sorted.filter((a: any) => a.SEVERITY === 'critical' && a.STATUS === 'active').length;
  const resolvedThisWeek = sorted.filter((a: any) => {
    if (a.STATUS !== 'resolved') return false;
    const d = new Date(a.ALERT_DATETIME);
    const weekAgo = new Date('2026-03-01');
    return d >= weekAgo;
  }).length;

  /* --- Chart: alerts by channel --- */
  const channelCounts = useMemo(() => {
    const map: Record<string, { critical: number; warning: number; info: number }> = {};
    sorted.forEach((a: any) => {
      if (!map[a.CHANNEL]) map[a.CHANNEL] = { critical: 0, warning: 0, info: 0 };
      map[a.CHANNEL][a.SEVERITY as 'critical' | 'warning' | 'info']++;
    });
    return Object.entries(map).map(([channel, counts]) => ({
      channel,
      critical: counts.critical,
      warning: counts.warning,
      info: counts.info,
      total: counts.critical + counts.warning + counts.info,
    }));
  }, [sorted]);

  /* --- Chart: alerts by metric --- */
  const metricCounts = useMemo(() => {
    const map: Record<string, number> = {};
    sorted.forEach((a: any) => {
      map[a.METRIC] = (map[a.METRIC] || 0) + 1;
    });
    return Object.entries(map)
      .map(([metric, count]) => ({ metric, count }))
      .sort((a, b) => b.count - a.count);
  }, [sorted]);

  /* --- Chart: alerts timeline (by day) --- */
  const timeline = useMemo(() => {
    const map: Record<string, { critical: number; warning: number; info: number }> = {};
    sorted.forEach((a: any) => {
      const day = a.ALERT_DATETIME.slice(0, 10);
      if (!map[day]) map[day] = { critical: 0, warning: 0, info: 0 };
      map[day][a.SEVERITY as 'critical' | 'warning' | 'info']++;
    });
    return Object.entries(map)
      .map(([date, counts]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...counts,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sorted]);

  if (loading) return <LoadingSpinner />;

  const channels = [...new Set(sorted.map((a: any) => a.CHANNEL))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Alerts & Anomaly Detection</h1>
        <p className="text-[#4A4A4A] text-sm mt-1">Automated anomaly detection across all channels</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Alerts" value={String(totalAlerts)} subtitle="All severities" />
        <KPICard
          title="Active Alerts"
          value={String(activeAlerts)}
          subtitle="Require attention"
        />
        <KPICard
          title="Critical Active"
          value={String(criticalActive)}
          subtitle="Immediate action needed"
        />
        <KPICard
          title="Resolved This Month"
          value={String(resolvedThisWeek)}
          subtitle="Successfully addressed"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts by Channel */}
        <ChartCard title="Alerts by Channel" subtitle="Severity breakdown per channel">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channelCounts}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} name="Critical" />
              <Bar dataKey="warning" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} name="Warning" />
              <Bar dataKey="info" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Info" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Alerts Timeline */}
        <ChartCard title="Alert Timeline" subtitle="Daily alert volume by severity">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Critical" />
              <Line type="monotone" dataKey="warning" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Warning" />
              <Line type="monotone" dataKey="info" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Info" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Most Affected Metrics */}
      <ChartCard title="Most Affected Metrics" subtitle="Number of anomalies detected per metric">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metricCounts} layout="vertical">
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="metric" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill="#C8A84E" radius={[0, 4, 4, 0]} name="Alerts">
              {metricCounts.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#C8A84E'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Severity filter */}
        <div className="flex gap-1 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-1">
          {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                severityFilter === s
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#4A4A4A] hover:text-white/60'
              }`}
            >
              {s === 'all' ? 'All Severity' : (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_CONFIG[s]?.color }}
                  />
                  {SEVERITY_CONFIG[s]?.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-1">
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#4A4A4A] hover:text-white/60'
              }`}
            >
              {s === 'all' ? 'All Status' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {/* Channel filter */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#C8A84E]/30"
        >
          <option value="all">All Channels</option>
          {channels.map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-2">
        {filtered.map((alert: any) => {
          const sev = SEVERITY_CONFIG[alert.SEVERITY] || SEVERITY_CONFIG.info;
          const stat = STATUS_CONFIG[alert.STATUS] || STATUS_CONFIG.active;
          const channelColor = CHANNEL_COLORS[alert.CHANNEL] || '#808080';
          const isNegative = alert.DIRECTION === 'down' || (alert.DIRECTION === 'up' && ['CPA', 'SPEND'].includes(alert.METRIC));
          const changeColor = isNegative ? '#EF4444' : '#22C55E';

          return (
            <div
              key={alert.ALERT_ID}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 transition-all duration-200 hover:border-[#2A2A2A]"
              style={{ borderLeftWidth: 3, borderLeftColor: sev.color }}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {/* Severity badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: sev.color, backgroundColor: sev.bg }}
                    >
                      {sev.label}
                    </span>
                    {/* Status badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ color: stat.color, backgroundColor: stat.bg }}
                    >
                      {stat.label}
                    </span>
                    {/* Channel */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ color: channelColor, backgroundColor: `${channelColor}15` }}
                    >
                      {alert.CHANNEL}
                    </span>
                    {/* Metric */}
                    <span className="text-[10px] text-[#4A4A4A] font-medium">
                      {alert.METRIC}
                    </span>
                    {/* Time */}
                    <span className="text-[10px] text-[#333] ml-auto whitespace-nowrap">
                      {timeAgo(alert.ALERT_DATETIME)}
                    </span>
                  </div>

                  {/* Campaign name */}
                  <p className="text-white/90 text-sm font-medium mb-1">{alert.CAMPAIGN}</p>

                  {/* Message */}
                  <p className="text-[#4A4A4A] text-xs leading-relaxed">{alert.MESSAGE}</p>
                </div>

                {/* Right: metric change */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xl font-bold" style={{ color: changeColor }}>
                      {alert.DIRECTION === 'up' ? '+' : ''}{alert.CHANGE_PCT?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#4A4A4A] mt-1 space-y-0.5">
                    <div>
                      Now: <span className="text-white/70">{formatMetricValue(alert.METRIC, alert.CURRENT_VALUE)}</span>
                    </div>
                    <div>
                      Avg: <span className="text-white/50">{formatMetricValue(alert.METRIC, alert.BASELINE_VALUE)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#4A4A4A] text-sm">No alerts match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
