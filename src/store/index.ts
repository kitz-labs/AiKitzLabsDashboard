'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ContentPost, Lead, Sequence, Suppression, Engagement,
  Signal, Experiment, Learning, DailyMetrics, ActivityEntry,
  OverviewStats, Alert, FunnelStep, WeeklyKPI,
} from '@/types';

type CodingSection = 'agent' | 'api' | 'files' | 'sessions';
type CodingMode = 'balanced' | 'pro' | 'ultra';
type CodingReasoningMode = 'fast' | 'precise' | 'architecture' | 'refactor' | 'ux' | 'debug';
type CodingApprovalMode = 'ask-first' | 'review-first' | 'execute-approved';
type CodingMobileView = 'smart' | 'workspace' | 'controls';
type CodingAgentId =
  | 'github-copilot'
  | 'app-architect'
  | 'full-stack-builder'
  | 'qa-guardian'
  | 'ux-optimizer'
  | 'research-scout';
type CodingProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

interface CodingKnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  category: 'docs' | 'flows' | 'core' | 'memory' | 'uploads';
  contentPreview: string;
  addedAt: string;
}

interface CodingSession {
  id: string;
  title: string;
  summary: string;
  input: string;
  output: string;
  updatedAt: string;
  status: 'active' | 'saved' | 'archived';
  agents: CodingAgentId[];
}

interface CodingState {
  activeSection: CodingSection;
  enabledAgents: CodingAgentId[];
  enabledProviders: CodingProvider[];
  mode: CodingMode;
  reasoningMode: CodingReasoningMode;
  approvalMode: CodingApprovalMode;
  mobileView: CodingMobileView;
  provider: CodingProvider;
  model: string;
  apiHealth: 'healthy' | 'warning' | 'offline';
  autosaveEnabled: boolean;
  autosaveMinutes: number;
  lastSavedAt: string | null;
  promptDraft: string;
  knowledgeFiles: CodingKnowledgeFile[];
  sessions: CodingSession[];
  browserEnabled: boolean;
  canEditApp: boolean;
  approvalRequired: boolean;
  learningEnabled: boolean;
  dailyLearning: boolean;
  selectedActionItems: string[];
  suggestionsVersion: number;
}

interface DashboardState {
  // Data
  overview: OverviewStats;
  alerts: Alert[];
  content: ContentPost[];
  leads: Lead[];
  sequences: Sequence[];
  suppression: Suppression[];
  engagements: Engagement[];
  signals: Signal[];
  experiments: Experiment[];
  learnings: Learning[];
  dailyMetrics: DailyMetrics[];
  weeklyKPIs: WeeklyKPI[];
  activityLog: ActivityEntry[];
  funnel: FunnelStep[];

  // UI state
  loading: Record<string, boolean>;
  lastSynced: string | null;
  feedOpen: boolean;
  realOnly: boolean;
  language: 'en' | 'de';
  openClawEnabled: boolean;
  openClawMode: 'local' | 'vps';
  coding: CodingState;

  // Actions
  setOverview: (data: OverviewStats) => void;
  setAlerts: (data: Alert[]) => void;
  setContent: (data: ContentPost[]) => void;
  setLeads: (data: Lead[]) => void;
  setSequences: (data: Sequence[]) => void;
  setSuppression: (data: Suppression[]) => void;
  setEngagements: (data: Engagement[]) => void;
  setSignals: (data: Signal[]) => void;
  setExperiments: (data: Experiment[]) => void;
  setLearnings: (data: Learning[]) => void;
  setDailyMetrics: (data: DailyMetrics[]) => void;
  setWeeklyKPIs: (data: WeeklyKPI[]) => void;
  setActivityLog: (data: ActivityEntry[]) => void;
  setFunnel: (data: FunnelStep[]) => void;
  setLoading: (key: string, value: boolean) => void;
  setLastSynced: (ts: string) => void;
  toggleFeed: () => void;
  toggleRealOnly: () => void;
  toggleLanguage: () => void;
  toggleOpenClaw: () => void;
  setOpenClawMode: (mode: 'local' | 'vps') => void;
  updateCoding: (patch: Partial<CodingState>) => void;
  toggleCodingAgent: (agentId: CodingAgentId) => void;
  addCodingKnowledgeFiles: (files: CodingKnowledgeFile[]) => void;
  removeCodingKnowledgeFile: (id: string) => void;
  saveCodingSnapshot: (summary?: string) => void;
  archiveCodingSession: (id: string) => void;
}

