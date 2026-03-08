import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
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

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-black">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-y-auto p-6 lg:p-8">
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
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/chat" element={<Chat />} />
            </Routes>
          </PageWrapper>
        </main>
      </div>
    </BrowserRouter>
  );
}
