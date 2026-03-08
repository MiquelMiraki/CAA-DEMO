import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'es';

/* ─── Translation dictionary ─── */
const translations: Record<string, Record<Lang, string>> = {
  // Sidebar sections
  'nav.overview': { en: 'OVERVIEW', es: 'RESUMEN' },
  'nav.paid_media': { en: 'PAID MEDIA', es: 'MEDIOS PAGADOS' },
  'nav.organic': { en: 'ORGANIC', es: 'ORGÁNICO' },
  'nav.sales': { en: 'SALES', es: 'VENTAS' },
  'nav.tools': { en: 'TOOLS', es: 'HERRAMIENTAS' },

  // Sidebar items
  'nav.dashboard': { en: 'Dashboard', es: 'Panel' },
  'nav.budget_pacing': { en: 'Budget Pacing', es: 'Ritmo de Gasto' },
  'nav.activity_log': { en: 'Activity Log', es: 'Registro' },
  'nav.alerts': { en: 'Alerts', es: 'Alertas' },
  'nav.goals': { en: 'Goals', es: 'Objetivos' },
  'nav.compare': { en: 'Compare Periods', es: 'Comparar Periodos' },
  'nav.my_dashboard': { en: 'My Dashboard', es: 'Mi Panel' },
  'nav.google_ads': { en: 'Google Ads', es: 'Google Ads' },
  'nav.meta_ads': { en: 'Meta Ads', es: 'Meta Ads' },
  'nav.bing_ads': { en: 'Bing Ads', es: 'Bing Ads' },
  'nav.creatives': { en: 'Creatives', es: 'Creatividades' },
  'nav.keywords': { en: 'Keywords', es: 'Keywords' },
  'nav.attribution': { en: 'Attribution', es: 'Atribución' },
  'nav.seo': { en: 'SEO', es: 'SEO' },
  'nav.web_analytics': { en: 'Web Analytics', es: 'Analítica Web' },
  'nav.crm': { en: 'CRM', es: 'CRM' },
  'nav.forecast': { en: 'Forecast', es: 'Pronóstico' },
  'nav.settings': { en: 'Settings', es: 'Configuración' },
  'nav.ai_analyst': { en: 'AI Analyst', es: 'Analista IA' },

  // Dashboard
  'dashboard.title': { en: 'Dashboard Overview', es: 'Resumen General' },
  'dashboard.subtitle': { en: 'Cross-platform performance', es: 'Rendimiento multiplataforma' },
  'dashboard.total_spend': { en: 'Total Spend', es: 'Gasto Total' },
  'dashboard.conversions': { en: 'Conversions', es: 'Conversiones' },
  'dashboard.revenue': { en: 'Revenue', es: 'Ingresos' },
  'dashboard.blended_roas': { en: 'Blended ROAS', es: 'ROAS Combinado' },
  'dashboard.vs_prev': { en: 'vs prev month', es: 'vs mes anterior' },
  'dashboard.daily_spend': { en: 'Daily Spend by Channel', es: 'Gasto Diario por Canal' },
  'dashboard.spend_distribution': { en: 'Spend Distribution', es: 'Distribución de Gasto' },
  'dashboard.monthly_roas': { en: 'Monthly ROAS by Channel', es: 'ROAS Mensual por Canal' },
  'dashboard.funnel': { en: 'Conversion Funnel', es: 'Embudo de Conversión' },

  // Common
  'common.export_pdf': { en: 'PDF', es: 'PDF' },
  'common.exporting': { en: 'Exporting...', es: 'Exportando...' },
  'common.loading': { en: 'Loading...', es: 'Cargando...' },
  'common.no_data': { en: 'No data available', es: 'Sin datos disponibles' },
  'common.save': { en: 'Save', es: 'Guardar' },
  'common.cancel': { en: 'Cancel', es: 'Cancelar' },
  'common.delete': { en: 'Delete', es: 'Eliminar' },
  'common.edit': { en: 'Edit', es: 'Editar' },
  'common.add': { en: 'Add', es: 'Añadir' },
  'common.search': { en: 'Search...', es: 'Buscar...' },
  'common.all_channels': { en: 'All Channels', es: 'Todos los Canales' },

  // Settings
  'settings.title': { en: 'Platform Connections', es: 'Conexiones de Plataforma' },
  'settings.subtitle': { en: 'Connect your marketing platforms to sync data automatically.', es: 'Conecta tus plataformas de marketing para sincronizar datos automáticamente.' },
  'settings.sync_schedule': { en: 'Data Sync Schedule', es: 'Programación de Sincronización' },
  'settings.ai_config': { en: 'AI Configuration', es: 'Configuración IA' },
  'settings.webhooks': { en: 'Webhook Notifications', es: 'Notificaciones Webhook' },
  'settings.theme': { en: 'Appearance', es: 'Apariencia' },
  'settings.language': { en: 'Language', es: 'Idioma' },
  'settings.dark_mode': { en: 'Dark', es: 'Oscuro' },
  'settings.light_mode': { en: 'Light', es: 'Claro' },

  // Goals
  'goals.title': { en: 'Goal Tracking', es: 'Seguimiento de Objetivos' },
  'goals.subtitle': { en: 'Define objectives and track progress', es: 'Define objetivos y sigue el progreso' },
  'goals.add': { en: 'Add Goal', es: 'Añadir Objetivo' },
  'goals.on_track': { en: 'On Track', es: 'En Curso' },
  'goals.at_risk': { en: 'At Risk', es: 'En Riesgo' },
  'goals.off_track': { en: 'Off Track', es: 'Fuera de Rango' },

  // Compare
  'compare.title': { en: 'Period Comparison', es: 'Comparación de Periodos' },
  'compare.subtitle': { en: 'Compare performance across two time periods', es: 'Compara rendimiento entre dos periodos' },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('caa_lang') as Lang | null;
    return saved || 'en';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('caa_lang', l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