export const useDashboard = create<DashboardState>()(persist((set, get) => ({
  overview: { posts_today: 0, engagement_today: 0, emails_sent: 0, pipeline_count: 0 },
  alerts: [],
  content: [],
  leads: [],
  sequences: [],
  suppression: [],
  engagements: [],
  signals: [],
  experiments: [],
  learnings: [],
  dailyMetrics: [],
  weeklyKPIs: [],
  activityLog: [],
  funnel: [],
  loading: {},
  lastSynced: null,
  feedOpen: false,
  realOnly: false,
  language: 'en',
  openClawEnabled: false,
  openClawMode: 'local',
  coding: {
    activeSection: 'agent',
    enabledAgents: ['github-copilot', 'app-architect', 'full-stack-builder'],
    enabledProviders: ['openai', 'anthropic'],
    mode: 'ultra',
    reasoningMode: 'architecture',
    approvalMode: 'ask-first',
    mobileView: 'smart',
    provider: 'openai',
    model: 'gpt-5.4',
    apiHealth: 'healthy',
    autosaveEnabled: true,
    autosaveMinutes: 30,
    lastSavedAt: null,
    promptDraft: '',
    knowledgeFiles: [
      {
        id: 'core-dashboard-spec',
        name: 'dashboard-core-spec.md',
        type: 'text/markdown',
        size: 18240,
        category: 'core',
        contentPreview: 'Core architecture, navigation rules, visual language, coding standards, and approval workflow for AI Kitz Labs Dashboard.',
        addedAt: '2026-03-08T09:00:00.000Z',
      },
      {
        id: 'memory-product-roadmap',
        name: 'product-memory-roadmap.md',
        type: 'text/markdown',
        size: 9640,
        category: 'memory',
        contentPreview: 'Persistent learning notes, future modules, branding decisions, mobile priorities, and session checkpoints.',
        addedAt: '2026-03-08T09:10:00.000Z',
      },
    ],
    sessions: [
      {
        id: 'coding-session-bootstrap',
        title: 'App Evolution Control Center',
        summary: 'Initial ultra-pro coding agent configuration for the dashboard.',
        input: 'Create a professional coding control center for ongoing app development.',
        output: 'Prepared navigation, persistent knowledge base, approval-first app changes, and mobile-friendly control surfaces.',
        updatedAt: '2026-03-08T09:15:00.000Z',
        status: 'active',
        agents: ['github-copilot', 'app-architect'],
      },
    ],
    browserEnabled: true,
    canEditApp: true,
    approvalRequired: true,
    learningEnabled: true,
    dailyLearning: true,
    selectedActionItems: [],
    suggestionsVersion: 0,
  },

  setOverview: (data) => set({ overview: data }),
  setAlerts: (data) => set({ alerts: data }),
  setContent: (data) => set({ content: data }),
  setLeads: (data) => set({ leads: data }),
  setSequences: (data) => set({ sequences: data }),
  setSuppression: (data) => set({ suppression: data }),
  setEngagements: (data) => set({ engagements: data }),
  setSignals: (data) => set({ signals: data }),
  setExperiments: (data) => set({ experiments: data }),
  setLearnings: (data) => set({ learnings: data }),
  setDailyMetrics: (data) => set({ dailyMetrics: data }),
  setWeeklyKPIs: (data) => set({ weeklyKPIs: data }),
  setActivityLog: (data) => set({ activityLog: data }),
  setFunnel: (data) => set({ funnel: data }),
  setLoading: (key, value) => set((s) => ({ loading: { ...s.loading, [key]: value } })),
  setLastSynced: (ts) => set({ lastSynced: ts }),
  toggleFeed: () => set((s) => ({ feedOpen: !s.feedOpen })),
  toggleRealOnly: () => set((s) => ({ realOnly: !s.realOnly })),
  toggleLanguage: () => set((s) => ({ language: s.language === 'en' ? 'de' : 'en' })),
  toggleOpenClaw: () => set((s) => ({ openClawEnabled: !s.openClawEnabled })),
  setOpenClawMode: (mode) => set({ openClawMode: mode }),
  updateCoding: (patch) => set((s) => ({ coding: { ...s.coding, ...patch } })),
  toggleCodingAgent: (agentId) => set((s) => ({
    coding: {
      ...s.coding,
      enabledAgents: s.coding.enabledAgents.includes(agentId)
        ? s.coding.enabledAgents.filter((item) => item !== agentId)
        : [...s.coding.enabledAgents, agentId],
    },
  })),
  addCodingKnowledgeFiles: (files) => set((s) => ({
    coding: {
      ...s.coding,
      knowledgeFiles: [...files, ...s.coding.knowledgeFiles].slice(0, 40),
      lastSavedAt: new Date().toISOString(),
    },
  })),
  removeCodingKnowledgeFile: (id) => set((s) => ({
    coding: {
      ...s.coding,
      knowledgeFiles: s.coding.knowledgeFiles.filter((file) => file.id !== id),
      lastSavedAt: new Date().toISOString(),
    },
  })),
  saveCodingSnapshot: (summary) => {
    const current = get().coding;
    const now = new Date().toISOString();

    if (!current.promptDraft.trim()) {
      set((s) => ({
        coding: {
          ...s.coding,
          lastSavedAt: now,
        },
      }));
      return;
    }

    const snapshot: CodingSession = {
      id: `coding-session-${now}`,
      title: summary ?? current.promptDraft.slice(0, 48),
      summary: summary ?? 'Saved coding context snapshot',
      input: current.promptDraft,
      output: `Mode: ${current.mode} · Agents: ${current.enabledAgents.join(', ')}`,
      updatedAt: now,
      status: 'saved',
      agents: current.enabledAgents,
    };

    set((s) => ({
      coding: {
        ...s.coding,
        lastSavedAt: now,
        sessions: [snapshot, ...s.coding.sessions].slice(0, 24),
      },
    }));
  },
  archiveCodingSession: (id) => set((s) => ({
    coding: {
      ...s.coding,
      sessions: s.coding.sessions.map((session) => (
        session.id === id ? { ...session, status: 'archived' } : session
      )),
      lastSavedAt: new Date().toISOString(),
    },
  })),
}), {
  name: 'hermes-dashboard',
  partialize: (state) => ({
    language: state.language,
    openClawEnabled: state.openClawEnabled,
    openClawMode: state.openClawMode,
    coding: state.coding,
  }),
}));

// Fetch helper
export async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}
