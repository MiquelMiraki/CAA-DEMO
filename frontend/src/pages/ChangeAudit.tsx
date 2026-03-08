import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { useData } from '../hooks/useData';
import { useDateRange } from '../contexts/DateRangeContext';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: '#4285F4',
  meta_ads: '#0668E1',
};

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChangeAudit() {
  const { range } = useDateRange();
  const { data: changes, loading } = useData(() => api.getChangeAudit(range), [range]);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'google_ads' | 'meta_ads'>('all');

  const sorted = useMemo(() => {
    if (!changes) return [];
    return [...changes].sort(
      (a: any, b: any) => new Date(b.CHANGE_DATETIME || b.CHANGE_DATE).getTime() - new Date(a.CHANGE_DATETIME || a.CHANGE_DATE).getTime()
    );
  }, [changes]);

  const filtered = useMemo(() => {
    if (platformFilter === 'all') return sorted;
    return sorted.filter((r: any) => r.PLATFORM === platformFilter);
  }, [sorted, platformFilter]);

  if (loading) return <LoadingSpinner />;

  // KPIs
  const totalChanges = changes?.length || 0;

  const userCounts: Record<string, number> = {};
  changes?.forEach((r: any) => {
    const email = r.USER_EMAIL || 'unknown';
    userCounts[email] = (userCounts[email] || 0) + 1;
  });
  const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

  const platformsModified = new Set(changes?.map((r: any) => r.PLATFORM)).size;

  const pills: { label: string; value: 'all' | 'google_ads' | 'meta_ads' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Google', value: 'google_ads' },
    { label: 'Meta', value: 'meta_ads' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Activity Log</h2>
        <p style={{ color: '#808080' }} className="text-sm mt-1">Campaign changes & audit trail</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Total Changes', value: totalChanges.toLocaleString('en-US') },
          {
            title: 'Most Active User',
            value: mostActiveUser ? mostActiveUser[0] : 'N/A',
            subtitle: mostActiveUser ? `${mostActiveUser[1]} changes` : undefined,
          },
          { title: 'Platforms Modified', value: platformsModified.toString() },
        ].map((kpi, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-[fadeInUp_0.5s_ease_both]">
            <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} />
          </div>
        ))}
      </div>

      {/* Platform filter pills */}
      <div className="flex gap-2">
        {pills.map((pill) => {
          const active = platformFilter === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => setPlatformFilter(pill.value)}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: active ? '#C8A84E' : '#0A0A0A',
                color: active ? '#000' : '#808080',
                border: `1px solid ${active ? '#C8A84E' : '#1A1A1A'}`,
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {filtered.map((r: any, i: number) => {
          const platform = r.PLATFORM || 'google_ads';
          const dotColor = PLATFORM_COLORS[platform] || '#808080';
          const isLast = i === filtered.length - 1;
          const dateStr = r.CHANGE_DATETIME || r.CHANGE_DATE || '';

          return (
            <div key={i} className="flex gap-4 relative">
              {/* Left: dot + vertical line */}
              <div className="flex flex-col items-center pt-5" style={{ minWidth: '20px' }}>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 z-10"
                  style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}40` }}
                />
                {!isLast && (
                  <div
                    className="w-px flex-1"
                    style={{ backgroundColor: '#1A1A1A', minHeight: '100%' }}
                  />
                )}
              </div>

              {/* Content card */}
              <div
                className="flex-1 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 mb-3 hover:border-[#1A1A1A]/80 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className="text-white/80 text-sm font-medium">
                      <span className="text-[#C8A84E]">{r.USER_EMAIL}</span>
                      {' changed '}
                      <span className="text-white">{r.CHANGED_FIELD}</span>
                      {' on '}
                      <span style={{ color: '#808080' }}>{r.RESOURCE_TYPE}</span>
                    </p>

                    {/* Old -> New values */}
                    {(r.OLD_VALUE || r.NEW_VALUE) && (
                      <p className="text-xs mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {r.OLD_VALUE && (
                          <span
                            style={{
                              color: '#EF4444',
                              backgroundColor: '#EF444415',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {r.OLD_VALUE}
                          </span>
                        )}
                        <span style={{ color: '#4A4A4A' }}>&rarr;</span>
                        {r.NEW_VALUE && (
                          <span
                            style={{
                              color: '#22C55E',
                              backgroundColor: '#22C55E15',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {r.NEW_VALUE}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Change type */}
                    {r.CHANGE_TYPE && (
                      <p className="text-[11px] mt-1.5" style={{ color: '#4A4A4A' }}>
                        {r.CHANGE_TYPE}
                      </p>
                    )}
                  </div>

                  {/* Right: date + platform badge */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[11px]" style={{ color: '#4A4A4A' }}>
                      {formatRelativeTime(dateStr)}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: dotColor,
                        backgroundColor: `${dotColor}15`,
                      }}
                    >
                      {PLATFORM_LABELS[platform] || platform}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: '#4A4A4A' }} className="text-sm">No changes found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
