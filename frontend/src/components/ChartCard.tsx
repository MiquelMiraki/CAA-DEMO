import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className = '' }: Props) {
  return (
    <div className={`bg-[#111827] rounded-2xl border border-white/5 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-white font-medium text-sm">{title}</h3>
        {subtitle && <p className="text-white/30 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
