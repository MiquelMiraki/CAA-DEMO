import { useState, useEffect } from 'react';
import { Plus, Trash2, Target, CheckCircle2, AlertTriangle, XCircle, Pencil, X } from 'lucide-react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import { useClient } from '../contexts/ClientContext';
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── Types ─── */
type Operator = '>' | '<' | '>=' | '<=' | '=';
type MetricId = 'spend' | 'conversions' | 'revenue' | 'roas' | 'cpa' | 'ctr' | 'clicks' | 'impressions';

interface Goal {
  id: string;
  name: string;
  metric: MetricId;
  operator: Operator;
  target: number;
  channel: string; // '' = all channels
}

const METRICS: { id: MetricId; label: string; format: (n: number) => string; unit: string }[] = [
  { id: 'roas', label: 'ROAS', format: (n) => `${n.toFixed(2)}x`, unit: 'x' },
  { id: 'cpa', label: 'CPA', format: (n) => `€${n.toFixed(2)}`, unit: '€' },
  { id: 'spend', label: 'Total Spend', format: (n) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`, unit: '€' },
  { id: 'revenue', label: 'Revenue', format: (n) => n >= 1000 ? `€${(n / 1000).toFixed(1)}K` : `€${n.toFixed(0)}`, unit: '€' },
  { id: 'conversions', label: 'Conversions', format: (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0), unit: '' },
  { id: 'clicks', label: 'Clicks', format: (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0), unit: '' },
  { id: 'impressions', label: 'Impressions', format: (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0), unit: '' },
  { id: 'ctr', label: 'CTR', format: (n) => `${n.toFixed(2)}%`, unit: '%' },
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
];

const CHANNELS = ['', 'Google Ads', 'Meta Ads', 'Bing Ads'];

function storageKey(clientId: string) { return `caa_goals_${clientId}`; }

function loadGoals(clientId: string): Goal[] {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(clientId: string, goals: Goal[]) {
  localStorage.setItem(storageKey(clientId), JSON.stringify(goals));
}

/* ─── Evaluate a metric from the data ─── */
function computeMetric(
  metric: MetricId,
  channel: string,
  kpi: any,
  monthly: any[] | null,
): number | null {
  // If channel-specific, aggregate from monthly summary
  if (channel && monthly) {
    const rows = monthly.filter((r: any) => r.CHANNEL === channel);
    if (!rows.length) return null;
    const totSpend = rows.reduce((s: number, r: any) => s + (r.SPEND || 0), 0);
    const totConv = rows.reduce((s: number, r: any) => s + (r.CONVERSIONS || 0), 0);
    const totRev = rows.reduce((s: number, r: any) => s + (r.REVENUE || 0), 0);
    const totClicks = rows.reduce((s: number, r: any) => s + (r.CLICKS || 0), 0);
    const totImpressions = rows.reduce((s: number, r: any) => s + (r.IMPRESSIONS || 0), 0);
    switch (metric) {
      case 'spend': return totSpend;
      case 'conversions': return totConv;
      case 'revenue': return totRev;
      case 'roas': return totSpend ? totRev / totSpend : null;
      case 'cpa': return totConv ? totSpend / totConv : null;
      case 'clicks': return totClicks;
      case 'impressions': return totImpressions;
      case 'ctr': return totImpressions ? (totClicks / totImpressions) * 100 : null;
    }
  }

  // All channels — use KPI aggregates + monthly for detailed metrics
  if (kpi) {
    switch (metric) {
      case 'spend': return kpi.CURRENT_SPEND || null;
      case 'conversions': return kpi.CURRENT_CONVERSIONS || null;
      case 'revenue': return kpi.CURRENT_REVENUE || null;
      case 'roas': return kpi.CURRENT_ROAS || null;
      case 'cpa':
        return kpi.CURRENT_CONVERSIONS ? (kpi.CURRENT_SPEND / kpi.CURRENT_CONVERSIONS) : null;
    }
  }

  // Clicks/impressions/ctr from monthly when no channel filter
  if (monthly) {
    const totClicks = monthly.reduce((s: number, r: any) => s + (r.CLICKS || 0), 0);
    const totImpressions = monthly.reduce((s: number, r: any) => s + (r.IMPRESSIONS || 0), 0);
    switch (metric) {
      case 'clicks': return totClicks;
      case 'impressions': return totImpressions;
      case 'ctr': return totImpressions ? (totClicks / totImpressions) * 100 : null;
    }
  }

  return null;
}

function evaluateGoal(current: number | null, operator: Operator, target: number): 'met' | 'close' | 'off' | 'unknown' {
  if (current == null) return 'unknown';
  const met = (() => {
    switch (operator) {
      case '>': return current > target;
      case '>=': return current >= target;
      case '<': return current < target;
      case '<=': return current <= target;
      case '=': return Math.abs(current - target) < 0.01;
    }
  })();
  if (met) return 'met';

  // Check if close (within 15% of target)
  const distance = Math.abs(current - target) / Math.abs(target || 1);
  if (distance <= 0.15) return 'close';
  return 'off';
}

function progressPct(current: number | null, operator: Operator, target: number): number {
  if (current == null || target === 0) return 0;
  // For "greater than" goals: progress = current/target
  if (operator === '>' || operator === '>=') {
    return Math.min(Math.max((current / target) * 100, 0), 150);
  }
  // For "less than" goals: progress inverted — lower is better
  // 100% when current <= target, decreasing as current exceeds target
  return Math.min(Math.max((target / current) * 100, 0), 150);
}

const STATUS_CONFIG = {
  met: { label: 'On Track', color: 'var(--color-success)', icon: CheckCircle2, bg: 'rgba(34,197,94,0.08)' },
  close: { label: 'At Risk', color: '#EAB308', icon: AlertTriangle, bg: 'rgba(234,179,8,0.08)' },
  off: { label: 'Off Track', color: 'var(--color-error)', icon: XCircle, bg: 'rgba(239,68,68,0.08)' },
  unknown: { label: 'No Data', color: 'var(--color-text-muted)', icon: Target, bg: 'rgba(255,255,255,0.03)' },
};

/* ─── Goal Form ─── */
function GoalForm({ initial, onSave, onCancel }: {
  initial?: Goal; onSave: (g: Goal) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [metric, setMetric] = useState<MetricId>(initial?.metric || 'roas');
  const [operator, setOperator] = useState<Operator>(initial?.operator || '>');
  const [target, setTarget] = useState(initial?.target?.toString() || '');
  const [channel, setChannel] = useState(initial?.channel || '');

  const metricInfo = METRICS.find(m => m.id === metric)!;

  const handleSubmit = () => {
    if (!name.trim() || !target) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name: name.trim(),
      metric,
      operator,
      target: parseFloat(target),
      channel,
    });
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-medium">{initial ? 'Edit Goal' : 'New Goal'}</h3>
        <button onClick={onCancel} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] block mb-1">GOAL NAME</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Maintain ROAS above 3x"
          className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:border-[var(--color-gold)]/50 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric */}
        <div>
          <label className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] block mb-1">METRIC</label>
          <select value={metric} onChange={e => setMetric(e.target.value as MetricId)}
            className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-gold)]/50 focus:outline-none">
            {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] block mb-1">CONDITION</label>
          <select value={operator} onChange={e => setOperator(e.target.value as Operator)}
            className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-gold)]/50 focus:outline-none">
            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Target */}
        <div>
          <label className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] block mb-1">TARGET {metricInfo.unit ? `(${metricInfo.unit})` : ''}</label>
          <input type="number" step="any" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 3"
            className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:border-[var(--color-gold)]/50 focus:outline-none" />
        </div>

        {/* Channel */}
        <div>
          <label className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] block mb-1">CHANNEL</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-gold)]/50 focus:outline-none">
            <option value="">All Channels</option>
            {CHANNELS.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Goal: <span className="text-white">{metricInfo.label}</span> {operator} <span className="text-[var(--color-gold)]">{target ? metricInfo.format(parseFloat(target)) : '...'}</span>
          {channel && <span className="text-[var(--color-text-muted)]"> on {channel}</span>}
        </p>
        <button onClick={handleSubmit} disabled={!name.trim() || !target}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-gold-dim)] text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          {initial ? 'Save Changes' : 'Add Goal'}
        </button>
      </div>
    </div>
  );
}

/* ─── Goal Card ─── */
function GoalCard({ goal, currentValue, onEdit, onDelete }: {
  goal: Goal; currentValue: number | null; onEdit: () => void; onDelete: () => void;
}) {
  const status = evaluateGoal(currentValue, goal.operator, goal.target);
  const progress = progressPct(currentValue, goal.operator, goal.target);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const metricInfo = METRICS.find(m => m.id === goal.metric)!;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(200,168,78,0.04)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-medium truncate">{goal.name}</h3>
          <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
            {metricInfo.label} {goal.operator} {metricInfo.format(goal.target)}
            {goal.channel && ` · ${goal.channel}`}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-white/[0.05] text-[var(--color-text-muted)] hover:text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-white/[0.05] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: config.bg, color: config.color }}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      </div>

      {/* Values */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-[10px] text-[var(--color-text-muted)] block">CURRENT</span>
          <span className="text-white text-lg font-semibold">
            {currentValue != null ? metricInfo.format(currentValue) : '—'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[var(--color-text-muted)] block">TARGET</span>
          <span className="text-[var(--color-text-secondary)] text-lg font-semibold">
            {metricInfo.format(goal.target)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: config.color,
            opacity: 0.8,
          }}
        />
        {/* Target line at 100% */}
        <div className="absolute inset-y-0 right-0 w-px bg-white/20" style={{ left: `${Math.min(100 / 1.5, 100)}%` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[var(--color-text-muted)]">{Math.min(progress, 100).toFixed(0)}%</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {currentValue != null && goal.target
            ? (goal.operator === '>' || goal.operator === '>='
              ? (currentValue >= goal.target ? 'Target met' : `${metricInfo.format(goal.target - currentValue)} to go`)
              : (currentValue <= goal.target ? 'Target met' : `${metricInfo.format(currentValue - goal.target)} over`)
            )
            : ''}
        </span>
      </div>
    </div>
  );
}

/* ─── Summary Bar ─── */
function SummaryBar({ goals, getStatus }: {
  goals: Goal[];
  getStatus: (g: Goal) => 'met' | 'close' | 'off' | 'unknown';
}) {
  const counts = { met: 0, close: 0, off: 0, unknown: 0 };
  goals.forEach(g => counts[getStatus(g)]++);

  return (
    <div className="grid grid-cols-4 gap-3">
      {(['met', 'close', 'off', 'unknown'] as const).map(key => {
        const cfg = STATUS_CONFIG[key];
        const Icon = cfg.icon;
        return (
          <div key={key} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: cfg.bg }}>
              <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-white text-xl font-semibold">{counts[key]}</p>
              <p className="text-[var(--color-text-muted)] text-xs">{cfg.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function Goals() {
  const { range, label } = useDateRange();
  const { client } = useClient();
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(client.id));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reload goals when client changes
  useEffect(() => {
    setGoals(loadGoals(client.id));
  }, [client.id]);

  // Persist on change
  useEffect(() => {
    saveGoals(client.id, goals);
  }, [goals, client.id]);

  // Fetch data
  const { data: kpi, loading: kpiLoading } = useData(() => api.getKPI(range), [range]);
  const { data: monthly, loading: monthlyLoading } = useData(() => api.getMonthlySummary(range), [range]);

  const loading = kpiLoading || monthlyLoading;

  const addGoal = (g: Goal) => {
    setGoals(prev => [...prev, g]);
    setShowForm(false);
  };

  const updateGoal = (g: Goal) => {
    setGoals(prev => prev.map(x => x.id === g.id ? g : x));
    setEditingId(null);
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const getValue = (g: Goal) => computeMetric(g.metric, g.channel, kpi?.[0], monthly);
  const getStatus = (g: Goal) => evaluateGoal(getValue(g), g.operator, g.target);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">Goal Tracking</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Define objectives and track progress · {label}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-gold-dim)] text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && <SummaryBar goals={goals} getStatus={getStatus} />}

      {/* Form */}
      {showForm && (
        <GoalForm onSave={addGoal} onCancel={() => setShowForm(false)} />
      )}

      {/* Edit form */}
      {editingId && (
        <GoalForm
          initial={goals.find(g => g.id === editingId)}
          onSave={updateGoal}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 stagger-in">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentValue={getValue(goal)}
              onEdit={() => { setEditingId(goal.id); setShowForm(false); }}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))}
        </div>
      ) : !showForm && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-12 text-center">
          <Target className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
          <h3 className="text-white text-sm font-medium mb-1">No goals defined yet</h3>
          <p className="text-[var(--color-text-muted)] text-xs mb-4">
            Create goals like "ROAS &gt; 3x" or "CPA &lt; €20" to track your performance
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-gold-dim)] text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </button>
        </div>
      )}
    </div>
  );
}
