import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Save, RefreshCw, Plug, Sun, Moon, Bell } from 'lucide-react';
import { resetOnboarding } from '../components/OnboardingWizard';
import { useClient } from '../contexts/ClientContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, type Lang } from '../contexts/LanguageContext';

/* ── Design tokens ─────────────────────────────────────────────── */
const colors = {
  bg:        '#000000',
  surface:   '#0A0A0A',
  border:    '#1A1A1A',
  gold:      '#C8A84E',
  secondary: '#808080',
  muted:     '#4A4A4A',
} as const;

/* ── Platform definitions ──────────────────────────────────────── */
interface PlatformField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface PlatformConfig {
  id: string;
  name: string;
  logo: string;
  color: string;
  fields: PlatformField[];
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    logo: '🔵',
    color: '#4285F4',
    fields: [
      { key: 'customer_id', label: 'Customer ID', placeholder: 'xxx-xxx-xxxx' },
      { key: 'developer_token', label: 'Developer Token', placeholder: 'Your developer token', secret: true },
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth Client Secret', placeholder: 'Client secret', secret: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'Refresh token', secret: true },
    ],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    logo: '🟦',
    color: '#0668E1',
    fields: [
      { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_xxxxxxxxxx' },
      { key: 'access_token', label: 'Access Token', placeholder: 'Long-lived access token', secret: true },
      { key: 'app_id', label: 'App ID', placeholder: 'Your app ID' },
      { key: 'app_secret', label: 'App Secret', placeholder: 'App secret', secret: true },
    ],
  },
  {
    id: 'bing_ads',
    name: 'Microsoft Ads',
    logo: '🟢',
    color: '#00897B',
    fields: [
      { key: 'account_id', label: 'Account ID', placeholder: 'Your account ID' },
      { key: 'customer_id', label: 'Customer ID', placeholder: 'Your customer ID' },
      { key: 'developer_token', label: 'Developer Token', placeholder: 'Developer token', secret: true },
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'Client ID' },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'Refresh token', secret: true },
    ],
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    logo: '📊',
    color: '#F9AB00',
    fields: [
      { key: 'property_id', label: 'Property ID', placeholder: '123456789' },
      { key: 'service_account_json', label: 'Service Account Key (JSON)', placeholder: 'Paste JSON key content', secret: true },
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    logo: '🟠',
    color: '#FF7A59',
    fields: [
      { key: 'api_key', label: 'Private App Token', placeholder: 'pat-xx-xxxxxxxx', secret: true },
      { key: 'portal_id', label: 'Portal ID', placeholder: '12345678' },
    ],
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    logo: '❄️',
    color: '#29B5E8',
    fields: [
      { key: 'account', label: 'Account', placeholder: 'orgname-account' },
      { key: 'username', label: 'Username', placeholder: 'Your username' },
      { key: 'password', label: 'Password', placeholder: 'Your password', secret: true },
      { key: 'database', label: 'Database', placeholder: 'MY_DATABASE' },
      { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH' },
    ],
  },
];

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

