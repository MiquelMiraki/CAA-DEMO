import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

interface DateRangeContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
  label: string;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

function formatLabel(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Check if it matches a common range
  const diffDays = Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
  for (const preset of PRESETS) {
    if (diffDays === preset.days - 1 || diffDays === preset.days) return preset.label;
  }

  // Check if it's a full month
  if (f.getDate() === 1 && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
    && f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
    return f.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Check if it's a full quarter
  if (f.getDate() === 1 && f.getMonth() % 3 === 0
    && t.getMonth() === f.getMonth() + 2
    && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()) {
    const q = Math.floor(f.getMonth() / 3) + 1;
    return `Q${q} ${f.getFullYear()}`;
  }

  return `${fmtDate(f)} – ${fmtDate(t)}`;
}

// Default: Q1 2026 (matches our current data)
const DEFAULT_RANGE: DateRange = { from: '2026-01-01', to: '2026-03-31' };

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const label = formatLabel(range.from, range.to);

  return (
    <DateRangeContext.Provider value={{ range, setRange, label }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
}
