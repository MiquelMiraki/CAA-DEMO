import type { Currency } from '../contexts/ClientContext';

const SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  MXN: '$',
  USD: '$',
};

export function fmtMoney(n: number, currency: Currency = 'EUR'): string {
  const s = SYMBOLS[currency];
  if (n >= 1_000_000) return `${s}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${s}${(n / 1_000).toFixed(1)}K`;
  return `${s}${n.toFixed(0)}`;
}

export function moneyAxis(currency: Currency = 'EUR') {
  const s = SYMBOLS[currency];
  return (v: number) => `${s}${(v / 1000).toFixed(0)}K`;
}