/* ── Component ─────────────────────────────────────────────────── */
export default function Settings() {
  const { client } = useClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [webhooks, setWebhooks] = useState({ slackUrl: '', email: '', onAlert: true, onGoalMet: true, dailyDigest: false });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const updateField = (platformId: string, fieldKey: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], [fieldKey]: value },
    }));
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const testConnection = (platformId: string) => {
    setStatuses((prev) => ({ ...prev, [platformId]: 'testing' }));
    setTimeout(() => {
      const hasValues = Object.values(configs[platformId] || {}).some((v) => v.length > 0);
      setStatuses((prev) => ({ ...prev, [platformId]: hasValues ? 'connected' : 'error' }));
    }, 1500);
  };

  const saveConfig = (platformId: string) => {
    console.log(`Saving config for ${platformId}:`, configs[platformId]);
    testConnection(platformId);
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'testing':
        return (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing...
          </span>
        );
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" /> Connected
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="text-xs" style={{ color: colors.muted }}>
            Not configured
          </span>
        );
    }
  };

  /* ── Shared input classes ────────────────────────────────────── */
  const inputClasses =
    'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none transition-colors';
  const inputStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
  };
  const inputFocusStyle = `focus:border-[${colors.gold}]/50 focus:ring-1 focus:ring-[${colors.gold}]/20`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white text-xl font-semibold">Platform Connections</h2>
        <p style={{ color: colors.secondary }} className="text-sm mt-1">
          Connect your marketing platforms to sync data automatically.
        </p>
      </div>

      {/* ── Platform cards ─────────────────────────────────────── */}
      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const isExpanded = expandedPlatform === platform.id;
          const status = statuses[platform.id] || 'idle';

          return (
            <div
              key={platform.id}
              className="rounded-xl overflow-hidden"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${platform.color}15` }}
                  >
                    {platform.logo}
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{platform.name}</p>
                    <p style={{ color: colors.muted }} className="text-xs">
                      {platform.fields.length} fields required
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(status)}
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: colors.muted }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded form */}
              {isExpanded && (
                <div className="px-5 pb-5" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <div className="space-y-3 mt-4">
                    {platform.fields.map((field) => {
                      const secretKey = `${platform.id}_${field.key}`;
                      const isVisible = !field.secret || showSecrets[secretKey];
                      return (
                        <div key={field.key}>
                          <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
                            {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              placeholder={field.placeholder}
                              value={configs[platform.id]?.[field.key] || ''}
                              onChange={(e) => updateField(platform.id, field.key, e.target.value)}
                              className={`${inputClasses} ${inputFocusStyle}`}
                              style={inputStyle}
                            />
                            {field.secret && (
                              <button
                                onClick={() => toggleSecret(secretKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: colors.muted }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = colors.secondary)}
                                onMouseLeave={(e) => (e.currentTarget.style.color = colors.muted)}
                              >
                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => saveConfig(platform.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-black font-medium transition-colors hover:brightness-110"
                      style={{ background: colors.gold }}
                    >
                      <Save className="w-4 h-4" />
                      Save &amp; Test
                    </button>
                    <button
                      onClick={() => testConnection(platform.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/[0.06]"
                      style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        color: colors.secondary,
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Test Connection
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Data Sync Schedule ─────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <h3 className="text-white text-sm font-medium mb-1">Data Sync Schedule</h3>
        <p style={{ color: colors.muted }} className="text-xs mb-4">
          Configure how often data is pulled from connected platforms.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              Sync Frequency
            </label>
            <select className={`${inputClasses} ${inputFocusStyle}`} style={inputStyle}>
              <option value="daily">Daily (recommended)</option>
              <option value="12h">Every 12 hours</option>
              <option value="6h">Every 6 hours</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              Timezone
            </label>
            <select className={`${inputClasses} ${inputFocusStyle}`} style={inputStyle}>
              <option value="Europe/Madrid">Europe/Madrid (CET)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── AI Configuration ───────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <h3 className="text-white text-sm font-medium mb-1">AI Configuration</h3>
        <p style={{ color: colors.muted }} className="text-xs mb-4">
          Configure the AI model powering your analytical chatbot.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              LLM Provider
            </label>
            <select className={`${inputClasses} ${inputFocusStyle}`} style={inputStyle}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              Model
            </label>
            <select className={`${inputClasses} ${inputFocusStyle}`} style={inputStyle}>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="claude-sonnet">Claude Sonnet 4.6</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
            API Key
          </label>
          <div className="relative">
            <input
              type={showSecrets['ai_key'] ? 'text' : 'password'}
              placeholder="sk-..."
              className={`${inputClasses} ${inputFocusStyle}`}
              style={inputStyle}
            />
            <button
              onClick={() => toggleSecret('ai_key')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: colors.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.secondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.muted)}
            >
              {showSecrets['ai_key'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Appearance & Language ──────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <h3 className="text-white text-sm font-medium mb-1">Appearance & Language</h3>
        <p style={{ color: colors.muted }} className="text-xs mb-4">
          Customize the look and language of the platform.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>Theme</label>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: colors.border }}>
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  theme === 'dark' ? 'bg-[var(--color-gold-dim)] text-[var(--color-gold)]' : 'text-[var(--color-text-secondary)] hover:bg-white/[0.04]'
                }`}
                style={{ background: theme === 'dark' ? undefined : colors.surface }}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  theme === 'light' ? 'bg-[var(--color-gold-dim)] text-[var(--color-gold)]' : 'text-[var(--color-text-secondary)] hover:bg-white/[0.04]'
                }`}
                style={{ background: theme === 'light' ? undefined : colors.surface }}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>Language</label>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Lang)}
              className={`${inputClasses} ${inputFocusStyle}`}
              style={inputStyle}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Webhook Notifications ──────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4" style={{ color: colors.gold }} />
          <h3 className="text-white text-sm font-medium">Webhook Notifications</h3>
        </div>
        <p style={{ color: colors.muted }} className="text-xs mb-4">
          Get notified via Slack or email when important events occur.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              Slack Webhook URL
            </label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={webhooks.slackUrl}
              onChange={e => setWebhooks(w => ({ ...w, slackUrl: e.target.value }))}
              className={`${inputClasses} ${inputFocusStyle}`}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: colors.secondary }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="alerts@company.com"
              value={webhooks.email}
              onChange={e => setWebhooks(w => ({ ...w, email: e.target.value }))}
              className={`${inputClasses} ${inputFocusStyle}`}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: colors.secondary }}>
              Notification Triggers
            </label>
            <div className="space-y-2">
              {[
                { key: 'onAlert' as const, label: 'Alert triggered (anomaly detected, threshold breached)' },
                { key: 'onGoalMet' as const, label: 'Goal status change (met, at risk, off track)' },
                { key: 'dailyDigest' as const, label: 'Daily performance digest (9am summary)' },
              ].map(trigger => (
                <label key={trigger.key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className="relative w-9 h-5 rounded-full transition-colors"
                    style={{
                      background: webhooks[trigger.key]
                        ? 'var(--color-gold)'
                        : colors.border,
                    }}
                    onClick={() => setWebhooks(w => ({ ...w, [trigger.key]: !w[trigger.key] }))}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{
                        left: webhooks[trigger.key] ? '18px' : '2px',
                      }}
                    />
                  </div>
                  <span className="text-xs group-hover:text-white transition-colors" style={{ color: colors.secondary }}>
                    {trigger.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => { /* Save webhook config */ }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-black font-medium transition-colors hover:brightness-110"
            style={{ background: colors.gold }}
          >
            <Save className="w-4 h-4" />
            Save Notification Settings
          </button>
        </div>
      </div>

      {/* ── Setup Wizard ───────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
        <h3 className="text-white text-sm font-medium mb-1">Setup Wizard</h3>
        <p style={{ color: colors.muted }} className="text-xs mb-4">
          Re-run the onboarding wizard to reconfigure your platform connections.
        </p>
        <button
          onClick={() => {
            resetOnboarding(client.id);
            window.location.reload();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]"
          style={{ border: `1px solid ${colors.border}`, color: colors.secondary }}
        >
          <Plug className="w-4 h-4" />
          Re-run Setup Wizard
        </button>
      </div>
    </div>
  );
}
