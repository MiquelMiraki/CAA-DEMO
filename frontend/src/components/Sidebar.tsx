import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Target, Share2, Search, Globe, Users,
  TrendingUp, Settings, MessageSquareText, Zap
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/google-ads', icon: Target, label: 'Google Ads', color: '#4285F4' },
  { to: '/meta-ads', icon: Share2, label: 'Meta Ads', color: '#0668E1' },
  { to: '/bing-ads', icon: Search, label: 'Bing Ads', color: '#00897B' },
  { to: '/seo', icon: Globe, label: 'SEO' },
  { to: '/analytics', icon: BarChart3, label: 'Web Analytics' },
  { to: '/crm', icon: Users, label: 'CRM' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0B0F1A] border-r border-white/5 flex flex-col z-50">
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">CAA</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Analytics Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" style={color ? { color } : undefined} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20'
                : 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 hover:from-indigo-600/30 hover:to-purple-600/30'
            }`
          }
        >
          <MessageSquareText className="w-[18px] h-[18px]" />
          AI Analyst
        </NavLink>
      </div>
    </aside>
  );
}
