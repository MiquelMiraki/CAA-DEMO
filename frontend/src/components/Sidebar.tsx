import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Target, Share2, Search, Globe, Users,
  TrendingUp, Settings, MessageSquareText, DollarSign, Palette,
  Key, ClipboardList
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/budget-pacing', icon: DollarSign, label: 'Budget Pacing' },
      { to: '/change-audit', icon: ClipboardList, label: 'Activity Log' },
    ],
  },
  {
    label: 'PAID MEDIA',
    items: [
      { to: '/google-ads', icon: Target, label: 'Google Ads' },
      { to: '/meta-ads', icon: Share2, label: 'Meta Ads' },
      { to: '/bing-ads', icon: Search, label: 'Bing Ads' },
      { to: '/creatives', icon: Palette, label: 'Creatives' },
      { to: '/keywords', icon: Key, label: 'Keywords' },
    ],
  },
  {
    label: 'ORGANIC',
    items: [
      { to: '/seo', icon: Globe, label: 'SEO' },
      { to: '/analytics', icon: BarChart3, label: 'Web Analytics' },
    ],
  },
  {
    label: 'SALES',
    items: [{ to: '/crm', icon: Users, label: 'CRM' }],
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-black border-r border-[var(--color-border)] flex flex-col z-50">
      <div className="p-5 pb-2 flex items-center gap-3">
        <img src="/miraki-logo.png" alt="Miraki AI" className="h-8 w-auto brightness-110" />
      </div>
      <div className="px-5 pb-5">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--color-gold)]">CAA ANALYTICS</span>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-medium tracking-[0.15em] text-[var(--color-text-muted)]">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                      isActive
                        ? 'text-[var(--color-gold)] bg-[var(--color-gold-dim)] border-l-2 border-[var(--color-gold)] pl-2.5'
                        : 'text-[var(--color-text-secondary)] hover:text-white/80 hover:bg-white/[0.03] border-l-2 border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 mt-auto">
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium transition-all duration-300 border ${
              isActive
                ? 'border-[var(--color-gold)] bg-[var(--color-gold-dim)] text-[var(--color-gold)] shadow-[0_0_20px_rgba(200,168,78,0.1)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/30 hover:text-[var(--color-gold)]/80'
            }`
          }
        >
          <MessageSquareText className="w-4 h-4" strokeWidth={1.5} />
          AI Analyst
        </NavLink>
      </div>
    </aside>
  );
}
