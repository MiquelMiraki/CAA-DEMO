import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  title: string;
  value: string;
  change?: number | null;
  subtitle?: string;
}

export default function KPICard({ title, value, change, subtitle }: Props) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(200,168,78,0.04)]">
      <p className="text-[var(--color-text-secondary)] text-xs font-medium mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-white text-xl font-semibold tracking-tight">{value}</p>
        {change != null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${change > 0 ? 'text-[var(--color-success)]' : change < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}`}>
            {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-[var(--color-text-muted)] text-[11px] mt-1.5">{subtitle}</p>}
    </div>
  );
}
