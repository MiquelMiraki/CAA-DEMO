import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Target, Share2, Search, Globe, Users,
  TrendingUp, Settings, MessageSquareText, DollarSign, Palette,
  Key, ClipboardList, GitBranch, Bell, ChevronDown, Building2, LayoutGrid
} from 'lucide-react';
import { useClient } from '../contexts/ClientContext';

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/budget-pacing', icon: DollarSign, label: 'Budget Pacing' },
      { to: '/change-audit', icon: ClipboardList, label: 'Activity Log' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/custom-dashboard', icon: LayoutGrid, label: 'My Dashboard' },
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
      { to: '/attribution', icon: GitBranch, label: 'Attribution' },
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

function ClientSelector() {
  const { client, setClient, clients } = useClient();
  const [open, setOpen] = useState(false);

  if (clients.length <= 1) return null;

  return (
    <div className="px-3 pb-3 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-gold)]/30 transition-all text-left"
      >
        <Building2 className="w-4 h-4 text-[var(--color-gold)]" strokeWidth={1.5} />
        <span className="flex-1 text-[12px] text-[var(--color-text-secondary)] truncate">{client.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 mt-1 bg-[#0A0A0A] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-xl z-50">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => { setClient(c); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                c.id === client.id
                  ? 'text-[var(--color-gold)] bg-[var(--color-gold-dim)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-white/[0.03]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-black border-r border-[var(--color-border)] flex flex-col z-50">
      <div className="p-5 pb-2 flex items-center gap-3">
        <img src="/miraki-logo.png" alt="Miraki AI" className="h-8 w-auto brightness-110" />
      </div>
      <div className="px-5 pb-3">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--color-gold)]">CAA ANALYTICS</span>
      </div>

      <ClientSelector />

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
