import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import ChartCard from '../components/ChartCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const CHANNELS = ['Google Ads', 'Meta Ads', 'Bing Ads'];
const COLORS: Record<string, string> = { 'Google Ads': '#4285F4', 'Meta Ads': '#0668E1', 'Bing Ads': '#00897B' };

export default function Forecast() {
  const { data: forecast, loading } = useData(() => api.getForecast(), []);
  const [selectedChannel, setSelectedChannel] = useState('Google Ads');
  const [spendIncrease, setSpendIncrease] = useState(0);
  const [forecastDays, setForecastDays] = useState(30);

  const channelData = useMemo(() => {
    if (!forecast) return [];
    return forecast
      .filter((r: any) => r.CHANNEL === selectedChannel)
      .map((r: any) => ({
        date: new Date(r.DATE).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        spend: r.SPEND,
        conversions: r.CONVERSIONS,
        revenue: r.REVENUE,
        roas: r.ROAS,
        spend7d: r.SPEND_7D_AVG,
        conv7d: r.CONVERSIONS_7D_AVG,
        rev7d: r.REVENUE_7D_AVG,
      }));
  }, [forecast, selectedChannel]);

  // Simple linear forecast
  const forecastData = useMemo(() => {
    if (!channelData.length) return [];
    const last30 = channelData.slice(-30);
    const avgSpend = last30.reduce((s, r) => s + r.spend, 0) / last30.length;
    const avgConv = last30.reduce((s, r) => s + r.conversions, 0) / last30.length;
    const avgRev = last30.reduce((s, r) => s + r.revenue, 0) / last30.length;
    const avgRoas = avgSpend > 0 ? avgRev / avgSpend : 0;

    // Efficiency decay: for every 10% budget increase, ROAS drops ~2%
    const multiplier = 1 + spendIncrease / 100;
    const efficiencyFactor = 1 - (Math.max(0, spendIncrease) * 0.002);
    const projSpend = avgSpend * multiplier;
    const projConv = avgConv * multiplier * efficiencyFactor;
    const projRev = avgRev * multiplier * efficiencyFactor;
    const projRoas = projSpend > 0 ? projRev / projSpend : 0;

    const result = [];
    for (let i = 1; i <= forecastDays; i++) {
      const dayNoise = 1 + (Math.sin(i * 0.3) * 0.05); // slight wave pattern
      result.push({
        date: `Apr ${i}`,
        spend: +(projSpend * dayNoise).toFixed(2),
        conversions: Math.round(projConv * dayNoise),
        revenue: +(projRev * dayNoise).toFixed(2),
        roas: +(projRoas * dayNoise).toFixed(2),
        isProjection: true,
      });
    }
    return result;
  }, [channelData, spendIncrease, forecastDays]);

  const combinedData = useMemo(() => {
    const historical = channelData.slice(-30).map((r) => ({ ...r, isProjection: false }));
    return [...historical, ...forecastData];
  }, [channelData, forecastData]);

  // Summary stats
  const totalProjectedSpend = forecastData.reduce((s, r) => s + r.spend, 0);
  const totalProjectedConv = forecastData.reduce((s, r) => s + r.conversions, 0);
  const totalProjectedRev = forecastData.reduce((s, r) => s + r.revenue, 0);
  const projectedRoas = totalProjectedSpend > 0 ? totalProjectedRev / totalProjectedSpend : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Forecast Simulator</h2>
        <p className="text-white/40 text-sm mt-1">Simula escenarios de presupuesto y proyecta resultados</p>
      </div>

      {/* Controls */}
      <div className="bg-[#111827] rounded-2xl border border-white/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Channel</label>
            <div className="flex gap-2">
              {CHANNELS.map((ch) => (
                <button key={ch} onClick={() => setSelectedChannel(ch)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedChannel === ch
                      ? 'text-white shadow-lg' : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                  style={selectedChannel === ch ? { background: COLORS[ch] } : undefined}
                >{ch.replace(' Ads', '')}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
              Budget Change: <span className={`font-bold ${spendIncrease > 0 ? 'text-emerald-400' : spendIncrease < 0 ? 'text-red-400' : 'text-white'}`}>
                {spendIncrease > 0 ? '+' : ''}{spendIncrease}%
              </span>
            </label>
            <input type="range" min={-50} max={100} step={5} value={spendIncrease} onChange={(e) => setSpendIncrease(+e.target.value)}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>-50%</span><span>0%</span><span>+50%</span><span>+100%</span>
            </div>
          </div>

          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Forecast Period</label>
            <div className="flex gap-2">
              {[14, 30, 60, 90].map((d) => (
                <button key={d} onClick={() => setForecastDays(d)}
                  className={`px-3 py-2 rounded-lg text-xs transition-all ${
                    forecastDays === d ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                >{d}d</button>
              ))}
            </div>
          </div>
        </div>

        {/* Projected Results */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div>
            <p className="text-white/40 text-xs">Projected Spend</p>
            <p className="text-white text-lg font-semibold">€{(totalProjectedSpend / 1000).toFixed(1)}K</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Projected Conversions</p>
            <p className="text-emerald-400 text-lg font-semibold">{totalProjectedConv.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Projected Revenue</p>
            <p className="text-white text-lg font-semibold">€{(totalProjectedRev / 1000).toFixed(1)}K</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Expected ROAS</p>
            <p className={`text-lg font-semibold ${projectedRoas >= 2 ? 'text-emerald-400' : projectedRoas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
              {projectedRoas.toFixed(2)}x
            </p>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <ChartCard title="Spend & Revenue Projection" subtitle="Historical (solid) + Forecast (dashed)">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={3} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <Tooltip content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              const isProj = payload[0]?.payload?.isProjection;
              return (
                <div className="bg-[#1a2035] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
                  <p className="text-white/60 mb-1">{label} {isProj ? '(Projected)' : ''}</p>
                  {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-white/70">{p.name}:</span>
                      <span className="text-white font-medium">€{p.value?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              );
            }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={channelData.slice(-30)[channelData.slice(-30).length - 1]?.date} stroke="#4b5563" strokeDasharray="4 4" label={{ value: 'Today', fill: '#6b7280', fontSize: 10 }} />
            <Line type="monotone" dataKey="spend" name="Spend" stroke={COLORS[selectedChannel]} strokeWidth={2} dot={false}
              strokeDasharray={(combinedData as any[]).some(d => d.isProjection) ? undefined : undefined} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Conversions Projection">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={3} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
            <Tooltip content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-[#1a2035] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
                  <p className="text-white/60 mb-1">{label}</p>
                  <p className="text-white">Conversions: <span className="font-bold">{payload[0]?.value}</span></p>
                </div>
              );
            }} />
            <Line type="monotone" dataKey="conversions" name="Conversions" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
