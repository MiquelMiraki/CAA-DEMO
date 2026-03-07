import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PlatformPage from './pages/PlatformPage';
import SEO from './pages/SEO';
import Analytics from './pages/Analytics';
import CRM from './pages/CRM';
import Forecast from './pages/Forecast';
import Settings from './pages/Settings';
import Chat from './pages/Chat';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 overflow-y-auto p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/google-ads" element={<PlatformPage platform="google" />} />
            <Route path="/meta-ads" element={<PlatformPage platform="meta" />} />
            <Route path="/bing-ads" element={<PlatformPage platform="bing" />} />
            <Route path="/seo" element={<SEO />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
