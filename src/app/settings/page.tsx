'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Database, Shield, Info, ExternalLink,
  RefreshCw, Trash2, Users, UserPlus, KeyRound, BrainCircuit, BellRing,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { timeAgo } from '@/lib/utils';
import { getRoleMatrix } from '@/lib/rbac';
import pkg from '../../../package.json';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

interface SyncInfo {
  db_path: string;
  state_dir: string;
  db_size_mb: number;
  tables: { name: string; count: number }[];
  last_sync: string | null;
  sync_health?: {
    last_sync_started_at?: string | null;
    last_sync_at?: string | null;
    last_sync_status?: string | null;
    last_sync_error?: string | null;
    last_sync_duration_ms?: number | null;
    last_success_at?: string | null;
    last_success_duration_ms?: number | null;
  } | null;
  sync_files?: {
    filename: string;
    last_seen_at?: string | null;
    last_mtime?: string | null;
    size_bytes?: number | null;
    last_status?: string | null;
    last_error?: string | null;
  }[];
  seed_count: number;
}

type Role = 'admin' | 'editor' | 'viewer';
type SettingsTab = 'general' | 'memory' | 'access' | 'about';

interface UserRecord {
  id: number;
  username: string;
  role: Role;
  created_at: string;
  email?: string | null;
  auth_provider?: string | null;
}

interface LoginRequestRecord {
  id: number;
  email: string;
  google_sub?: string | null;
  status: 'pending' | 'approved' | 'denied';
  requested_role: Role;
  attempts: number;
  last_error?: string | null;
  last_attempt_at: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
}

interface MeResponse {
  user?: { id: number; username: string; role: Role };
}

interface HermesInstance {
  id: string;
  label: string;
}

interface MemoryPolicy {
  decay_half_life_days: number;
  min_effective_confidence: number;
  min_keep_confidence: number;
  low_confidence_prune_days: number;
  default_ttl_days: number;
}

type InstanceId = string;

interface AlertPolicy {
  window_days: number;
  alert_contradictions_threshold: number;
  alert_duplicates_threshold: number;
  alert_weak_agents_threshold: number;
  alert_never_ratio_threshold: number;
}

type ApiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'deepseek';

interface ApiProviderProfile {
  key: string;
  baseUrl: string;
  model: string;
  health: 'healthy' | 'warning' | 'offline';
  usage: string;
  credits: string;
  organization?: string;
  project?: string;
  workspace?: string;
  region?: string;
  referer?: string;
}

interface CliPreset {
  connection: string;
  endpoint: string;
  profile: string;
  token: string;
  commands: string[];
}

const CLI_PRESETS: Record<string, CliPreset> = {
  Mail: {
    connection: 'Local',
    endpoint: 'https://api.aikitz.at/mail',
    profile: 'production',
    token: 'mail_live_ops',
    commands: ['aikitz mail sync --profile production', 'aikitz mail watch --folder inbox', 'aikitz mail send-test --from ceo@aikitz.at'],
  },
  WhatsApp: {
    connection: 'SSH',
    endpoint: 'https://api.aikitz.at/whatsapp',
    profile: 'production',
    token: 'wa_ops_bridge',
    commands: ['aikitz whatsapp login --profile production', 'aikitz whatsapp sync --contacts', 'aikitz whatsapp broadcast --dry-run'],
  },
  Telegram: {
    connection: 'SSH',
    endpoint: 'https://api.aikitz.at/telegram',
    profile: 'production',
    token: 'telegram_bot_ops',
    commands: ['aikitz telegram connect --bot lead-qualifier', 'aikitz telegram sync --channels', 'aikitz telegram broadcast --preview'],
  },
  Websites: {
    connection: 'Docker',
    endpoint: 'https://api.aikitz.at/websites',
    profile: 'production',
    token: 'web_runtime_ops',
    commands: ['aikitz web status', 'aikitz web deploy --target production', 'aikitz web logs --tail 200'],
  },
  Instagram: {
    connection: 'GitHub Actions',
    endpoint: 'https://api.aikitz.at/instagram',
    profile: 'production',
    token: 'instagram_publish_ops',
    commands: ['aikitz instagram auth', 'aikitz instagram schedule --next', 'aikitz instagram insights --last 7d'],
  },
  Facebook: {
    connection: 'GitHub Actions',
    endpoint: 'https://api.aikitz.at/facebook',
    profile: 'production',
    token: 'facebook_campaign_ops',
    commands: ['aikitz facebook connect', 'aikitz facebook campaigns --active', 'aikitz facebook inbox sync'],
  },
  LinkedIn: {
    connection: 'Docker',
    endpoint: 'https://api.aikitz.at/linkedin',
    profile: 'production',
    token: 'linkedin_growth_ops',
    commands: ['aikitz linkedin status', 'aikitz linkedin publish --draft next', 'aikitz linkedin leads sync'],
  },
  Stripe: {
    connection: 'Kubernetes',
    endpoint: 'https://api.aikitz.at/stripe',
    profile: 'production',
    token: 'stripe_billing_ops',
    commands: ['aikitz stripe status', 'aikitz stripe reconcile --today', 'aikitz stripe webhooks test'],
  },
  Files: {
    connection: 'Local',
    endpoint: 'https://api.aikitz.at/files',
    profile: 'production',
    token: 'files_pipeline_ops',
    commands: ['aikitz files import ./dropzone', 'aikitz files validate --all', 'aikitz files export --format csv'],
  },
};

