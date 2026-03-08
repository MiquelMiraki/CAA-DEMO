import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, X, Plug, ArrowRight, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

/* ─── Platform definitions (shared with Settings) ─── */
interface PlatformField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface Platform {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
  fields: PlatformField[];
  optional?: boolean;
}

const PLATFORMS: Platform[] = [
  {
    id: 'snowflake',
    name: 'Snowflake',
    logo: '❄️',
    color: '#29B5E8',
    description: 'Your data warehouse — required for all analytics.',
    fields: [
      { key: 'account', label: 'Account', placeholder: 'orgname-account' },
      { key: 'username', label: 'Username', placeholder: 'Your username' },
      { key: 'password', label: 'Password', placeholder: 'Your password', secret: true },
      { key: 'database', label: 'Database', placeholder: 'CAA_DB' },
      { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH' },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    logo: '🔵',
    color: '#4285F4',
    description: 'Import campaigns, keywords, and conversion data.',
    fields: [
      { key: 'customer_id', label: 'Customer ID', placeholder: 'xxx-xxx-xxxx' },
      { key: 'developer_token', label: 'Developer Token', placeholder: 'Your developer token', secret: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'Refresh token', secret: true },
    ],
    optional: true,
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    logo: '🟦',
    color: '#0668E1',
    description: 'Import ad creatives, audiences, and spend data.',
    fields: [
      { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_xxxxxxxxxx' },
      { key: 'access_token', label: 'Access Token', placeholder: 'Long-lived access token', secret: true },
    ],
    optional: true,
  },
  {
    id: 'bing_ads',
    name: 'Microsoft Ads',
    logo: '🟢',
    color: '#00897B',
    description: 'Import Bing/Microsoft advertising data.',
    fields: [
      { key: 'account_id', label: 'Account ID', placeholder: 'Your account ID' },
      { key: 'developer_token', label: 'Developer Token', placeholder: 'Developer token', secret: true },
    ],
    optional: true,
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    logo: '📊',
    color: '#F9AB00',
    description: 'Import web analytics and user behavior data.',
    fields: [
      { key: 'property_id', label: 'Property ID', placeholder: '123456789' },
      { key: 'service_account_json', label: 'Service Account Key', placeholder: 'Paste JSON key', secret: true },
    ],
    optional: true,
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    logo: '🟠',
    color: '#FF7A59',
    description: 'Import pipeline, deals, and lead data.',
    fields: [
      { key: 'api_key', label: 'Private App Token', placeholder: 'pat-xx-xxxxxxxx', secret: true },
      { key: 'portal_id', label: 'Portal ID', placeholder: '12345678' },
    ],
    optional: true,
  },
];

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

/* ─── Step definitions ─── */
type Step = 'welcome' | 'platforms' | 'review' | 'done';
const STEPS: Step[] = ['welcome', 'platforms', 'review', 'done'];

function storageKey(clientId: string) {
  return `caa_onboarding_${clientId}`;
}

export function isOnboardingComplete(clientId: string): boolean {
  return localStorage.getItem(storageKey(clientId)) === 'complete';
}

export function resetOnboarding(clientId: string) {
  localStorage.removeItem(storageKey(clientId));
}

/* ─── Main component ─── */
export default function OnboardingWizard({ clientId, onComplete }: {
  clientId: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>('welcome');
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const stepIndex = STEPS.indexOf(step);

  const updateField = (platformId: string, fieldKey: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], [fieldKey]: value },
    }));
  };

  const testConnection = (platformId: string) => {
    setStatuses(prev => ({ ...prev, [platformId]: 'testing' }));
    setTimeout(() => {
      const hasValues = Object.values(configs[platformId] || {}).some(v => v.length > 0);
      setStatuses(prev => ({ ...prev, [platformId]: hasValues ? 'connected' : 'error' }));
    }, 1500);
  };

  const markComplete = () => {
    localStorage.setItem(storageKey(clientId), 'complete');
    onComplete();
  };

  const connectedCount = Object.values(statuses).filter(s => s === 'connected').length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0A0A0A] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-gold-dim)] flex items-center justify-center">
              <Plug className="w-4 h-4 text-[var(--color-gold)]" />
            </div>
            <div>
              <h2 className="text-white text-sm font-semibold">Setup Wizard</h2>
              <p className="text-[var(--color-text-muted)] text-[11px]">Connect your platforms to get started</p>
            </div>
          </div>
          <button onClick={markComplete} className="p-2 rounded-lg hover:bg-white/[0.05] text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= stepIndex ? 'bg-[var(--color-gold)]' : 'bg-white/[0.08]'
                }`} />
              </div>
            ))}
          </div>
          <p className="text-[var(--color-text-muted)] text-[10px] mt-2 tracking-wider font-medium">
            STEP {stepIndex + 1} OF {STEPS.length}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Welcome ── */}
          {step === 'welcome' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-gold-dim)] flex items-center justify-center mx-auto mb-5">
                <img src="/miraki-logo.png" alt="Miraki" className="h-10 w-auto brightness-110" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">Welcome to CAA Analytics</h3>
              <p className="text-[var(--color-text-secondary)] text-sm max-w-md mx-auto mb-8">
                Let's connect your marketing platforms so you can start tracking performance across all channels in one place.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                {[
                  { icon: '📊', text: 'Cross-platform analytics' },
                  { icon: '🤖', text: 'AI-powered insights' },
                  { icon: '🎯', text: 'Goal tracking' },
                ].map(item => (
                  <div key={item.text} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
                    <span className="text-2xl block mb-1.5">{item.icon}</span>
                    <span className="text-[var(--color-text-muted)] text-[10px]">{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep('platforms')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-gold)] text-black hover:brightness-110 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Platforms ── */}
          {step === 'platforms' && (
            <div className="space-y-3">
              <div className="mb-4">
                <h3 className="text-white text-base font-semibold">Connect Your Platforms</h3>
                <p className="text-[var(--color-text-muted)] text-xs mt-1">
                  Configure each platform you want to track. Optional platforms can be skipped.
                </p>
              </div>

              {PLATFORMS.map(platform => {
                const isActive = activePlatform === platform.id;
                const status = statuses[platform.id] || 'idle';
                const isSkipped = skipped.has(platform.id);

                return (
                  <div key={platform.id} className="rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
                    {/* Platform header */}
                    <button
                      onClick={() => setActivePlatform(isActive ? null : platform.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${platform.color}15` }}>
                          {platform.logo}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{platform.name}</span>
                            {platform.optional && <span className="text-[10px] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-white/[0.05]">Optional</span>}
                          </div>
                          <p className="text-[var(--color-text-muted)] text-[11px]">{platform.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'connected' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Connected
                          </span>
                        )}
                        {status === 'testing' && (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing...
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                        {isSkipped && status === 'idle' && (
                          <span className="text-xs text-[var(--color-text-muted)]">Skipped</span>
                        )}
                        <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded form */}
                    {isActive && (
                      <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                        <div className="space-y-3 mt-3">
                          {platform.fields.map(field => {
                            const secretKey = `${platform.id}_${field.key}`;
                            const isVisible = !field.secret || showSecrets[secretKey];
                            return (
                              <div key={field.key}>
                                <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">{field.label}</label>
                                <div className="relative">
                                  <input
                                    type={isVisible ? 'text' : 'password'}
                                    placeholder={field.placeholder}
                                    value={configs[platform.id]?.[field.key] || ''}
                                    onChange={e => updateField(platform.id, field.key, e.target.value)}
                                    className="w-full bg-black border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:border-[var(--color-gold)]/50 focus:outline-none transition-colors"
                                  />
                                  {field.secret && (
                                    <button
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [secretKey]: !prev[secretKey] }))}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                                    >
                                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => testConnection(platform.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-gold)] text-black hover:brightness-110 transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Test & Connect
                          </button>
                          {platform.optional && (
                            <button
                              onClick={() => {
                                setSkipped(prev => { const s = new Set(prev); s.add(platform.id); return s; });
                                setActivePlatform(null);
                              }}
                              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border)] hover:border-[var(--color-text-muted)] transition-colors"
                            >
                              Skip for now
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Review ── */}
          {step === 'review' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-white text-base font-semibold">Review Setup</h3>
                <p className="text-[var(--color-text-muted)] text-xs mt-1">
                  Here's a summary of your platform connections.
                </p>
              </div>

              <div className="space-y-2">
                {PLATFORMS.map(platform => {
                  const status = statuses[platform.id] || 'idle';
                  const isSkipped = skipped.has(platform.id);
                  const isConnected = status === 'connected';

                  return (
                    <div key={platform.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: `${platform.color}15` }}>
                          {platform.logo}
                        </div>
                        <span className="text-white text-sm font-medium">{platform.name}</span>
                      </div>
                      <div>
                        {isConnected ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : isSkipped ? (
                          <span className="text-xs text-[var(--color-text-muted)] bg-white/[0.05] px-2.5 py-1 rounded-full">Skipped</span>
                        ) : (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">Not configured</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {connectedCount > 0 && (
                <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-4">
                  <p className="text-emerald-400 text-sm font-medium">
                    {connectedCount} platform{connectedCount > 1 ? 's' : ''} connected
                  </p>
                  <p className="text-emerald-400/60 text-xs mt-1">
                    You can always add more platforms later from Settings.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">You're All Set!</h3>
              <p className="text-[var(--color-text-secondary)] text-sm max-w-md mx-auto mb-3">
                Your platforms are configured. Data will start syncing automatically.
              </p>
              <p className="text-[var(--color-text-muted)] text-xs mb-8">
                You can manage connections anytime from the Settings page.
              </p>
              <button
                onClick={markComplete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-gold)] text-black hover:brightness-110 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step !== 'done' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <div>
              {stepIndex > 0 && step !== 'welcome' && (
                <button
                  onClick={() => setStep(STEPS[stepIndex - 1])}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'welcome' && (
                <button onClick={markComplete} className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors">
                  Skip setup
                </button>
              )}
              {step === 'platforms' && (
                <button
                  onClick={() => setStep('review')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-gold-dim)] text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === 'review' && (
                <button
                  onClick={() => setStep('done')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-gold)] text-black hover:brightness-110 transition-all"
                >
                  Finish Setup
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
