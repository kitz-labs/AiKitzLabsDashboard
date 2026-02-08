import { type ClassValue, clsx } from 'clsx';

// Simple clsx implementation (no external dep needed)
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return date;
  }
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return date;
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function timeAgo(date: string | null): string {
  if (!date) return '—';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const PILLAR_LABELS: Record<number, string> = {
  1: 'AI Dev Insights',
  2: 'Open Source',
  3: 'Build in Public',
  4: 'Founder Lessons',
  5: 'Tech Tutorials',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  pending_approval: 'bg-amber-900/60 text-amber-300',
  ready: 'bg-blue-900/60 text-blue-300',
  published: 'bg-emerald-900/60 text-emerald-300',
  rejected: 'bg-red-900/60 text-red-300',
  new: 'bg-zinc-700 text-zinc-300',
  validated: 'bg-blue-900/60 text-blue-300',
  contacted: 'bg-indigo-900/60 text-indigo-300',
  replied: 'bg-purple-900/60 text-purple-300',
  interested: 'bg-amber-900/60 text-amber-300',
  booked: 'bg-emerald-900/60 text-emerald-300',
  qualified: 'bg-green-900/60 text-green-300',
  disqualified: 'bg-red-900/60 text-red-300',
  queued: 'bg-zinc-700 text-zinc-300',
  approved: 'bg-blue-900/60 text-blue-300',
  sent: 'bg-emerald-900/60 text-emerald-300',
  cancelled: 'bg-red-900/60 text-red-300',
  pending: 'bg-amber-900/60 text-amber-300',
  proposed: 'bg-zinc-700 text-zinc-300',
  running: 'bg-blue-900/60 text-blue-300',
  completed: 'bg-emerald-900/60 text-emerald-300',
  SCALE: 'bg-emerald-900/60 text-emerald-300',
  ITERATE: 'bg-amber-900/60 text-amber-300',
  KILL: 'bg-red-900/60 text-red-300',
  high: 'bg-red-900/60 text-red-300',
  medium: 'bg-amber-900/60 text-amber-300',
  low: 'bg-zinc-700 text-zinc-300',
  pain: 'bg-red-900/60 text-red-300',
  hiring: 'bg-blue-900/60 text-blue-300',
  launch: 'bg-emerald-900/60 text-emerald-300',
  competitor: 'bg-purple-900/60 text-purple-300',
  brand_mention: 'bg-amber-900/60 text-amber-300',
  opportunity: 'bg-green-900/60 text-green-300',
};
