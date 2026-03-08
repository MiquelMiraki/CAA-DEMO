import type { ReactNode } from 'react';
import { Download } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  onExport?: () => void;
}

export default function ChartCard({ title, subtitle, children, className = '', onExport }: Props) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-medium text-sm">{title}</h3>
          {subtitle && <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-[#4A4A4A] hover:text-[#C8A84E] text-xs transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
