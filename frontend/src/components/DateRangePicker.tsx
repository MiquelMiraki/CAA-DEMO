import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useDateRange } from '../contexts/DateRangeContext';

const PRESETS = [
  { label: 'January 2026', from: '2026-01-01', to: '2026-01-31' },
  { label: 'February 2026', from: '2026-02-01', to: '2026-02-28' },
  { label: 'March 2026', from: '2026-03-01', to: '2026-03-31' },
  { label: 'Q1 2026', from: '2026-01-01', to: '2026-03-31' },
  { label: 'Last 7 days', from: '2026-03-02', to: '2026-03-08' },
  { label: 'Last 30 days', from: '2026-02-06', to: '2026-03-08' },
];

export default function DateRangePicker() {
  const { range, setRange, label } = useDateRange();
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(range.from);
  const [localTo, setLocalTo] = useState(range.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFrom(range.from);
    setLocalTo(range.to);
  }, [range]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyCustom = () => {
    if (localFrom && localTo && localFrom <= localTo) {
      setRange({ from: localFrom, to: localTo });
      setOpen(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setRange({ from: preset.from, to: preset.to });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/40 hover:text-white transition-all"
      >
        <Calendar className="w-3.5 h-3.5 text-[var(--color-gold)]" />
        <span className="text-xs font-medium">{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-[var(--color-border)] bg-[#0A0A0A] shadow-xl z-[100] overflow-hidden">
          {/* Presets */}
          <div className="p-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] px-2 py-1">QUICK SELECT</p>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                    range.from === preset.from && range.to === preset.to
                      ? 'bg-[var(--color-gold-dim)] text-[var(--color-gold)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range */}
          <div className="p-3 space-y-3">
            <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)]">CUSTOM RANGE</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">From</label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="w-full bg-black border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-white focus:border-[var(--color-gold)]/50 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">To</label>
                <input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="w-full bg-black border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-white focus:border-[var(--color-gold)]/50 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={applyCustom}
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
