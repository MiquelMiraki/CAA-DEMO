import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { FileDown, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DateRangePicker from './components/DateRangePicker';
import { DateRangeProvider } from './contexts/DateRangeContext';
import { ClientProvider, useClient } from './contexts/ClientContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { exportPagePdf } from './utils/exportPdf';
import Dashboard from './pages/Dashboard';
import PlatformPage from './pages/PlatformPage';
import SEO from './pages/SEO';
import Analytics from './pages/Analytics';
import CRM from './pages/CRM';
import Forecast from './pages/Forecast';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import BudgetPacing from './pages/BudgetPacing';
import Creatives from './pages/Creatives';
import Keywords from './pages/Keywords';
import ChangeAudit from './pages/ChangeAudit';
import Attribution from './pages/Attribution';
import Alerts from './pages/Alerts';
import CustomDashboard from './pages/CustomDashboard';
import PeriodComparison from './pages/PeriodComparison';
import Goals from './pages/Goals';
import Sales from './pages/Sales';
import OnboardingWizard, { isOnboardingComplete } from './components/OnboardingWizard';

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page">
      {children}
    </div>
  );
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard Overview',
  '/google-ads': 'Google Ads',
  '/meta-ads': 'Meta Ads',
  '/bing-ads': 'Bing Ads',
  '/seo': 'SEO Performance',
  '/analytics': 'Web Analytics',
  '/crm': 'CRM Pipeline',
  '/budget-pacing': 'Budget Pacing',
  '/creatives': 'Creative Performance',
  '/keywords': 'Keywords',
  '/change-audit': 'Activity Log',
  '/attribution': 'Attribution',
  '/alerts': 'Alerts',
  '/forecast': 'Forecast',
  '/custom-dashboard': 'Custom Dashboard',
  '/compare': 'Period Comparison',
  '/goals': 'Goal Tracking',
  '/sales': 'Sales Performance',
};

function TopBar() {
  const location = useLocation();
  const [exporting, setExporting] = useState(false);
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLanguage();
  const hidePicker = ['/chat', '/settings', '/compare'].includes(location.pathname);
  if (hidePicker) return null;
  const pageTitle = PAGE_TITLES[location.pathname] || 'Report';
  return (
    <div className="flex justify-end items-center gap-3 mb-4">
      <button
        onClick={async () => {
          setExporting(true);
          try { await exportPagePdf(pageTitle); } catch (err) { alert(`PDF export failed: ${err instanceof Error ? err.message : err}`); } finally { setExporting(false); }
        }}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 disabled:opacity-50"
      >
        <FileDown className="w-3.5 h-3.5" />
        {exporting ? 'Exporting...' : 'PDF'}
      </button>
      <button
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 transition-all uppercase"
      >
        {lang}
      </button>
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 transition-all"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </button>
      <DateRangePicker />
    </div>
  );
}

function AppContent() {
  const { client } = useClient();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete(client.id));

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {showOnboarding && (
        <OnboardingWizard clientId={client.id} onComplete={() => setShowOnboarding(false)} />
      )}
      <Sidebar />
      <main key={client.id} className="flex-1 ml-60 overflow-y-auto p-6 lg:p-8">
        <TopBar />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/google-ads" element={<PlatformPage platform="google" />} />
            <Route path="/meta-ads" element={<PlatformPage platform="meta" />} />
            <Route path="/bing-ads" element={<PlatformPage platform="bing" />} />
            <Route path="/seo" element={<SEO />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/budget-pacing" element={<BudgetPacing />} />
            <Route path="/creatives" element={<Creatives />} />
            <Route path="/keywords" element={<Keywords />} />
            <Route path="/change-audit" element={<ChangeAudit />} />
            <Route path="/attribution" element={<Attribution />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/custom-dashboard" element={<CustomDashboard />} />
            <Route path="/compare" element={<PeriodComparison />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </PageWrapper>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <LanguageProvider>
      <ClientProvider>
      <DateRangeProvider>
        <AppContent />
      </DateRangeProvider>
      </ClientProvider>
      </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
