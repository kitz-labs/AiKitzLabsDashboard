import os from 'node:os';
import path from 'node:path';

export type KitzInstance = {
  id: string;
  label: string;
  openclawHome: string;
  cronUser?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expandHome(p: string): string {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function normalizeId(raw: unknown): string {
  return String(raw ?? '').trim();
}

function normalizeLabel(raw: unknown, fallback: string): string {
  const v = String(raw ?? '').trim();
  return v ? v : fallback;
}

function normalizeHome(raw: unknown): string {
  const v = String(raw ?? '').trim();
  return path.resolve(expandHome(v));
}

function parseInstancesFromEnv(): KitzInstance[] | null {
  const raw = process.env.KITZ_OPENCLAW_INSTANCES?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    const out: KitzInstance[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) continue;
      const id = normalizeId(item.id);
      const openclawHome = normalizeHome(item.openclawHome);
      if (!id || !openclawHome) continue;
      out.push({
        id,
        label: normalizeLabel(item.label, id),
        openclawHome,
        cronUser:
          typeof item.cronUser === 'string' && item.cronUser.trim()
            ? item.cronUser.trim()
            : undefined,
      });
    }

    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function getDefaultInstanceId(): string {
  const v = process.env.KITZ_DEFAULT_INSTANCE?.trim();
  return v ? v : 'default';
}

export function getInstances(): KitzInstance[] {
  const fromEnv = parseInstancesFromEnv();
  if (fromEnv) return fromEnv;

  const defaultId = getDefaultInstanceId();
  const home =
    process.env.KITZ_OPENCLAW_HOME?.trim() ||
    process.env.OPENCLAW_HOME?.trim() ||
    path.join(os.homedir(), '.openclaw');

  return [
    {
      id: defaultId,
      label: 'Default',
      openclawHome: path.resolve(expandHome(home)),
      cronUser: process.env.KITZ_CRON_USER?.trim() || undefined,
    },
  ];
}

export function getInstance(id?: string | null): KitzInstance {
  const instances = getInstances();
  const wanted = (id ?? '').trim();

  if (wanted) {
    const match = instances.find((it) => it.id === wanted);
    if (match) return match;

    // Back-compat: older UI used namespace=leads|openclaw.
    // If not configured, fall back to default instance.
    if (wanted === 'leads' || wanted === 'openclaw') {
      return getInstance(getDefaultInstanceId());
    }
  }

  return (
    instances[0] ?? {
      id: getDefaultInstanceId(),
      label: 'Default',
      openclawHome: path.join(os.homedir(), '.openclaw'),
    }
  );
}

export function resolveOpenClawPaths(instance: KitzInstance): {
  openclawHome: string;
  openclawConfigPath: string;
  agentsDir: string;
  cronDir: string;
  healthDir: string;
  logsDir: string;
} {
  const openclawHome = instance.openclawHome;
  return {
    openclawHome,
    openclawConfigPath: path.join(openclawHome, 'openclaw.json'),
    agentsDir: path.join(openclawHome, 'agents'),
    cronDir: path.join(openclawHome, 'cron'),
    healthDir: path.join(openclawHome, 'health'),
    logsDir: path.join(openclawHome, 'logs'),
  };
}

export function allowPolicyWrite(): boolean {
  return (
    String(process.env.KITZ_ALLOW_POLICY_WRITE ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export function allowCronWrite(): boolean {
  return (
    String(process.env.KITZ_ALLOW_CRON_WRITE ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export function allowWorkspaceWrite(): boolean {
  return (
    String(process.env.KITZ_ALLOW_WORKSPACE_WRITE ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}
