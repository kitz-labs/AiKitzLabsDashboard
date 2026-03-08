import fs from 'node:fs';
import path from 'node:path';

import { getInstance, resolveOpenClawPaths } from './instances';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'sales' | 'research' | 'ops';
}

export interface CronJob {
  id: string;
  label: string;
  skill: string;
  schedule: string; // human-readable
  cron: string; // cron expression
  days?: string[]; // ['mon'] for monday-only, etc.
}

export interface AgentDefinition {
  id: string;
  name: string;
  emoji: string;
  role: string;
  description: string;
  model: string;
  fallbacks: string[];
  tools: string[];
  skills: AgentSkill[];
  cronJobs: CronJob[];
  workspace: string;
}

interface OpenClawModel {
  primary?: unknown;
  fallbacks?: unknown;
}

interface OpenClawAgent {
  id?: unknown;
  name?: unknown;
  workspace?: unknown;
  model?: unknown;
  identity?: {
    emoji?: unknown;
    theme?: unknown;
  };
  tools?: {
    allow?: unknown;
  };
}

interface OpenClawConfig {
  models?: {
    providers?: Record<string, {
      api?: unknown;
      baseUrl?: unknown;
      models?: unknown;
    }>;
  };
  agents?: {
    defaults?: { model?: unknown; workspace?: unknown };
    list?: OpenClawAgent[];
  };
}

export interface OpenClawProviderSummary {
  id: string;
  api: string | null;
  baseUrl: string | null;
  modelCount: number;
}

export interface OpenClawModelSummary {
  id: string;
  provider: string;
  alias: string;
}

type AgentStaticMeta = {
  name?: string;
  emoji?: string;
  role?: string;
  description?: string;
  skills?: AgentSkill[];
  cronJobs?: CronJob[];
};

const DEFAULT_ORDER = ['main', 'kitz', 'apollo', 'athena', 'metis', 'kb-manager'];

const AGENT_ID_ALIASES: Record<string, string> = {
  marketing: 'kitz',
  sales: 'apollo',
  knowledge: 'athena',
  analytics: 'metis',
  manager: 'main',
  core: 'main',
};

const DEFAULT_STATIC_META: Record<string, AgentStaticMeta> = {
  main: {
    name: 'Main',
    emoji: '🎛️',
    role: 'Orchestrator',
    description: 'Primary agent that coordinates the rest of the system.',
  },
  kitz: {
    name: 'Kitz',
    emoji: '\u{1F3DB}\u{FE0F}',
    role: 'Marketing Engine',
    description:
      'Content creation, social engagement, brand building, and experiment management.',
  },
  apollo: {
    name: 'Apollo',
    emoji: '\u{1F3AF}',
    role: 'Sales Pipeline',
    description: 'Lead discovery, scoring, sequences, and reply triage.',
  },
  athena: {
    name: 'Athena',
    emoji: '\u{1F9E0}',
    role: 'SEO & Content Optimization',
    description: 'SEO strategy, keyword research, and content optimization.',
  },
  metis: {
    name: 'Metis',
    emoji: '\u{1F4CA}',
    role: 'Analytics & Reporting',
    description: 'KPI tracking, reporting, and insight generation.',
  },
  'kb-manager': {
    name: 'KB Manager',
    emoji: '\u{1F4DA}',
    role: 'Knowledge Management',
    description: 'Collective memory steward and hygiene operator.',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function defaultWorkspaceFor(openclawHome: string, agentId: string, defaultWorkspace?: string): string {
  if (defaultWorkspace) {
    return defaultWorkspace;
  }
  return path.join(openclawHome, `workspace-${agentId}`);
}

function parseModelRouting(value: unknown): { primary: string; fallbacks: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') return { primary: value, fallbacks: [] };
  if (typeof value !== 'object') return null;

  const model = value as OpenClawModel;
  const primary = typeof model.primary === 'string' ? model.primary : null;
  const fallbacks = Array.isArray(model.fallbacks)
    ? model.fallbacks.filter((m): m is string => typeof m === 'string')
    : [];

  if (!primary) return null;
  return { primary, fallbacks };
}

function normalizeAgentId(id: string): string {
  const normalized = id.trim().toLowerCase();
  return AGENT_ID_ALIASES[normalized] ?? normalized;
}

function sortAgentIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ia = DEFAULT_ORDER.indexOf(a);
    const ib = DEFAULT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

function readOpenClawConfig(openclawConfigPath: string): OpenClawConfig | null {
  try {
    if (!fs.existsSync(openclawConfigPath)) return null;
    return JSON.parse(fs.readFileSync(openclawConfigPath, 'utf-8')) as OpenClawConfig;
  } catch {
    return null;
  }
}

export function getOpenClawModelCatalog(instanceId?: string): {
  providers: OpenClawProviderSummary[];
  models: OpenClawModelSummary[];
} {
  const instance = getInstance(instanceId);
  const { openclawConfigPath } = resolveOpenClawPaths(instance);
  const config = readOpenClawConfig(openclawConfigPath);
  const providersRaw = config?.models?.providers;
  if (!providersRaw || typeof providersRaw !== 'object') {
    return { providers: [], models: [] };
  }

  const providers: OpenClawProviderSummary[] = [];
  const models: OpenClawModelSummary[] = [];

  for (const [providerId, providerConfig] of Object.entries(providersRaw)) {
    const providerModels = isRecord(providerConfig) && Array.isArray(providerConfig.models)
      ? providerConfig.models
      : [];

    providers.push({
      id: providerId,
      api: isRecord(providerConfig) && typeof providerConfig.api === 'string' ? providerConfig.api : null,
      baseUrl: isRecord(providerConfig) && typeof providerConfig.baseUrl === 'string' ? providerConfig.baseUrl : null,
      modelCount: providerModels.length,
    });

    for (const modelEntry of providerModels) {
      if (!isRecord(modelEntry)) continue;
      const modelId = typeof modelEntry.id === 'string' ? modelEntry.id : null;
      if (!modelId) continue;
      const alias = typeof modelEntry.name === 'string'
        ? modelEntry.name
        : typeof modelEntry.alias === 'string'
          ? modelEntry.alias
          : modelId;

      models.push({
        id: modelId,
        provider: providerId,
        alias,
      });
    }
  }

  return { providers, models };
}

function discoverAgentIdsFromFs(agentsDir: string): string[] {
  try {
    if (!fs.existsSync(agentsDir)) return [];

    const dirents = fs.readdirSync(agentsDir, { withFileTypes: true });
    const out: string[] = [];
    for (const d of dirents) {
      const fullPath = path.join(agentsDir, d.name);

      if (d.isDirectory()) {
        out.push(d.name);
        continue;
      }

      // Many deployments store canonical agent ids as symlinks (e.g. kitz -> marketing).
      if (d.isSymbolicLink()) {
        try {
          if (fs.statSync(fullPath).isDirectory()) out.push(d.name);
        } catch {
          // ignore broken symlinks
        }
      }
    }

    return out;
  } catch {
    return [];
  }
}

function loadStaticMeta(): Record<string, AgentStaticMeta> {
  const useDefault = String(process.env.KITZ_USE_DEFAULT_AGENT_META ?? 'false')
    .trim()
    .toLowerCase() !== 'false';

  const jsonRaw = process.env.KITZ_AGENT_META_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as unknown;
      if (isRecord(parsed)) return parsed as Record<string, AgentStaticMeta>;
    } catch {
      // ignore
    }
  }

  const filePath = process.env.KITZ_AGENT_META_PATH?.trim();
  if (filePath) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) return parsed as Record<string, AgentStaticMeta>;
    } catch {
      // ignore
    }
  }

  return useDefault ? DEFAULT_STATIC_META : {};
}

