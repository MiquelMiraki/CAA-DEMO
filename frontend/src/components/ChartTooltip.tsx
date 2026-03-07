export default function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#1A1A1A] rounded-lg p-3 shadow-xl text-xs">
      <div className="border-b border-[var(--color-gold)]/20 pb-1.5 mb-1.5">
        <p className="text-[var(--color-text-secondary)] font-medium">{label}</p>
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--color-text-secondary)]">{p.name}:</span>
          <span className="text-white font-medium">
            {typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
