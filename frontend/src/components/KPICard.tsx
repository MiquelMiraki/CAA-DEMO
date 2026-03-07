import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  title: string;
  value: string;
  change?: number | null;
  prefix?: string;
  subtitle?: string;
}

export default function KPICard({ title, value, change, prefix = '', subtitle }: Props) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;

  return (
    <div className="bg-[#111827] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
      <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white text-2xl font-semibold tracking-tight">
            {prefix}{value}
          </p>
          {subtitle && <p className="text-white/30 text-xs mt-1">{subtitle}</p>}
        </div>
        {change != null && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' :
            isNegative ? 'bg-red-500/10 text-red-400' :
            'bg-white/5 text-white/40'
          }`}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : isNegative ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
