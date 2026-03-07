import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className = '' }: Props) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 transition-all duration-300 ${className}`}>
      <div className="mb-4">
        <h3 className="text-white font-medium text-sm">{title}</h3>
        {subtitle && <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
