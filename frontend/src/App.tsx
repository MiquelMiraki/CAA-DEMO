import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DateRangePicker from './components/DateRangePicker';
import { DateRangeProvider } from './contexts/DateRangeContext';
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
};

function TopBar() {
  const location = useLocation();
  const [exporting, setExporting] = useState(false);
  const hidePicker = ['/chat', '/settings'].includes(location.pathname);
  if (hidePicker) return null;
  const pageTitle = PAGE_TITLES[location.pathname] || 'Report';
  return (
    <div className="flex justify-end items-center gap-3 mb-4">
      <button
        onClick={async () => {
          setExporting(true);
          try { await exportPagePdf(pageTitle); } finally { setExporting(false); }
        }}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all border-[#1A1A1A] text-[#4A4A4A] hover:border-[#C8A84E]/30 hover:text-[#C8A84E]/80 disabled:opacity-50"
      >
        <FileDown className="w-3.5 h-3.5" />
        {exporting ? 'Exporting...' : 'PDF'}
      </button>
      <DateRangePicker />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DateRangeProvider>
      <div className="flex h-screen overflow-hidden bg-black">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-y-auto p-6 lg:p-8">
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
              <Route path="/settings" element={<Settings />} />
              <Route path="/chat" element={<Chat />} />
            </Routes>
          </PageWrapper>
        </main>
      </div>
    </DateRangeProvider>
    </BrowserRouter>
  );
}
