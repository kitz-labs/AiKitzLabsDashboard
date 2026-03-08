'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Cpu,
  Database,
  Files,
  GitBranch,
  Globe,
  History,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  LoaderCircle,
} from 'lucide-react';
import { useDashboard } from '@/store';
import { t, type TextKey } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

const PROVIDER_STATS = {
  openai: {
    endpoint: 'https://api.openai.com/v1',
    usage: '1.2M / 5M',
    credits: '$182.40',
    health: 'healthy' as const,
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com',
    usage: '840k / 3M',
    credits: '$96.00',
    health: 'healthy' as const,
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com',
    usage: '620k / 2M',
    credits: '$74.10',
    health: 'warning' as const,
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1',
    usage: '2.4M / 8M',
    credits: '$58.20',
    health: 'healthy' as const,
  },
};

const PROVIDER_MODELS = {
  openai: ['gpt-5.4', 'gpt-4.1', 'gpt-4.1-mini'],
  anthropic: ['claude-3-7-sonnet', 'claude-3-5-sonnet'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  openrouter: ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash'],
} as const;

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  openrouter: 'OpenRouter',
} as const;

const ACTION_SUGGESTION_SETS = [
  ['codingActionRefactor', 'codingActionPolishMobile', 'codingActionAuditApi', 'codingActionNormalizeI18n'],
  ['codingActionDesignSystem', 'codingActionWorkflowEngine', 'codingActionSessionMemory', 'codingActionApprovalFlow'],
  ['codingActionAgentBenchmarks', 'codingActionApiHardening', 'codingActionKnowledgeSync', 'codingActionAppObservability'],
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categorizeFile(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.includes('doc')) return 'docs' as const;
  if (lower.includes('flow') || lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'flows' as const;
  if (lower.includes('memory')) return 'memory' as const;
  if (/(\.ts|\.tsx|\.js|\.jsx|\.json)$/.test(lower)) return 'core' as const;
  return 'uploads' as const;
}

export default function CodingPage() {
  const {
    language,
    coding,
    updateCoding,
    toggleCodingAgent,
    addCodingKnowledgeFiles,
    removeCodingKnowledgeFile,
    archiveCodingSession,
  } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const providerStats = PROVIDER_STATS[coding.provider];
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const {
    autosaveEnabled,
    autosaveMinutes,
    enabledAgents,
    enabledProviders,
    mode,
    promptDraft,
    selectedActionItems,
    sessions,
    approvals,
    fileChangeDraft,
  } = coding;

  const persistSnapshot = useCallback(async (summary?: string) => {
    if (!promptDraft.trim()) {
      updateCoding({ lastSavedAt: new Date().toISOString() });
      return;
    }

    setBusy('snapshot');
    try {
      const response = await fetch('/api/coding/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: summary,
          summary: summary || t(language, 'codingAutosaveSummary'),
          promptDraft,
          output: `Mode: ${mode} · Providers: ${enabledProviders.join(', ')}`,
          agents: enabledAgents,
          selectedActions: selectedActionItems,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save snapshot');

      const session = data.session;
      updateCoding({
        lastSavedAt: new Date().toISOString(),
        sessions: [
          {
            id: session.id,
            title: session.title,
            summary: session.summary || '',
            input: session.input || '',
            output: session.output || '',
            status: session.status,
            agents: (session.agents || []) as typeof enabledAgents,
            updatedAt: session.updatedAt || new Date().toISOString(),
          },
          ...sessions.filter((item) => item.id !== session.id),
        ].slice(0, 24),
      });
    } catch {
      updateCoding({ lastSavedAt: new Date().toISOString() });
    } finally {
      setBusy(null);
    }
  }, [enabledAgents, enabledProviders, language, mode, promptDraft, selectedActionItems, sessions, updateCoding]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const timer = window.setInterval(() => {
      void persistSnapshot(t(language, 'codingAutosaveSummary'));
    }, autosaveMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [autosaveEnabled, autosaveMinutes, language, persistSnapshot]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      setSyncing(true);
      try {
        const response = await fetch('/api/coding/bootstrap', { cache: 'no-store' });
        const data = await response.json();
        if (!active) return;
        const patch: Partial<typeof coding> = {};
        if (Array.isArray(data.files)) {
          patch.knowledgeFiles = data.files.map((file: { contentPreview?: string; updatedAt?: string; createdAt?: string; type?: string; category: string; id: string; name: string; size: number }) => ({
            id: file.id,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            category: file.category as 'docs' | 'flows' | 'core' | 'memory' | 'uploads',
            contentPreview: file.contentPreview || '',
            addedAt: file.createdAt || file.updatedAt || new Date().toISOString(),
          }));
        }
        if (Array.isArray(data.sessions)) {
          patch.sessions = data.sessions.map((session: { id: string; title: string; summary?: string; input?: string; output?: string; status: 'active' | 'saved' | 'archived'; agents?: string[]; updatedAt?: string; createdAt?: string }) => ({
            id: session.id,
            title: session.title,
            summary: session.summary || '',
            input: session.input || '',
            output: session.output || '',
            status: session.status,
            agents: (session.agents || []) as typeof enabledAgents,
            updatedAt: session.updatedAt || session.createdAt || new Date().toISOString(),
          }));
        }
        if (Array.isArray(data.approvals)) {
          patch.approvals = data.approvals.map((approval: { id: string; title: string; summary?: string; status: 'pending' | 'approved' | 'rejected'; createdAt?: string; updatedAt?: string; payload?: Record<string, unknown> | null }) => ({
            id: approval.id,
            title: approval.title,
            summary: approval.summary || '',
            status: approval.status,
            createdAt: approval.createdAt || approval.updatedAt || new Date().toISOString(),
            updatedAt: approval.updatedAt || approval.createdAt || new Date().toISOString(),
            payload: approval.payload || null,
          }));
        }
        updateCoding(patch);
      } catch {
        // noop
      } finally {
        if (active) setSyncing(false);
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [enabledAgents, updateCoding]);

  const sectionButtons = useMemo(() => ([
    { key: 'agent', label: t(language, 'codingAgent'), icon: Bot },
    { key: 'api', label: t(language, 'codingApi'), icon: KeyRound },
    { key: 'files', label: t(language, 'codingFiles'), icon: Files },
    { key: 'sessions', label: t(language, 'codingSessions'), icon: History },
  ]), [language]);

  const agentOptions = useMemo(() => ([
    { id: 'github-copilot', label: t(language, 'codingAgentGithubCopilot'), icon: Sparkles },
    { id: 'app-architect', label: t(language, 'codingAgentArchitect'), icon: BrainCircuit },
    { id: 'full-stack-builder', label: t(language, 'codingAgentBuilder'), icon: Code2 },
    { id: 'qa-guardian', label: t(language, 'codingAgentQa'), icon: ShieldCheck },
    { id: 'ux-optimizer', label: t(language, 'codingAgentUx'), icon: Smartphone },
    { id: 'research-scout', label: t(language, 'codingAgentResearch'), icon: Search },
  ]), [language]);

  const topStats = useMemo(() => ([
    { label: t(language, 'codingEnabledAgents'), value: coding.enabledAgents.length, icon: Bot },
    { label: t(language, 'codingKnowledgeBase'), value: coding.knowledgeFiles.length, icon: Database },
    { label: t(language, 'codingSavedSessions'), value: coding.sessions.length, icon: History },
    { label: t(language, 'codingAutosave'), value: `${coding.autosaveMinutes}m`, icon: Clock3 },
  ]), [coding.autosaveMinutes, coding.enabledAgents.length, coding.knowledgeFiles.length, coding.sessions.length, language]);

  const workspaceSignals = useMemo(() => ([
    { label: t(language, 'codingCapabilitySearch'), icon: Globe, tone: 'text-info' },
    { label: t(language, 'codingCapabilityBuild'), icon: WandSparkles, tone: 'text-primary' },
    { label: t(language, 'codingCapabilityKnowledge'), icon: Database, tone: 'text-success' },
    { label: t(language, 'codingCapabilityAutosave'), icon: Save, tone: 'text-warning' },
  ]), [language]);

  const actionItems = useMemo(() => (
    ACTION_SUGGESTION_SETS[coding.suggestionsVersion % ACTION_SUGGESTION_SETS.length]
      .map((key) => ({ key, label: t(language, key) }))
  ), [coding.suggestionsVersion, language]);

  const fileChangeApprovals = useMemo(
    () => approvals.filter((approval) => approval.payload && approval.payload.type === 'file-change'),
    [approvals],
  );

  const selectedFileApproval = useMemo(
    () => fileChangeApprovals.find((approval) => approval.id === fileChangeDraft.selectedApprovalId) || null,
    [fileChangeApprovals, fileChangeDraft.selectedApprovalId],
  );
  const selectedFileApprovalPayload = (selectedFileApproval?.payload || null) as Record<string, unknown> | null;

  const lastSavedLabel = coding.lastSavedAt ? timeAgo(coding.lastSavedAt) : '—';

  async function createApprovalRequest() {
    if (coding.selectedActionItems.length === 0) return;
    setBusy('approval');
    try {
      const selectedLabels = coding.selectedActionItems.map((key) => t(language, key as TextKey));
      const response = await fetch('/api/coding/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedLabels[0],
          summary: selectedLabels.join(' · '),
          payload: {
            promptDraft: coding.promptDraft,
            selectedActions: coding.selectedActionItems,
            agents: coding.enabledAgents,
            providers: coding.enabledProviders,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create approval');
      updateCoding({
        approvals: [
          {
            id: data.approval.id,
            title: data.approval.title,
            summary: data.approval.summary || '',
            status: data.approval.status,
            createdAt: data.approval.createdAt || new Date().toISOString(),
            updatedAt: data.approval.updatedAt || new Date().toISOString(),
          },
          ...coding.approvals.filter((item) => item.id !== data.approval.id),
        ],
      });
    } catch {
      // noop for now
    } finally {
      setBusy(null);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setBusy('upload');
    const uploadedRecords: typeof coding.knowledgeFiles = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const response = await fetch('/api/coding/files', {
          method: 'POST',
          body: form,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        uploadedRecords.push({
          id: data.file.id,
          name: data.file.name,
          type: data.file.type || file.type || 'application/octet-stream',
          size: data.file.size,
          category: (data.file.category || categorizeFile(file.name)) as 'docs' | 'flows' | 'core' | 'memory' | 'uploads',
          contentPreview: data.file.contentPreview || '',
          addedAt: data.file.createdAt || data.file.updatedAt || new Date().toISOString(),
        });
      }
      addCodingKnowledgeFiles(uploadedRecords);
    } finally {
      setBusy(null);
    }
    event.target.value = '';
  }

  async function handleDeleteFile(id: string) {
    setBusy(`delete-file-${id}`);
    try {
      await fetch(`/api/coding/files?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      removeCodingKnowledgeFile(id);
    } finally {
      setBusy(null);
    }
  }

  function toggleSuggestion(key: string) {
    const selected = coding.selectedActionItems.includes(key)
      ? coding.selectedActionItems.filter((item) => item !== key)
      : [...coding.selectedActionItems, key];
    updateCoding({ selectedActionItems: selected });
  }

  function loadNewSuggestions() {
    updateCoding({
      suggestionsVersion: coding.suggestionsVersion + 1,
      selectedActionItems: [],
    });
  }

  async function previewFileChange(createApproval = false) {
    if (!fileChangeDraft.filePath.trim() || !fileChangeDraft.proposedContent.trim()) return;
    setBusy(createApproval ? 'file-approval' : 'diff-preview');
    try {
      const response = await fetch('/api/coding/file-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: fileChangeDraft.filePath,
          title: fileChangeDraft.title,
          summary: fileChangeDraft.summary,
          proposedContent: fileChangeDraft.proposedContent,
          createApproval,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate diff preview');

      const patch: Partial<typeof coding> = {
        fileChangeDraft: {
          ...fileChangeDraft,
          diffPreview: data.preview.diffPreview,
          currentContent: data.preview.currentContent,
          selectedApprovalId: data.approval?.id || fileChangeDraft.selectedApprovalId,
        },
      };

      if (data.approval) {
        patch.approvals = [
          {
            id: data.approval.id,
            title: data.approval.title,
            summary: data.approval.summary || '',
            status: data.approval.status,
            createdAt: data.approval.createdAt || new Date().toISOString(),
            updatedAt: data.approval.updatedAt || new Date().toISOString(),
            payload: data.approval.payload || {
              type: 'file-change',
              filePath: data.preview.filePath,
              diffPreview: data.preview.diffPreview,
            },
          },
          ...approvals.filter((item) => item.id !== data.approval.id),
        ];
      }

      updateCoding(patch);
    } catch {
      // noop for now
    } finally {
      setBusy(null);
    }
  }

  async function updateApprovalStatus(approvalId: string, status: 'approved' | 'rejected') {
    setBusy(`approval-${status}-${approvalId}`);
    try {
      const response = await fetch('/api/coding/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId, status }),
      });
      if (!response.ok) return;
      updateCoding({
        approvals: approvals.map((approval) => (
          approval.id === approvalId ? { ...approval, status, updatedAt: new Date().toISOString() } : approval
        )),
      });
    } finally {
      setBusy(null);
    }
  }

  function selectFileApproval(approvalId: string) {
    const approval = fileChangeApprovals.find((item) => item.id === approvalId);
    const payload = approval?.payload as Record<string, string> | null | undefined;
    updateCoding({
      fileChangeDraft: {
        ...fileChangeDraft,
        selectedApprovalId: approvalId,
        filePath: payload?.filePath || fileChangeDraft.filePath,
        title: approval?.title || fileChangeDraft.title,
        summary: approval?.summary || fileChangeDraft.summary,
        proposedContent: payload?.proposedContent || fileChangeDraft.proposedContent,
        currentContent: payload?.currentContent || fileChangeDraft.currentContent,
        diffPreview: payload?.diffPreview || fileChangeDraft.diffPreview,
      },
    });
  }

  function toggleProvider(provider: keyof typeof PROVIDER_LABELS) {
    const exists = coding.enabledProviders.includes(provider);
    const nextProviders = exists
      ? coding.enabledProviders.filter((item) => item !== provider)
      : [...coding.enabledProviders, provider];

    const safeProviders = nextProviders.length > 0 ? nextProviders : [provider];
    updateCoding({
      enabledProviders: safeProviders,
      provider: safeProviders.includes(coding.provider) ? coding.provider : safeProviders[0],
      model: safeProviders.includes(coding.provider)
        ? coding.model
        : PROVIDER_MODELS[safeProviders[0]][0],
    });
  }

  function renderAgentPanel() {
    return (
      <div className="panel p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot size={16} className="text-primary" /> {t(language, 'codingAgentTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingAgentSubtitle')}</p>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">{t(language, 'codingSelectAgents')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agentOptions.map((agent) => {
              const Icon = agent.icon;
              const active = coding.enabledAgents.includes(agent.id as never);
              return (
                <label
                  key={agent.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors ${
                    active ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCodingAgent(agent.id as never)}
                    className="h-4 w-4"
                  />
                  <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="text-sm font-medium">{agent.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingBehaviorMode')}</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={coding.mode}
              onChange={(e) => updateCoding({ mode: e.target.value as typeof coding.mode })}
            >
              <option value="balanced">{t(language, 'codingModeBalanced')}</option>
              <option value="pro">{t(language, 'codingModePro')}</option>
              <option value="ultra">{t(language, 'codingModeUltra')}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingReasoningMode')}</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={coding.reasoningMode}
              onChange={(e) => updateCoding({ reasoningMode: e.target.value as typeof coding.reasoningMode })}
            >
              <option value="fast">{t(language, 'codingReasoningFast')}</option>
              <option value="precise">{t(language, 'codingReasoningPrecise')}</option>
              <option value="architecture">{t(language, 'codingReasoningArchitecture')}</option>
              <option value="refactor">{t(language, 'codingReasoningRefactor')}</option>
              <option value="ux">{t(language, 'codingReasoningUx')}</option>
              <option value="debug">{t(language, 'codingReasoningDebug')}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingApprovalMode')}</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={coding.approvalMode}
              onChange={(e) => updateCoding({ approvalMode: e.target.value as typeof coding.approvalMode })}
            >
              <option value="ask-first">{t(language, 'codingApprovalAskFirst')}</option>
              <option value="review-first">{t(language, 'codingApprovalReviewFirst')}</option>
              <option value="execute-approved">{t(language, 'codingApprovalExecuteApproved')}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingLearningMode')}</span>
            <div className="rounded-lg border border-border/40 px-3 py-2 bg-muted/10 text-sm flex items-center justify-between">
              <span>{t(language, 'codingLearningEnabled')}</span>
              <span className="text-success">{coding.learningEnabled ? 'On' : 'Off'}</span>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border/40 p-3 bg-muted/10 flex items-center justify-between gap-3">
            <span>{t(language, 'codingDailyLearning')}</span>
            <span className={coding.dailyLearning ? 'text-success' : 'text-muted-foreground'}>{coding.dailyLearning ? 'On' : 'Off'}</span>
          </div>
          <div className="rounded-xl border border-border/40 p-3 bg-muted/10 flex items-center justify-between gap-3">
            <span>{t(language, 'codingAlwaysAskFirst')}</span>
            <span className={coding.approvalRequired ? 'text-success' : 'text-muted-foreground'}>{coding.approvalRequired ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderApiPanel() {
    const healthLabel = providerStats.health === 'healthy'
      ? t(language, 'codingHealthHealthy')
      : providerStats.health === 'warning'
        ? t(language, 'codingHealthWarning')
        : t(language, 'codingHealthOffline');

    return (
      <div className="panel p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <KeyRound size={16} className="text-primary" /> {t(language, 'codingApiTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingApiSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingApiKeysMulti')}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(PROVIDER_LABELS).map(([providerKey, providerLabel]) => {
                const active = coding.enabledProviders.includes(providerKey as keyof typeof PROVIDER_LABELS);
                return (
                  <label
                    key={providerKey}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors ${
                      active ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleProvider(providerKey as keyof typeof PROVIDER_LABELS)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{providerLabel}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingProvider')}</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={coding.provider}
              onChange={(e) => updateCoding({ provider: e.target.value as typeof coding.provider, model: PROVIDER_MODELS[e.target.value as keyof typeof PROVIDER_MODELS][0] })}
            >
              {coding.enabledProviders.map((provider) => (
                <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs text-muted-foreground">{t(language, 'codingModel')}</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={coding.model}
              onChange={(e) => updateCoding({ model: e.target.value })}
            >
              {PROVIDER_MODELS[coding.provider].map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/40 p-3">
            <div className="text-xs text-muted-foreground">{t(language, 'codingApiHealth')}</div>
            <div className="mt-1 flex items-center gap-2 font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${providerStats.health === 'healthy' ? 'bg-success' : providerStats.health === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
              {healthLabel}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <div className="text-xs text-muted-foreground">{t(language, 'codingApiUsage')}</div>
            <div className="mt-1 font-medium">{providerStats.usage}</div>
          </div>
          <div className="rounded-xl border border-border/40 p-3 col-span-2">
            <div className="text-xs text-muted-foreground">{t(language, 'codingApiEndpoint')}</div>
            <div className="mt-1 font-mono text-xs break-all">{providerStats.endpoint}</div>
          </div>
          <div className="rounded-xl border border-border/40 p-3 col-span-2">
            <div className="text-xs text-muted-foreground">{t(language, 'codingApiCredits')}</div>
            <div className="mt-1 font-medium">{providerStats.credits}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 p-3 bg-muted/10 text-xs text-muted-foreground space-y-1">
          <div className="font-medium text-foreground">{t(language, 'codingApiProfilesPrepared')}</div>
          <div>{t(language, 'codingApiProfilesHint')}</div>
          <div className="pt-1">{t(language, 'codingApiActiveProviders')}: {coding.enabledProviders.map((provider) => PROVIDER_LABELS[provider]).join(', ')}</div>
        </div>
      </div>
    );
  }

  function renderFilesPanel() {
    return (
      <div className="panel p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Files size={16} className="text-primary" /> {t(language, 'codingFilesTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingFilesSubtitle')}</p>
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-5 text-center space-y-3">
          <Upload size={18} className="mx-auto text-primary" />
          <div className="text-sm font-medium">{t(language, 'codingUploadFiles')}</div>
          <div className="text-xs text-muted-foreground">{t(language, 'codingUploadHelp')}</div>
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> {t(language, 'codingUploadFiles')}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        </div>

        {coding.knowledgeFiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t(language, 'codingEmptyFiles')}</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {coding.knowledgeFiles.map((file) => (
              <div key={file.id} className="rounded-xl border border-border/40 p-3 bg-muted/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2 mt-1">
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span>{file.category === 'docs' ? t(language, 'codingFileDocs') : file.category === 'flows' ? t(language, 'codingFileFlows') : file.category === 'core' ? t(language, 'codingFileCore') : file.category === 'memory' ? t(language, 'codingFileMemory') : t(language, 'codingFileUploads')}</span>
                      <span>•</span>
                      <span>{timeAgo(file.addedAt)}</span>
                    </div>
                    {file.contentPreview ? (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-3">{file.contentPreview}</div>
                    ) : null}
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteFile(file.id)}>
                    <Trash2 size={12} /> {t(language, 'codingRemove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderSessionsPanel() {
    return (
      <div className="panel p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <History size={16} className="text-primary" /> {t(language, 'codingSessionsTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingSessionsSubtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/40 p-3 bg-muted/10">
            <div className="text-xs text-muted-foreground">{t(language, 'codingAutosaveEvery')}</div>
            <div className="mt-1 font-medium">{coding.autosaveMinutes} min</div>
          </div>
          <div className="rounded-xl border border-border/40 p-3 bg-muted/10">
            <div className="text-xs text-muted-foreground">{t(language, 'codingLastSaved')}</div>
            <div className="mt-1 font-medium">{lastSavedLabel}</div>
          </div>
        </div>

        {coding.sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t(language, 'codingNoSavedYet')}</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {coding.sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-border/40 p-3 bg-muted/10 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{session.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{session.summary}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(session.updatedAt)}</div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{session.input}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => updateCoding({ promptDraft: session.input, activeSection: 'agent' })}
                  >
                    <RefreshCw size={12} /> {t(language, 'codingRestoreSession')}
                  </button>
                  <button className="btn btn-ghost btn-xs" onClick={async () => {
                    await fetch('/api/coding/sessions', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: session.id, action: 'archive' }),
                    });
                    archiveCodingSession(session.id);
                  }}>
                    <Trash2 size={12} /> {t(language, 'codingArchiveSession')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {coding.approvals.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="text-xs text-muted-foreground">{t(language, 'codingApprovalQueue')}</div>
            {coding.approvals.slice(0, 6).map((approval) => (
              <div key={approval.id} className="rounded-xl border border-border/40 p-3 bg-muted/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{approval.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{approval.summary}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${approval.status === 'approved' ? 'bg-success/10 text-success' : approval.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {approval.status}
                  </span>
                </div>
                {approval.payload && approval.payload.type === 'file-change' && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="btn btn-ghost btn-xs" onClick={() => selectFileApproval(approval.id)}>
                      <Code2 size={12} /> {t(language, 'codingOpenDiff')}
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => void updateApprovalStatus(approval.id, 'approved')} disabled={approval.status !== 'pending' || busy === `approval-approved-${approval.id}`}>
                      <Check size={12} /> {t(language, 'codingApprove')}
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => void updateApprovalStatus(approval.id, 'rejected')} disabled={approval.status !== 'pending' || busy === `approval-rejected-${approval.id}`}>
                      <Trash2 size={12} /> {t(language, 'codingReject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const activePanel =
    coding.activeSection === 'agent' ? renderAgentPanel() :
    coding.activeSection === 'api' ? renderApiPanel() :
    coding.activeSection === 'files' ? renderFilesPanel() :
    renderSessionsPanel();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Code2 size={20} className="text-primary" /> {t(language, 'titleCoding')}
              </h1>
              <p className="text-sm text-muted-foreground max-w-4xl mt-2">{t(language, 'codingSubtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs bg-success/10 text-success border border-success/20">{t(language, 'codingStatusReady')}</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{t(language, 'codingStatusApproval')}</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-warning/10 text-warning border border-warning/20">{t(language, 'codingStatusLearning')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {topStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <Icon size={14} className="text-primary" />
                  </div>
                  <div className="text-xl font-semibold mt-2">{item.value}</div>
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max">
              {sectionButtons.map((section) => {
                const Icon = section.icon;
                const active = coding.activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => updateCoding({ activeSection: section.key as typeof coding.activeSection })}
                  >
                    <Icon size={14} /> {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.25fr_0.75fr] gap-4">
        <section className="panel p-5 space-y-5 min-h-[720px]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <WandSparkles size={16} className="text-primary" /> {t(language, 'codingWorkspaceTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingWorkspaceSubtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> {t(language, 'codingUploadContext')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => void persistSnapshot()}>
                <Save size={14} /> {t(language, 'codingSaveSnapshot')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => void persistSnapshot(t(language, 'codingPreparePlan'))}>
                <GitBranch size={14} /> {t(language, 'codingPreparePlan')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => void createApprovalRequest()} disabled={coding.selectedActionItems.length === 0 || busy === 'approval'}>
                {busy === 'approval' ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {t(language, 'codingRequestApproval')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={loadNewSuggestions}>
                <RefreshCw size={14} /> {t(language, 'codingNewSuggestions')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {workspaceSignals.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-xs">
                    <Icon size={12} className={item.tone} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={16} className="text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{t(language, 'codingLiveWorkspace')}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t(language, 'codingApprovalNotice')}</div>
                  {syncing && <div className="text-[11px] text-primary mt-2">{t(language, 'codingSyncingBackend')}</div>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t(language, 'codingInputLabel')}</label>
              <textarea
                value={coding.promptDraft}
                onChange={(e) => updateCoding({ promptDraft: e.target.value })}
                placeholder={t(language, 'codingInputPlaceholder')}
                className="w-full min-h-[180px] rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
              <div className="rounded-xl border border-border/40 bg-background/80 p-4 space-y-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Cpu size={15} className="text-primary" /> {t(language, 'codingExecutionPreview')}
                </div>
                <p className="text-sm text-muted-foreground">{t(language, 'codingExecutionPreviewBody')}</p>
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning flex items-center gap-2">
                  <AlertTriangle size={13} /> {t(language, 'codingApprovalRequired')}
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-success" /> {t(language, 'codingNextBestActions')}
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={loadNewSuggestions}>
                    <RefreshCw size={12} /> {t(language, 'codingNewSuggestions')}
                  </button>
                </div>
                <div className="space-y-2">
                  {actionItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleSuggestion(item.key)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-left transition-colors flex items-center gap-3 ${
                        coding.selectedActionItems.includes(item.key)
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/40 bg-muted/10 hover:bg-muted/20'
                      }`}
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center ${coding.selectedActionItems.includes(item.key) ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60'}`}>
                        {coding.selectedActionItems.includes(item.key) ? <Check size={12} /> : null}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t(language, 'codingSelectedSuggestions')}: {coding.selectedActionItems.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
              <div className="rounded-xl border border-border/40 bg-background/80 p-4 space-y-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Code2 size={15} className="text-primary" /> {t(language, 'codingFileChangeTitle')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingFileChangeSubtitle')}</p>
                </div>
                <label className="space-y-2 block">
                  <span className="text-xs text-muted-foreground">{t(language, 'codingFilePath')}</span>
                  <input
                    value={fileChangeDraft.filePath}
                    onChange={(event) => updateCoding({ fileChangeDraft: { ...fileChangeDraft, filePath: event.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    placeholder="src/app/coding/page.tsx"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-xs text-muted-foreground">{t(language, 'codingChangeTitle')}</span>
                  <input
                    value={fileChangeDraft.title}
                    onChange={(event) => updateCoding({ fileChangeDraft: { ...fileChangeDraft, title: event.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-xs text-muted-foreground">{t(language, 'codingChangeSummary')}</span>
                  <textarea
                    value={fileChangeDraft.summary}
                    onChange={(event) => updateCoding({ fileChangeDraft: { ...fileChangeDraft, summary: event.target.value } })}
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-xs text-muted-foreground">{t(language, 'codingProposedContent')}</span>
                  <textarea
                    value={fileChangeDraft.proposedContent}
                    onChange={(event) => updateCoding({ fileChangeDraft: { ...fileChangeDraft, proposedContent: event.target.value } })}
                    className="w-full min-h-[220px] px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs"
                    placeholder={t(language, 'codingProposedContentPlaceholder')}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => void previewFileChange(false)} disabled={!fileChangeDraft.filePath.trim() || !fileChangeDraft.proposedContent.trim() || busy === 'diff-preview'}>
                    {busy === 'diff-preview' ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />} {t(language, 'codingGenerateDiff')}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => void previewFileChange(true)} disabled={!fileChangeDraft.filePath.trim() || !fileChangeDraft.proposedContent.trim() || busy === 'file-approval'}>
                    {busy === 'file-approval' ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {t(language, 'codingCreateFileApproval')}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <GitBranch size={15} className="text-primary" /> {t(language, 'codingDiffPreview')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedFileApproval ? `${t(language, 'codingSelectedApproval')}: ${selectedFileApproval.title}` : t(language, 'codingCurrentDraft')}
                    </div>
                  </div>
                  {selectedFileApproval && (
                    <button className="btn btn-ghost btn-xs" onClick={() => updateCoding({ fileChangeDraft: { ...fileChangeDraft, selectedApprovalId: null } })}>
                      {t(language, 'codingBackToDraft')}
                    </button>
                  )}
                </div>
                <div className="rounded-lg border border-border/40 p-3 bg-muted/10 text-xs text-muted-foreground">
                  <div>{t(language, 'codingFilePath')}: {typeof selectedFileApprovalPayload?.filePath === 'string' ? selectedFileApprovalPayload.filePath : fileChangeDraft.filePath || '—'}</div>
                  <div className="mt-1">{t(language, 'codingDiffStatus')}: {selectedFileApprovalPayload?.exists === false ? t(language, 'codingDiffNewFile') : t(language, 'codingDiffExistingFile')}</div>
                </div>
                <pre className="min-h-[320px] max-h-[460px] overflow-auto rounded-xl border border-border/40 bg-[#07101f] p-4 text-[11px] leading-5 text-slate-200 whitespace-pre-wrap">
{(typeof selectedFileApprovalPayload?.diffPreview === 'string' ? selectedFileApprovalPayload.diffPreview : fileChangeDraft.diffPreview || t(language, 'codingNoDiffYet'))}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {activePanel}

          <div className="panel p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Smartphone size={16} className="text-primary" /> {t(language, 'codingMobileTitle')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t(language, 'codingMobileSubtitle')}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'smart', label: t(language, 'codingMobileSmart') },
                { key: 'workspace', label: t(language, 'codingMobileWorkspace') },
                { key: 'controls', label: t(language, 'codingMobileControls') },
              ].map((option) => (
                <button
                  key={option.key}
                  className={`rounded-xl border px-3 py-2 text-sm ${coding.mobileView === option.key ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/40 bg-muted/10 text-muted-foreground'}`}
                  onClick={() => updateCoding({ mobileView: option.key as typeof coding.mobileView })}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border/40 p-3 bg-muted/10 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>{t(language, 'codingLastSaved')}</span>
                <span className="font-medium text-foreground">{lastSavedLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