export function getAgents(instanceId?: string): AgentDefinition[] {
  const instance = getInstance(instanceId);
  const { openclawHome, openclawConfigPath, agentsDir } = resolveOpenClawPaths(instance);

  const staticMeta = loadStaticMeta();
  const config = readOpenClawConfig(openclawConfigPath);
  const defaultsModel = parseModelRouting(config?.agents?.defaults?.model);
  const defaultsWorkspace =
    typeof config?.agents?.defaults?.workspace === 'string'
      ? config?.agents?.defaults?.workspace.trim()
      : '';

  const configuredList = Array.isArray(config?.agents?.list) ? config?.agents?.list ?? [] : [];
  const configuredById = new Map<string, OpenClawAgent>();

  for (const entry of configuredList) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) continue;
    const normalizedId = normalizeAgentId(entry.id);
    configuredById.set(normalizedId, entry);
  }

  const ids = new Set<string>();
  if (configuredById.size > 0) {
    for (const id of configuredById.keys()) ids.add(id);
  } else {
    for (const id of discoverAgentIdsFromFs(agentsDir)) ids.add(normalizeAgentId(id));
  }
  if (ids.size === 0) {
    for (const id of Object.keys(staticMeta)) ids.add(id);
  }

  return sortAgentIds([...ids]).map((id) => {
    const configured = configuredById.get(id);
    const meta = staticMeta[id] ?? {};

    const identityEmoji =
      typeof configured?.identity?.emoji === 'string' ? configured.identity.emoji : undefined;
    const identityTheme =
      typeof configured?.identity?.theme === 'string' ? configured.identity.theme : undefined;

    const modelRouting = parseModelRouting(configured?.model) ?? defaultsModel;

    const allowedTools = Array.isArray(configured?.tools?.allow)
      ? configured.tools.allow.filter((t): t is string => typeof t === 'string')
      : [];

    const name =
      (typeof configured?.name === 'string' && configured.name.trim()) ||
      meta.name ||
      toTitleCase(id);

    const role = meta.role || (identityTheme ? toTitleCase(identityTheme) : 'Agent');

    const workspace =
      (typeof configured?.workspace === 'string' && configured.workspace.trim()) ||
      defaultWorkspaceFor(openclawHome, id, defaultsWorkspace || undefined);

    return {
      id,
      name,
      emoji: meta.emoji || identityEmoji || '\u{1F916}',
      role,
      description: meta.description || `${name} autonomous agent.`,
      model: modelRouting?.primary || 'unknown',
      fallbacks: modelRouting?.fallbacks ?? [],
      tools: allowedTools,
      skills: meta.skills ?? [],
      cronJobs: meta.cronJobs ?? [],
      workspace,
    };
  });
}

export function getAgentIds(instanceId?: string): string[] {
  return getAgents(instanceId).map((a) => a.id);
}

export function getAgent(instanceId: string | undefined, id: string): AgentDefinition | undefined {
  return getAgents(instanceId).find((a) => a.id === id);
}

// Map activity_log actions to agent + skill (dashboard-local semantics).
export const ACTION_TO_AGENT: Record<string, { agent: string; skill: string }> = {
  post: { agent: 'kitz', skill: 'content-engine' },
  engage: { agent: 'kitz', skill: 'social-engagement' },
  research: { agent: 'kitz', skill: 'x-research' },
  discover: { agent: 'apollo', skill: 'cold-outreach' },
  send: { agent: 'apollo', skill: 'cold-outreach' },
  triage: { agent: 'apollo', skill: 'reply-triage' },
  alert: { agent: 'kitz', skill: 'reporting' },
};
