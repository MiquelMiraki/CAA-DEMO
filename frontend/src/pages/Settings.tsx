import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Save, RefreshCw } from 'lucide-react';

interface PlatformConfig {
  id: string;
  name: string;
  logo: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
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

export default function Settings() {
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
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
    // Simulated connection test
    setTimeout(() => {
      const hasValues = Object.values(configs[platformId] || {}).some((v) => v.length > 0);
      setStatuses((prev) => ({ ...prev, [platformId]: hasValues ? 'connected' : 'error' }));
    }, 1500);
  };

  const saveConfig = (platformId: string) => {
    // In production, this would POST to the backend
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
          <span className="text-xs text-white/30">Not configured</span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-white text-xl font-semibold">Platform Connections</h2>
        <p className="text-white/40 text-sm mt-1">
          Connect your marketing platforms to start syncing data automatically.
        </p>
      </div>

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const isExpanded = expandedPlatform === platform.id;
          const status = statuses[platform.id] || 'idle';

          return (
            <div
              key={platform.id}
              className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
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
                    <p className="text-white/30 text-xs">{platform.fields.length} fields required</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(status)}
                  <svg
                    className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded form */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/5">
                  <div className="space-y-3 mt-4">
                    {platform.fields.map((field) => {
                      const secretKey = `${platform.id}_${field.key}`;
                      const isVisible = !field.secret || showSecrets[secretKey];
                      return (
                        <div key={field.key}>
                          <label className="block text-white/50 text-xs mb-1.5">{field.label}</label>
                          <div className="relative">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              placeholder={field.placeholder}
                              value={configs[platform.id]?.[field.key] || ''}
                              onChange={(e) => updateField(platform.id, field.key, e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                            />
                            {field.secret && (
                              <button
                                onClick={() => toggleSecret(secretKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                              >
                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => saveConfig(platform.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save & Test
                    </button>
                    <button
                      onClick={() => testConnection(platform.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 transition-colors"
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

      {/* Data Sync Section */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
        <h3 className="text-white text-sm font-medium mb-1">Data Sync Schedule</h3>
        <p className="text-white/40 text-xs mb-4">Configure how often data is pulled from connected platforms.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs mb-1.5">Sync Frequency</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="daily">Daily (recommended)</option>
              <option value="12h">Every 12 hours</option>
              <option value="6h">Every 6 hours</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1.5">Timezone</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="Europe/Madrid">Europe/Madrid (CET)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
        <h3 className="text-white text-sm font-medium mb-1">AI Analyst Configuration</h3>
        <p className="text-white/40 text-xs mb-4">Configure the AI model powering your analytical chatbot.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs mb-1.5">LLM Provider</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1.5">Model</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="claude-sonnet">Claude Sonnet 4.6</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-white/50 text-xs mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showSecrets['ai_key'] ? 'text' : 'password'}
              placeholder="sk-..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => toggleSecret('ai_key')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showSecrets['ai_key'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