interface MemoryEffectPayload {
  instance: string;
  available: boolean;
  reason?: string;
  history_points?: number;
  policy_changes?: number;
  latest_policy_change?: string;
  baseline_at?: string;
  current_at?: string;
  deltas?: {
    contradictions: { before: number; after: number; delta: number };
    duplicates: { before: number; after: number; delta: number };
    weak_agents: { before: number; after: number; delta: number };
    hot_memory: { before: number; after: number; delta: number };
    never_accessed_ratio: { before: number; after: number; delta: number };
  };
}

export default function SettingsPage() {
  const {
    language,
    openClawEnabled,
    toggleOpenClaw,
    openClawMode,
    setOpenClawMode,
  } = useDashboard();
  const dashboardVersion = pkg.version || 'dev';
  const roleMatrix = getRoleMatrix();
  const [instances, setInstances] = useState<HermesInstance[]>([]);
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse['user'] | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loginRequests, setLoginRequests] = useState<LoginRequestRecord[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<Role>('editor');
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({});
  const [requestRoleDrafts, setRequestRoleDrafts] = useState<Record<string, Role>>({});
  const [policies, setPolicies] = useState<Record<InstanceId, MemoryPolicy | null>>({});
  const [savingPolicy, setSavingPolicy] = useState<Record<InstanceId, boolean>>({});
  const [alertPolicies, setAlertPolicies] = useState<Record<InstanceId, AlertPolicy | null>>({});
  const [savingAlertPolicy, setSavingAlertPolicy] = useState<Record<InstanceId, boolean>>({});
  const [memoryEffects, setMemoryEffects] = useState<Record<InstanceId, MemoryEffectPayload | null>>({});
  const [cliApp, setCliApp] = useState('Mail');
  const [cliConnection, setCliConnection] = useState('Local');
  const [cliProfileName, setCliProfileName] = useState('production');
  const [cliSessions, setCliSessions] = useState<Array<{ id: string; app: string; connection: string }>>([
    { id: 'local-mail', app: 'Mail', connection: 'Local' },
    { id: 'ssh-whatsapp', app: 'WhatsApp', connection: 'SSH' },
    { id: 'docker-linkedin', app: 'LinkedIn', connection: 'Docker' },
  ]);
  const cliApps = ['Mail', 'WhatsApp', 'Telegram', 'Websites', 'Instagram', 'Facebook', 'LinkedIn', 'Stripe', 'Files'];
  const [apiProvider, setApiProvider] = useState<ApiProvider>('openai');
  const [apiProfiles, setApiProfiles] = useState<Record<ApiProvider, ApiProviderProfile>>({
    openai: {
      key: 'sk-live-••••••••••',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.4',
      health: 'healthy',
      usage: '1.2M / 5M tokens',
      credits: '$182.40',
      organization: 'org_aikitzlabs',
      project: 'dashboard-prod',
    },
    anthropic: {
      key: 'sk-ant-••••••••••',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-7-sonnet',
      health: 'healthy',
      usage: '840k / 3M tokens',
      credits: '$96.00',
      workspace: 'aikitz-labs',
    },
    google: {
      key: 'AIza••••••••••',
      baseUrl: 'https://generativelanguage.googleapis.com',
      model: 'gemini-2.0-flash',
      health: 'warning',
      usage: '620k / 2M tokens',
      credits: '$74.10',
      project: 'aikitz-growth',
      region: 'europe-west3',
    },
    openrouter: {
      key: 'sk-or-v1-••••••••••',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4.1-mini',
      health: 'healthy',
      usage: '2.4M / 8M tokens',
      credits: '$58.20',
      referer: 'https://aikitz.at',
    },
    deepseek: {
      key: 'sk-ds-••••••••••',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      health: 'offline',
      usage: '0 / 1M tokens',
      credits: '$0.00',
      organization: 'aikitz-experiments',
    },
  });

  const providerOptions: Array<{ value: ApiProvider; label: string; platform: string }> = [
    { value: 'openai', label: 'OpenAI', platform: 'https://platform.openai.com/api-keys' },
    { value: 'anthropic', label: 'Anthropic', platform: 'https://console.anthropic.com/settings/keys' },
    { value: 'google', label: 'Google AI', platform: 'https://aistudio.google.com/app/apikey' },
    { value: 'openrouter', label: 'OpenRouter', platform: 'https://openrouter.ai/keys' },
    { value: 'deepseek', label: 'DeepSeek', platform: 'https://platform.deepseek.com/api_keys' },
  ];

  const currentApiProfile = apiProfiles[apiProvider];
  const currentCliPreset = CLI_PRESETS[cliApp] || CLI_PRESETS.Mail;

  const updateApiProfile = (field: keyof ApiProviderProfile, value: string) => {
    setApiProfiles((prev) => ({
      ...prev,
      [apiProvider]: {
        ...prev[apiProvider],
        [field]: value,
      },
    }));
  };

  const connectCli = () => {
    setCliSessions((prev) => {
      const id = `${cliConnection.toLowerCase()}-${cliApp.toLowerCase().replace(/\s+/g, '-')}`;
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, app: cliApp, connection: cliConnection }];
    });
  };

  const disconnectCli = () => {
    setCliSessions((prev) => prev.filter((s) => s.app !== cliApp));
  };

  useEffect(() => {
    const preset = CLI_PRESETS[cliApp] || CLI_PRESETS.Mail;
    setCliConnection(preset.connection);
    setCliProfileName(preset.profile);
  }, [cliApp]);

  useEffect(() => {
    let alive = true;

    (async () => {
      fetch('/api/settings').then(r => r.json()).then(setSyncInfo).catch(() => {});

      // Discover configured OpenClaw instances from the server so the dashboard
      // can be used as a template across different deployments.
      let discovered: HermesInstance[] = [];
      try {
        const res = await fetch('/api/instances', { cache: 'no-store' });
        const data = await res.json();
        discovered = Array.isArray(data.instances) ? data.instances : [];
      } catch {
        // Back-compat fallback for older deployments.
        discovered = [
          { id: 'leads', label: 'Leads' },
          { id: 'openclaw', label: 'OpenClaw' },
        ];
      }

      if (!alive) return;
      setInstances(discovered);

      const initPolicies: Record<string, MemoryPolicy | null> = {};
      const initSaving: Record<string, boolean> = {};
      const initAlert: Record<string, AlertPolicy | null> = {};
      const initAlertSaving: Record<string, boolean> = {};
      const initEffects: Record<string, MemoryEffectPayload | null> = {};
      for (const it of discovered) {
        initPolicies[it.id] = null;
        initSaving[it.id] = false;
        initAlert[it.id] = null;
        initAlertSaving[it.id] = false;
        initEffects[it.id] = null;
      }
      setPolicies(initPolicies);
      setSavingPolicy(initSaving);
      setAlertPolicies(initAlert);
      setSavingAlertPolicy(initAlertSaving);
      setMemoryEffects(initEffects);

      await Promise.all(discovered.map(async (it) => {
        try {
          const p = await fetch(`/api/memory-policy?instance=${encodeURIComponent(it.id)}`, { cache: 'no-store' }).then(r => r.json());
          if (alive) setPolicies(prev => ({ ...prev, [it.id]: p.policy ?? null }));
        } catch {}
        try {
          const ap = await fetch(`/api/memory-alert-policy?instance=${encodeURIComponent(it.id)}`, { cache: 'no-store' }).then(r => r.json());
          if (alive) setAlertPolicies(prev => ({ ...prev, [it.id]: ap.policy ?? null }));
        } catch {}
        try {
          const eff = await fetch(`/api/memory-effect?instance=${encodeURIComponent(it.id)}`, { cache: 'no-store' }).then(r => r.json());
          if (alive) setMemoryEffects(prev => ({ ...prev, [it.id]: eff ?? null }));
        } catch {}
      }));
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: MeResponse) => setCurrentUser(data.user || null))
      .catch(() => setCurrentUser(null));
  }, []);

  async function loadUsers() {
    if (currentUser?.role !== 'admin') return;
    setUserLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUserLoading(false);
    }
  }

  async function loadLoginRequests() {
    if (currentUser?.role !== 'admin') return;
    setRequestLoading(true);
    try {
      const res = await fetch('/api/users/requests', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load login requests');
      const requests = Array.isArray(data.requests) ? data.requests : [];
      setLoginRequests(requests);
      const nextDrafts: Record<string, Role> = {};
      requests.forEach((req: LoginRequestRecord) => {
        nextDrafts[req.email] = req.requested_role || 'viewer';
      });
      setRequestRoleDrafts(nextDrafts);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRequestLoading(false);
    }
  }

  useEffect(() => {
    loadUsers().catch(() => {});
    loadLoginRequests().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch('/api/sync');
      toast.success('Sync completed');
      // Refresh info
      const info = await fetch('/api/settings').then(r => r.json());
      setSyncInfo(info);
    } catch {
      toast.error('Sync failed');
    }
    setSyncing(false);
  }

  async function clearSeeds() {
    if (!confirm('Remove all seed data? Real data will be preserved.')) return;
    setClearing(true);
    try {
      await fetch('/api/seed', { method: 'DELETE' });
      toast.success('Seed data cleared');
      const info = await fetch('/api/settings').then(r => r.json());
      setSyncInfo(info);
    } catch {
      toast.error('Failed to clear seeds');
    }
    setClearing(false);
  }

  async function createUserRecord(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createUsername,
          password: createPassword,
          role: createRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      toast.success('User created');
      setCreateUsername('');
      setCreatePassword('');
      setCreateRole('editor');
      await loadUsers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function updateRole(id: number, role: Role) {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      toast.success('Role updated');
      await loadUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function updatePassword(id: number) {
    const password = (passwordDrafts[id] || '').trim();
    if (!password) return;
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setPasswordDrafts((prev) => ({ ...prev, [id]: '' }));
      toast.success('Password updated');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function removeUser(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      toast.success('User deleted');
      await loadUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function reviewLoginRequest(email: string, action: 'approve' | 'deny') {
    try {
      const role = requestRoleDrafts[email] || 'viewer';
      const res = await fetch('/api/users/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} request`);
      toast.success(action === 'approve' ? 'Access approved' : 'Access denied');
      await Promise.all([loadLoginRequests(), loadUsers()]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function savePolicy(instanceId: string) {
    const policy = policies[instanceId];
    if (!policy) return;
    setSavingPolicy(prev => ({ ...prev, [instanceId]: true }));
    try {
      const res = await fetch('/api/memory-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: instanceId, ...policy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save memory policy');
      setPolicies(prev => ({ ...prev, [instanceId]: data.policy }));
      toast.success(`Decay policy saved (${instanceId})`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPolicy(prev => ({ ...prev, [instanceId]: false }));
    }
  }

  async function saveAlertPolicy(instanceId: string) {
    const policy = alertPolicies[instanceId];
    if (!policy) return;
    setSavingAlertPolicy(prev => ({ ...prev, [instanceId]: true }));
    try {
      const res = await fetch('/api/memory-alert-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: instanceId, ...policy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save alert policy');
      setAlertPolicies(prev => ({ ...prev, [instanceId]: data.policy }));
      toast.success(`Alert policy saved (${instanceId})`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingAlertPolicy(prev => ({ ...prev, [instanceId]: false }));
    }
  }

  return (
    <div className="space-y-6 animate-in w-full">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Settings size={20} /> {t(language, 'titleSettings')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(language, 'settingsSubtitle')}
          </p>
        </div>
        <div className="panel-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'general', label: t(language, 'settingsTabGeneral') },
              { key: 'memory', label: t(language, 'settingsTabMemory') },
              { key: 'access', label: t(language, 'settingsTabAccess') },
              { key: 'about', label: t(language, 'settingsTabAbout') },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as SettingsTab)}
                className={`rounded-lg px-3 py-2 text-sm border transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Database Info */}
      {activeTab === 'general' && (
      <>
      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Database size={14} className="text-primary" /> {t(language, 'settingsDatabaseTitle')}
          </h2>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
        {syncInfo ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{t(language, 'settingsDbPath')}</span>
                <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate">
                  {syncInfo.db_path}
                </code>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{t(language, 'settingsStateDir')}</span>
                <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate">
                  {syncInfo.state_dir}
                </code>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{t(language, 'settingsDbSize')}</span>
                <span className="font-mono">{syncInfo.db_size_mb.toFixed(2)} MB</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">{t(language, 'settingsSeedRecords')}</span>
                <span className="font-mono">{syncInfo.seed_count}</span>
              </div>
            </div>

            {/* Table row counts */}
            <div>
              <span className="text-xs text-muted-foreground block mb-2">{t(language, 'settingsTables')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {syncInfo.tables.map(t => (
                  <div key={t.name} className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs">{t.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            {t(language, 'settingsLoading')}
          </div>
        )}
        </div>
      </div>
      </>
      )}

      {/* Memory Decay Policy */}
      {activeTab === 'memory' && (
      <>
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <BrainCircuit size={14} className="text-info" /> Memory Decay Policy
        </h2>
        <p className="text-xs text-muted-foreground">
          Controls recency decay and prune thresholds for KB-manager per OpenClaw instance.
        </p>
        {instances.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading instances...</div>
        ) : instances.map((it) => {
          const ns = it.id;
          const policy = policies[ns];
          return (
            <div key={ns} className="rounded-lg border border-border/40 p-4 space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {it.label} <span className="font-mono text-[10px] opacity-70">({ns})</span>
              </div>
              {policy ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Half-life Days</span>
                      <input
                        type="number"
                        min={7}
                        max={365}
                        value={policy.decay_half_life_days}
                        onChange={(e) => setPolicies(prev => ({ ...prev, [ns]: { ...policy, decay_half_life_days: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Min Effective Confidence</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={policy.min_effective_confidence}
                        onChange={(e) => setPolicies(prev => ({ ...prev, [ns]: { ...policy, min_effective_confidence: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Min Keep Confidence</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={policy.min_keep_confidence}
                        onChange={(e) => setPolicies(prev => ({ ...prev, [ns]: { ...policy, min_keep_confidence: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Low-Confidence Prune Days</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={policy.low_confidence_prune_days}
                        onChange={(e) => setPolicies(prev => ({ ...prev, [ns]: { ...policy, low_confidence_prune_days: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">Default TTL Days</span>
                      <input
                        type="number"
                        min={7}
                        max={365}
                        value={policy.default_ttl_days}
                        onChange={(e) => setPolicies(prev => ({ ...prev, [ns]: { ...policy, default_ttl_days: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => savePolicy(ns)}
                      disabled={savingPolicy[ns]}
                      className="btn btn-primary text-sm"
                    >
                      {savingPolicy[ns] ? 'Saving...' : `Save ${ns} Policy`}
                    </button>
                    <span className="text-xs text-muted-foreground">Target: {ns} KB-manager cron</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading policy...</div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}

      {activeTab === 'general' && (
      <>
      {/* Sync Controls */}
      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <RefreshCw size={14} className="text-success" /> {t(language, 'settingsSyncTitle')}
          </h2>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
        <p className="text-xs text-muted-foreground">
          {t(language, 'settingsSyncDescription')}
        </p>
        {syncInfo?.sync_health && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(language, 'settingsLastSync')}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono">
                  {syncInfo.sync_health.last_sync_at ? timeAgo(syncInfo.sync_health.last_sync_at) : '—'}
                </span>
                {syncInfo.sync_health.last_sync_status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                    syncInfo.sync_health.last_sync_status === 'ok'
                      ? 'bg-success/15 text-success'
                      : 'bg-destructive/15 text-destructive'
                  }`}>
                    {syncInfo.sync_health.last_sync_status}
                  </span>
                )}
              </div>
              <div className="mt-1 text-muted-foreground">
                {t(language, 'settingsDuration')}: {syncInfo.sync_health.last_sync_duration_ms ?? '—'} ms
              </div>
            </div>
            <div className="rounded-lg border border-border/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(language, 'settingsLastSuccess')}</div>
              <div className="mt-1 font-mono">
                {syncInfo.sync_health.last_success_at ? timeAgo(syncInfo.sync_health.last_success_at) : '—'}
              </div>
              <div className="mt-1 text-muted-foreground">
                {t(language, 'settingsDuration')}: {syncInfo.sync_health.last_success_duration_ms ?? '—'} ms
              </div>
            </div>
            {syncInfo.sync_health.last_sync_error && (
              <div className="sm:col-span-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {t(language, 'settingsLastError')}: {syncInfo.sync_health.last_sync_error}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? t(language, 'settingsSyncing') : t(language, 'settingsSyncNow')}
          </button>
          <button
            onClick={clearSeeds}
            disabled={clearing}
            className="btn btn-destructive text-sm flex items-center gap-2"
          >
            <Trash2 size={14} />
            {clearing ? t(language, 'settingsClearing') : t(language, 'settingsClearSeed')}
          </button>
        </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{t(language, 'mailSettingsTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t(language, 'mailSettingsSubtitle')}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-muted/10">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(language, 'mailAccounts')}</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">office@aikitz.at</div>
                    <div className="text-[11px] text-muted-foreground">{t(language, 'mailPrimary')}</div>
                  </div>
                  <span className="text-[10px] text-success">{t(language, 'settingsActive')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">ceo@aikitz.at</div>
                    <div className="text-[11px] text-muted-foreground">{t(language, 'mailSupport')}</div>
                  </div>
                  <span className="text-[10px] text-success">{t(language, 'settingsActive')}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-muted/10">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(language, 'mailServer')}</div>
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground">{t(language, 'mailSmtp')}</div>
                  <div className="text-sm font-medium">smtp.world4you.com</div>
                  <div className="text-[11px] text-muted-foreground">{t(language, 'mailPortTls')}: 587</div>
                </div>
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground">{t(language, 'mailImap')}</div>
                  <div className="text-sm font-medium">imap.world4you.com</div>
                  <div className="text-[11px] text-muted-foreground">{t(language, 'mailPortSsl')}: 993</div>
                </div>
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground">{t(language, 'mailPop3')}</div>
                  <div className="text-sm font-medium">pop3.world4you.com</div>
                  <div className="text-[11px] text-muted-foreground">{t(language, 'mailPortSsl')}: 995</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button className="btn btn-primary btn-sm">{t(language, 'mailSaveChanges')}</button>
          </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2">
              <KeyRound size={14} className="text-primary" /> {t(language, 'apiKeysTitle')}
            </h2>
            <p className="text-xs text-muted-foreground">{t(language, 'apiKeysSubtitle')}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1600px] group-hover:opacity-100">
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="space-y-4 rounded-xl border border-border/40 p-4 bg-muted/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t(language, 'apiProvider')}</span>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value as ApiProvider)}
                  >
                    {providerOptions.map((provider) => (
                      <option key={provider.value} value={provider.value}>{provider.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t(language, 'apiModel')}</span>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={currentApiProfile.model}
                    onChange={(e) => updateApiProfile('model', e.target.value)}
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs text-muted-foreground">{t(language, 'apiKey')}</span>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    type="password"
                    value={currentApiProfile.key}
                    onChange={(e) => updateApiProfile('key', e.target.value)}
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs text-muted-foreground">{t(language, 'apiBaseUrl')}</span>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={currentApiProfile.baseUrl}
                    onChange={(e) => updateApiProfile('baseUrl', e.target.value)}
                  />
                </label>
                {(apiProvider === 'openai' || apiProvider === 'deepseek') && (
                  <label className="space-y-2">
                    <span className="text-xs text-muted-foreground">{t(language, 'apiOrganization')}</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={currentApiProfile.organization ?? ''}
                      onChange={(e) => updateApiProfile('organization', e.target.value)}
                    />
                  </label>
                )}
                {(apiProvider === 'openai' || apiProvider === 'google') && (
                  <label className="space-y-2">
                    <span className="text-xs text-muted-foreground">{t(language, 'apiProject')}</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={currentApiProfile.project ?? ''}
                      onChange={(e) => updateApiProfile('project', e.target.value)}
                    />
                  </label>
                )}
                {apiProvider === 'anthropic' && (
                  <label className="space-y-2">
                    <span className="text-xs text-muted-foreground">{t(language, 'apiWorkspace')}</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={currentApiProfile.workspace ?? ''}
                      onChange={(e) => updateApiProfile('workspace', e.target.value)}
                    />
                  </label>
                )}
                {apiProvider === 'google' && (
                  <label className="space-y-2">
                    <span className="text-xs text-muted-foreground">{t(language, 'apiRegion')}</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={currentApiProfile.region ?? ''}
                      onChange={(e) => updateApiProfile('region', e.target.value)}
                    />
                  </label>
                )}
                {apiProvider === 'openrouter' && (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs text-muted-foreground">{t(language, 'apiReferer')}</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={currentApiProfile.referer ?? ''}
                      onChange={(e) => updateApiProfile('referer', e.target.value)}
                    />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Info size={12} />
                <span>{t(language, 'apiKeysHint')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm">{t(language, 'apiSaveProfile')}</button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={providerOptions.find((provider) => provider.value === apiProvider)?.platform}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} /> {t(language, 'apiOpenPlatform')}
                </a>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/40 p-4 bg-muted/10">
              <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t(language, 'apiHealth')}</div>
                  <div className="text-sm font-medium">{providerOptions.find((provider) => provider.value === apiProvider)?.label}</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    currentApiProfile.health === 'healthy'
                      ? 'bg-success'
                      : currentApiProfile.health === 'warning'
                        ? 'bg-warning'
                        : 'bg-destructive'
                  }`} />
                  <span>
                    {currentApiProfile.health === 'healthy'
                      ? t(language, 'apiStatusHealthy')
                      : currentApiProfile.health === 'warning'
                        ? t(language, 'apiStatusWarning')
                        : t(language, 'apiStatusOffline')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/40 p-3">
                  <div className="text-xs text-muted-foreground">{t(language, 'apiUsage')}</div>
                  <div className="mt-1 font-medium">{currentApiProfile.usage}</div>
                </div>
                <div className="rounded-lg border border-border/40 p-3">
                  <div className="text-xs text-muted-foreground">{t(language, 'apiCredits')}</div>
                  <div className="mt-1 font-medium">{currentApiProfile.credits}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">{t(language, 'apiPlatformUrl')}</div>
                <a
                  href={providerOptions.find((provider) => provider.value === apiProvider)?.platform}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary break-all inline-flex items-center gap-2"
                >
                  {providerOptions.find((provider) => provider.value === apiProvider)?.platform}
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{t(language, 'openClawTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t(language, 'openClawSubtitle')}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className={`btn btn-sm ${openClawEnabled ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleOpenClaw}
            >
              {openClawEnabled ? t(language, 'openClawEnabled') : t(language, 'openClawDisabled')}
            </button>
            <div className="text-xs text-muted-foreground">{t(language, 'openClawMode')}</div>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={openClawMode}
              onChange={(e) => setOpenClawMode(e.target.value as 'local' | 'vps')}
            >
              <option value="local">{t(language, 'openClawLocal')}</option>
              <option value="vps">{t(language, 'openClawVps')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{t(language, 'cliModuleTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t(language, 'cliModuleSubtitle')}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1400px] group-hover:opacity-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliApp')}</div>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                value={cliApp}
                onChange={(e) => setCliApp(e.target.value)}
              >
                {cliApps.map((app) => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliConnection')}</div>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                value={cliConnection}
                onChange={(e) => setCliConnection(e.target.value)}
              >
                {['Local', 'SSH', 'Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI'].map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliEndpoint')}</div>
              <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" value={currentCliPreset.endpoint} readOnly />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliProfile')}</div>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" value={cliProfileName} onChange={(e) => setCliProfileName(e.target.value)}>
                <option value={cliProfileName}>{cliProfileName}</option>
                <option value="staging">staging</option>
                <option value="local">local</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliToken')}</div>
              <div className="flex items-center gap-2">
                <input className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" type="password" value={currentCliPreset.token} readOnly />
                <button className="btn btn-ghost btn-sm">{t(language, 'cliGenerateToken')}</button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn btn-primary btn-sm" onClick={connectCli}>{t(language, 'cliConnect')}</button>
            <button className="btn btn-ghost btn-sm" onClick={disconnectCli}>{t(language, 'cliDisconnect')}</button>
          </div>
          <div className="rounded-xl border border-border/50 p-3 mt-3 bg-primary/5">
            <div className="text-xs text-muted-foreground mb-1">Ready profile</div>
            <div className="text-sm font-medium">{cliApp} · {currentCliPreset.connection} · {currentCliPreset.profile}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Endpoint: {currentCliPreset.endpoint}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliActiveSessions')}</div>
              {cliSessions.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t(language, 'cliNoSessions')}</div>
              ) : (
                cliSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between text-sm">
                    <span>{session.app} · {session.connection}</span>
                    <span className="text-[10px] text-muted-foreground">{t(language, 'settingsOnline')}</span>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">{t(language, 'cliCommands')}</div>
              {currentCliPreset.commands.map((cmd) => (
                <div key={cmd} className="flex items-center justify-between gap-2">
                  <code className="text-[11px] bg-muted/40 px-2 py-1 rounded">{cmd}</code>
                  <button className="btn btn-ghost btn-xs">{t(language, 'cliCopy')}</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2">{t(language, 'cliConnectionMethods')}</div>
            <div className="flex flex-wrap gap-2">
              {['Local', 'SSH', 'Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI'].map((method) => (
                <span key={method} className="px-2 py-0.5 rounded-full text-[10px] bg-muted/50 text-muted-foreground">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sync File Diagnostics */}
      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Database size={14} className="text-info" /> {t(language, 'settingsSyncDiagnosticsTitle')}
          </h2>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
          {syncInfo?.sync_files && syncInfo.sync_files.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40">
                    <th className="text-left py-2 pr-2">{t(language, 'settingsFile')}</th>
                    <th className="text-left py-2 pr-2">{t(language, 'settingsLastSeen')}</th>
                    <th className="text-left py-2 pr-2">{t(language, 'settingsFileMtime')}</th>
                    <th className="text-left py-2 pr-2">{t(language, 'settingsSize')}</th>
                    <th className="text-left py-2 pr-2">{t(language, 'settingsStatus')}</th>
                    <th className="text-left py-2">{t(language, 'settingsError')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syncInfo.sync_files.map(file => (
                    <tr key={file.filename} className="border-b border-border/20">
                      <td className="py-2 pr-2 font-mono">{file.filename}</td>
                      <td className="py-2 pr-2">{file.last_seen_at ? timeAgo(file.last_seen_at) : '—'}</td>
                      <td className="py-2 pr-2">{file.last_mtime ? timeAgo(file.last_mtime) : '—'}</td>
                      <td className="py-2 pr-2 font-mono">
                        {typeof file.size_bytes === 'number' ? `${Math.round(file.size_bytes / 1024)} KB` : '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                          file.last_status === 'ok'
                            ? 'bg-success/15 text-success'
                            : file.last_status === 'missing'
                              ? 'bg-warning/15 text-warning'
                              : 'bg-destructive/15 text-destructive'
                        }`}>
                          {file.last_status || 'unknown'}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{file.last_error || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t(language, 'settingsNoTelemetry')}</div>
          )}
        </div>
      </div>

      {/* Agent Configuration */}
      <div className="panel p-5 space-y-3 group">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Shield size={14} className="text-warning" /> {t(language, 'settingsAgentConfigTitle')}
          </h2>
          <span className="text-[10px] text-muted-foreground">{t(language, 'settingsHoverHint')}</span>
        </div>
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-[1200px] group-hover:opacity-100">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">{t(language, 'settingsInstances')}</span>
              <span className="font-mono">{instances.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">{t(language, 'settingsAgentDiscovery')}</span>
              <span>{t(language, 'settingsAgentDiscoveryValue')}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{t(language, 'settingsNotes')}</span>
              <span className="text-muted-foreground">{t(language, 'settingsAgentNotesValue')}</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Memory Alert Thresholds */}
      {activeTab === 'memory' && (
      <>
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <BellRing size={14} className="text-warning" /> Memory Alert Thresholds
        </h2>
        <p className="text-xs text-muted-foreground">
          Controls thresholds used by memory drift alerts (hourly + weekly jobs).
        </p>
        {instances.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading instances...</div>
        ) : instances.map((it) => {
          const ns = it.id;
          const policy = alertPolicies[ns];
          return (
            <div key={ns} className="rounded-lg border border-border/40 p-4 space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {it.label} <span className="font-mono text-[10px] opacity-70">({ns})</span>
              </div>
              {policy ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Window Days</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={policy.window_days}
                        onChange={(e) => setAlertPolicies(prev => ({ ...prev, [ns]: { ...policy, window_days: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Contradiction Threshold</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={policy.alert_contradictions_threshold}
                        onChange={(e) => setAlertPolicies(prev => ({ ...prev, [ns]: { ...policy, alert_contradictions_threshold: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Duplicate Threshold</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={policy.alert_duplicates_threshold}
                        onChange={(e) => setAlertPolicies(prev => ({ ...prev, [ns]: { ...policy, alert_duplicates_threshold: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Weak-Agent Threshold</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={policy.alert_weak_agents_threshold}
                        onChange={(e) => setAlertPolicies(prev => ({ ...prev, [ns]: { ...policy, alert_weak_agents_threshold: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">Never-Accessed Ratio Threshold</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={policy.alert_never_ratio_threshold}
                        onChange={(e) => setAlertPolicies(prev => ({ ...prev, [ns]: { ...policy, alert_never_ratio_threshold: Number(e.target.value) } }))}
                        className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveAlertPolicy(ns)}
                      disabled={savingAlertPolicy[ns]}
                      className="btn btn-primary text-sm"
                    >
                      {savingAlertPolicy[ns] ? 'Saving...' : `Save ${ns} Alert Policy`}
                    </button>
                    <span className="text-xs text-muted-foreground">Target: {ns} memory-drift cron</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading policy...</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Policy Effect */}
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <BrainCircuit size={14} className="text-primary" /> Policy Effect
        </h2>
        {instances.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading instances...</div>
        ) : (
          <div className="space-y-3">
            {instances.map((it) => {
              const memoryEffect = memoryEffects[it.id];
              return (
                <div key={it.id} className="rounded-lg border border-border/40 p-4 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {it.label} <span className="font-mono text-[10px] opacity-70">({it.id})</span>
                  </div>
                  {!memoryEffect ? (
                    <div className="text-sm text-muted-foreground">Loading policy effect...</div>
                  ) : !memoryEffect.available || !memoryEffect.deltas ? (
                    <div className="text-xs text-muted-foreground">
                      Not enough history yet ({memoryEffect.history_points ?? 0} drift points, {memoryEffect.policy_changes ?? 0} policy changes).
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Baseline: {memoryEffect.baseline_at} · Current: {memoryEffect.current_at}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <MetricDelta label="Contradictions" value={memoryEffect.deltas.contradictions} inverse />
                        <MetricDelta label="Duplicates" value={memoryEffect.deltas.duplicates} inverse />
                        <MetricDelta label="Weak Agents" value={memoryEffect.deltas.weak_agents} inverse />
                        <MetricDelta label="Hot Memory" value={memoryEffect.deltas.hot_memory} />
                        <MetricDelta
                          label="Never Accessed Ratio"
                          value={memoryEffect.deltas.never_accessed_ratio}
                          percent
                          inverse
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* Users & Roles */}
      {activeTab === 'access' && (
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Users size={14} className="text-primary" /> Users & Roles
        </h2>
        {currentUser?.role !== 'admin' ? (
          <p className="text-xs text-muted-foreground">
            Admin access required to manage users and roles.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Login Requests
                </div>
                <button
                  type="button"
                  className="btn text-xs px-2 py-1"
                  onClick={() => loadLoginRequests()}
                  disabled={requestLoading}
                >
                  {requestLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {requestLoading ? (
                <p className="text-xs text-muted-foreground">Loading login requests...</p>
              ) : loginRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No login requests yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {loginRequests.map((req) => (
                    <div key={req.email} className="rounded-lg border border-border/50 bg-muted/5 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{req.email}</div>
                          <div className="text-xs text-muted-foreground">
                            status: {req.status} • attempts: {req.attempts}
                          </div>
                          {req.status === 'pending' && req.last_error ? (
                            <div className="text-xs text-warning truncate">last error: {req.last_error}</div>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(req.last_attempt_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <select
                          value={requestRoleDrafts[req.email] || req.requested_role}
                          onChange={(e) => setRequestRoleDrafts((prev) => ({ ...prev, [req.email]: e.target.value as Role }))}
                          className="px-2 py-1 rounded-md border border-border bg-background text-xs"
                        >
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-primary text-xs px-2 py-1"
                          onClick={() => reviewLoginRequest(req.email, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-destructive text-xs px-2 py-1"
                          onClick={() => reviewLoginRequest(req.email, 'deny')}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-muted/10">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Create User</div>
              <form onSubmit={createUserRecord} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="username"
                  required
                />
                <input
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="password (min 10 chars)"
                  type="password"
                  required
                />
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as Role)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button type="submit" disabled={createSubmitting} className="btn btn-primary text-sm flex items-center justify-center gap-2">
                  <UserPlus size={14} /> {createSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-muted/10">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role Matrix</div>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/40">
                      <th className="text-left py-2 pr-2">Capability</th>
                      {roleMatrix.roles.map(role => (
                        <th key={role} className="text-left py-2 pr-2 capitalize">{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roleMatrix.capabilities.map(cap => (
                      <tr key={cap.key} className="border-b border-border/20">
                        <td className="py-2 pr-2">{cap.label}</td>
                        {roleMatrix.roles.map(role => {
                          const has = roleMatrix.roleCapabilities[role].includes(cap.key);
                          return (
                            <td key={`${role}-${cap.key}`} className="py-2 pr-2">
                              {has ? '✓' : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {userLoading ? (
              <p className="text-xs text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="rounded-xl border border-border/50 p-3 space-y-3 bg-muted/5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{user.username}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email || 'No email'} • {user.auth_provider || 'local'}
                        </div>
                      </div>
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value as Role)}
                        className="px-2 py-1 rounded-md border border-border bg-background text-xs"
                      >
                        <option value="admin">admin</option>
                        <option value="editor">editor</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={passwordDrafts[user.id] || ''}
                        onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        className="px-2 py-1 rounded-md border border-border bg-background text-xs flex-1 min-w-[180px]"
                        placeholder="new password"
                        type="password"
                      />
                      <button
                        onClick={() => updatePassword(user.id)}
                        type="button"
                        className="btn text-xs px-2 py-1 flex items-center gap-1"
                      >
                        <KeyRound size={12} /> Set Password
                      </button>
                      <button
                        onClick={() => removeUser(user.id)}
                        type="button"
                        className="btn btn-destructive text-xs px-2 py-1 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* About */}
      {activeTab === 'about' && (
      <>
      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Info size={14} className="text-info" /> About
        </h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Dashboard</span>
            <span>Hermes Dashboard v{dashboardVersion}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Runtime</span>
            <span>Next.js 16 + SQLite (WAL)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Agent Platform</span>
            <span>OpenClaw (v2026.3.x compatible)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">License</span>
            <span>MIT</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Source</span>
            <a
              href="https://github.com/builderz-labs/hermes-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              GitHub <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-medium">Keyboard Shortcuts</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['⌘K', 'Command palette / search'],
            ['⌘.', 'Toggle live feed'],
            ['Esc', 'Close dialogs'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3 py-1">
              <kbd className="bg-muted px-2 py-0.5 rounded font-mono text-[11px] min-w-[32px] text-center">
                {key}
              </kbd>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function MetricDelta({
  label,
  value,
  percent = false,
  inverse = false,
}: {
  label: string;
  value: { before: number; after: number; delta: number };
  percent?: boolean;
  inverse?: boolean;
}) {
  const good = inverse ? value.delta <= 0 : value.delta >= 0;
  const cls = good ? 'text-success' : 'text-warning';
  const fmt = (n: number) => (percent ? `${(n * 100).toFixed(1)}%` : `${n}`);
  const deltaPrefix = value.delta > 0 ? '+' : '';
  return (
    <div className="bg-muted/30 rounded p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono">
        {fmt(value.before)} → {fmt(value.after)}{' '}
        <span className={cls}>({deltaPrefix}{fmt(value.delta)})</span>
      </div>
    </div>
  );
}
