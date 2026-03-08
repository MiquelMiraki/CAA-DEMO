import { useState, useRef, useEffect } from 'react';
import { Calendar, ArrowUp, ArrowDown, Minus, ArrowLeftRight } from 'lucide-react';
import { api, type DateRange } from '../api/client';
import { useData } from '../hooks/useData';
import { exportCsv } from '../utils/exportCsv';
import ChartCard from '../components/ChartCard';
import ChartTooltip from '../components/ChartTooltip';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';

/* ─── Presets ─── */
const PRESETS: { label: string; from: string; to: string }[] = [
  { label: 'January 2026', from: '2026-01-01', to: '2026-01-31' },
  { label: 'February 2026', from: '2026-02-01', to: '2026-02-28' },
  { label: 'March 2026', from: '2026-03-01', to: '2026-03-31' },
  { label: 'Q1 2026', from: '2026-01-01', to: '2026-03-31' },
];

function formatLabel(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  // Full month
  if (f.getDate() === 1 && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
    && f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
    return f.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  // Full quarter
  if (f.getDate() === 1 && f.getMonth() % 3 === 0
    && t.getMonth() === f.getMonth() + 2
    && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()) {
    const q = Math.floor(f.getMonth() / 3) + 1;
    return `Q${q} ${f.getFullYear()}`;
  }
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(f)} – ${fmt(t)}`;
}

/* ─── Period Selector component ─── */
function PeriodSelector({ label, color, range, onChange }: {
  label: string; color: string; range: DateRange; onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(range.from);
  const [localTo, setLocalTo] = useState(range.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalFrom(range.from); setLocalTo(range.to); }, [range]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:border-opacity-60 transition-all"
        style={{ borderColor: open ? color : undefined }}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color }} />
        <div className="flex-1 text-left">
          <span className="text-[10px] font-medium tracking-wider block" style={{ color }}>{label}</span>
          <span className="text-white text-xs font-medium">{formatLabel(range.from, range.to)}</span>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-[var(--color-border)] bg-[#0A0A0A] shadow-xl z-[100] overflow-hidden">
          <div className="p-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] px-2 py-1">QUICK SELECT</p>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { onChange({ from: p.from, to: p.to }); setOpen(false); }}
                  className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                    range.from === p.from && range.to === p.to
                      ? 'bg-[var(--color-gold-dim)] text-[var(--color-gold)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 space-y-3">
            <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)]">CUSTOM RANGE</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">From</label>
                <input type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)}
                  className="w-full bg-black border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-white focus:border-[var(--color-gold)]/50 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">To</label>
                <input type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)}
                  className="w-full bg-black border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-white focus:border-[var(--color-gold)]/50 focus:outline-none" />
              </div>
            </div>
            <button
              onClick={() => { if (localFrom && localTo && localFrom <= localTo) { onChange({ from: localFrom, to: localTo }); setOpen(false); } }}
              className="w-full py-1.5 rounded text-xs font-medium bg-[var(--color-gold-dim)] text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Delta helpers ─── */
function pctChange(a: number, b: number): number | null {
  if (!b) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtMoney = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`;

const PERIOD_A_COLOR = '#C8A84E'; // gold
const PERIOD_B_COLOR = '#6366F1'; // indigo

const CHANNEL_COLORS: Record<string, string> = {
  'Google Ads': '#4285F4',
  'Meta Ads': '#0668E1',
  'Bing Ads': '#00897B',
};

/* ─── Comparison KPI Card ─── */
function CompareKPICard({ title, valueA, valueB, format, labelA, labelB }: {
  title: string; valueA: number; valueB: number; format: (n: number) => string; labelA: string; labelB: string;
}) {
  const delta = pctChange(valueA, valueB);
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <p className="text-[var(--color-text-secondary)] text-xs font-medium mb-3">{title}</p>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-[10px] font-medium" style={{ color: PERIOD_A_COLOR }}>{labelA}</span>
          <p className="text-white text-lg font-semibold">{format(valueA)}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium" style={{ color: PERIOD_B_COLOR }}>{labelB}</span>
          <p className="text-[var(--color-text-secondary)] text-lg font-semibold">{format(valueB)}</p>
        </div>
      </div>
      {delta != null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${delta > 0 ? 'text-[var(--color-success)]' : delta < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}`}>
          {delta > 0 ? <ArrowUp className="w-3 h-3" /> : delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}% {delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'no change'}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PeriodComparison() {
  const [periodA, setPeriodA] = useState<DateRange>({ from: '2026-02-01', to: '2026-02-28' });
  const [periodB, setPeriodB] = useState<DateRange>({ from: '2026-01-01', to: '2026-01-31' });

  const labelA = formatLabel(periodA.from, periodA.to);
  const labelB = formatLabel(periodB.from, periodB.to);

  // Fetch same endpoints for both periods
  const { data: kpiA, loading: loadingA } = useData(() => api.getKPI(periodA), [periodA]);
  const { data: kpiB, loading: loadingB } = useData(() => api.getKPI(periodB), [periodB]);
  const { data: dailyA } = useData(() => api.getChannelDaily(periodA), [periodA]);
  const { data: dailyB } = useData(() => api.getChannelDaily(periodB), [periodB]);
  const { data: monthlyA } = useData(() => api.getMonthlySummary(periodA), [periodA]);
  const { data: monthlyB } = useData(() => api.getMonthlySummary(periodB), [periodB]);

  const loading = loadingA || loadingB;

  // Swap periods
  const swap = () => {
    const tmpA = periodA;
    setPeriodA(periodB);
    setPeriodB(tmpA);
  };

  if (loading) return <LoadingSpinner />;

  const kA = kpiA?.[0] || {} as any;
  const kB = kpiB?.[0] || {} as any;

  /* ── Aggregate daily spend per day-of-period for overlay chart ── */
  function aggregateDaily(rows: any[] | null) {
    if (!rows) return [];
    const byDay: Record<number, number> = {};
    const startDate = new Date(rows[0]?.DATE || 0).getTime();
    rows.forEach((r: any) => {
      const dayIdx = Math.floor((new Date(r.DATE).getTime() - startDate) / (1000 * 60 * 60 * 24));
      byDay[dayIdx] = (byDay[dayIdx] || 0) + (r.SPEND || 0);
    });
    return Object.entries(byDay).map(([d, spend]) => ({ day: +d + 1, spend })).sort((a, b) => a.day - b.day);
  }

  const dailyAgg_A = aggregateDaily(dailyA);
  const dailyAgg_B = aggregateDaily(dailyB);
  const maxDays = Math.max(dailyAgg_A.length, dailyAgg_B.length);
  const overlayData = Array.from({ length: maxDays }, (_, i) => ({
    day: `Day ${i + 1}`,
    [labelA]: dailyAgg_A[i]?.spend || 0,
    [labelB]: dailyAgg_B[i]?.spend || 0,
  }));

  /* ── Channel comparison table ── */
  function aggregateChannels(rows: any[] | null): Record<string, { spend: number; conversions: number; revenue: number }> {
    const map: Record<string, { spend: number; conversions: number; revenue: number }> = {};
    rows?.forEach((r: any) => {
      const ch = r.CHANNEL;
      if (!map[ch]) map[ch] = { spend: 0, conversions: 0, revenue: 0 };
      map[ch].spend += r.SPEND || 0;
      map[ch].conversions += r.CONVERSIONS || 0;
      map[ch].revenue += r.REVENUE || 0;
    });
    return map;
  }

  const channelsA = aggregateChannels(monthlyA);
  const channelsB = aggregateChannels(monthlyB);
  const allChannels = [...new Set([...Object.keys(channelsA), ...Object.keys(channelsB)])];

  const channelCompare = allChannels.map(ch => ({
    channel: ch,
    spendA: channelsA[ch]?.spend || 0,
    spendB: channelsB[ch]?.spend || 0,
    convA: channelsA[ch]?.conversions || 0,
    convB: channelsB[ch]?.conversions || 0,
    revA: channelsA[ch]?.revenue || 0,
    revB: channelsB[ch]?.revenue || 0,
  }));

  /* ── Grouped bar chart: spend by channel for both periods ── */
  const channelBarData = allChannels.map(ch => ({
    channel: ch,
    [labelA]: channelsA[ch]?.spend || 0,
    [labelB]: channelsB[ch]?.spend || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Period Comparison</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Compare performance across two time periods</p>
      </div>

      {/* Period Selectors */}
      <div className="flex items-center gap-3">
        <PeriodSelector label="PERIOD A" color={PERIOD_A_COLOR} range={periodA} onChange={setPeriodA} />
        <button onClick={swap} className="p-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-gold)]/30 transition-colors" title="Swap periods">
          <ArrowLeftRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <PeriodSelector label="PERIOD B" color={PERIOD_B_COLOR} range={periodB} onChange={setPeriodB} />
      </div>

      {/* KPI Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        <CompareKPICard title="Total Spend" valueA={kA.CURRENT_SPEND || 0} valueB={kB.CURRENT_SPEND || 0} format={fmtMoney} labelA={labelA} labelB={labelB} />
        <CompareKPICard title="Conversions" valueA={kA.CURRENT_CONVERSIONS || 0} valueB={kB.CURRENT_CONVERSIONS || 0} format={fmt} labelA={labelA} labelB={labelB} />
        <CompareKPICard title="Revenue" valueA={kA.CURRENT_REVENUE || 0} valueB={kB.CURRENT_REVENUE || 0} format={fmtMoney} labelA={labelA} labelB={labelB} />
        <CompareKPICard title="ROAS" valueA={kA.CURRENT_ROAS || 0} valueB={kB.CURRENT_ROAS || 0} format={(n) => `${n.toFixed(2)}x`} labelA={labelA} labelB={labelB} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Daily Spend Overlay */}
        <ChartCard title="Daily Spend Trend" subtitle={`${labelA} vs ${labelB}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overlayData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(maxDays / 8))} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey={labelA} stroke={PERIOD_A_COLOR} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={labelB} stroke={PERIOD_B_COLOR} strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spend by Channel — grouped bar */}
        <ChartCard title="Spend by Channel" subtitle={`${labelA} vs ${labelB}`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelBarData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
              <XAxis dataKey="channel" tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={labelA} fill={PERIOD_A_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey={labelB} fill={PERIOD_B_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Channel Comparison Table */}
      <ChartCard
        title="Channel Breakdown"
        subtitle={`${labelA} vs ${labelB}`}
        onExport={() => exportCsv(channelCompare, 'period_comparison')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 px-3 text-[var(--color-text-muted)] font-medium">Channel</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_A_COLOR }}>Spend ({labelA})</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_B_COLOR }}>Spend ({labelB})</th>
                <th className="text-right py-2 px-3 text-[var(--color-text-muted)] font-medium">Change</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_A_COLOR }}>Conv ({labelA})</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_B_COLOR }}>Conv ({labelB})</th>
                <th className="text-right py-2 px-3 text-[var(--color-text-muted)] font-medium">Change</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_A_COLOR }}>Rev ({labelA})</th>
                <th className="text-right py-2 px-3 font-medium" style={{ color: PERIOD_B_COLOR }}>Rev ({labelB})</th>
                <th className="text-right py-2 px-3 text-[var(--color-text-muted)] font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {channelCompare.map((row) => {
                const spendDelta = pctChange(row.spendA, row.spendB);
                const convDelta = pctChange(row.convA, row.convB);
                const revDelta = pctChange(row.revA, row.revB);
                return (
                  <tr key={row.channel} className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[row.channel] || '#666' }} />
                        <span className="text-white font-medium">{row.channel}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 text-white">{fmtMoney(row.spendA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">{fmtMoney(row.spendB)}</td>
                    <DeltaCell value={spendDelta} />
                    <td className="text-right py-2.5 px-3 text-white">{fmt(row.convA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">{fmt(row.convB)}</td>
                    <DeltaCell value={convDelta} />
                    <td className="text-right py-2.5 px-3 text-white">{fmtMoney(row.revA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)]">{fmtMoney(row.revB)}</td>
                    <DeltaCell value={revDelta} />
                  </tr>
                );
              })}
              {/* Totals row */}
              {channelCompare.length > 1 && (() => {
                const totSpendA = channelCompare.reduce((s, r) => s + r.spendA, 0);
                const totSpendB = channelCompare.reduce((s, r) => s + r.spendB, 0);
                const totConvA = channelCompare.reduce((s, r) => s + r.convA, 0);
                const totConvB = channelCompare.reduce((s, r) => s + r.convB, 0);
                const totRevA = channelCompare.reduce((s, r) => s + r.revA, 0);
                const totRevB = channelCompare.reduce((s, r) => s + r.revB, 0);
                return (
                  <tr className="border-t border-[var(--color-border)] bg-white/[0.02]">
                    <td className="py-2.5 px-3 text-white font-semibold">Total</td>
                    <td className="text-right py-2.5 px-3 text-white font-semibold">{fmtMoney(totSpendA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)] font-semibold">{fmtMoney(totSpendB)}</td>
                    <DeltaCell value={pctChange(totSpendA, totSpendB)} bold />
                    <td className="text-right py-2.5 px-3 text-white font-semibold">{fmt(totConvA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)] font-semibold">{fmt(totConvB)}</td>
                    <DeltaCell value={pctChange(totConvA, totConvB)} bold />
                    <td className="text-right py-2.5 px-3 text-white font-semibold">{fmtMoney(totRevA)}</td>
                    <td className="text-right py-2.5 px-3 text-[var(--color-text-secondary)] font-semibold">{fmtMoney(totRevB)}</td>
                    <DeltaCell value={pctChange(totRevA, totRevB)} bold />
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

/* ─── Delta cell for table ─── */
function DeltaCell({ value, bold }: { value: number | null; bold?: boolean }) {
  if (value == null) return <td className="text-right py-2.5 px-3 text-[var(--color-text-muted)]">—</td>;
  const color = value > 0 ? 'var(--color-success)' : value < 0 ? 'var(--color-error)' : 'var(--color-text-muted)';
  return (
    <td className="text-right py-2.5 px-3" style={{ color, fontWeight: bold ? 600 : 400 }}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </td>
  );
}
