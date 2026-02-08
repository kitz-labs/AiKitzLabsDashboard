'use client';

import { useEffect, useState } from 'react';
import { PenLine, MessageCircle, Mail, Search, Info, Activity } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { ActivityEntry } from '@/types';

const ACTION_FILTERS = [
  { key: '', label: 'All Actions' },
  { key: 'post', label: 'Post' },
  { key: 'engage', label: 'Engage' },
  { key: 'discover', label: 'Discover' },
  { key: 'send', label: 'Send' },
  { key: 'triage', label: 'Triage' },
  { key: 'research', label: 'Research' },
];

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? `?action=${filter}&limit=200` : '?limit=200';
    fetch(`/api/activity${params}`).then(r => r.json()).then(setEntries).catch(() => {});
  }, [filter]);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Activity Log</h1>
        <select
          className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          {ACTION_FILTERS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="card p-4">
        <div className="space-y-0">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No activity logged yet
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-start gap-4 py-3 ${
                  i < entries.length - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <ActionIcon action={entry.action} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {entry.action && (
                        <span className="text-xs font-medium text-primary uppercase mr-2">
                          {entry.action}
                        </span>
                      )}
                      <span className="text-sm">{entry.detail || '—'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(entry.ts)}
                    </span>
                  </div>
                  {entry.result && (
                    <p className="text-xs text-success mt-1">{entry.result}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ActionIcon({ action }: { action: string | null }) {
  const size = 14;
  const iconMap: Record<string, React.ReactNode> = {
    post: <PenLine size={size} />,
    engage: <MessageCircle size={size} />,
    send: <Mail size={size} />,
    discover: <Search size={size} />,
    research: <Search size={size} />,
    triage: <Activity size={size} />,
  };
  return <>{iconMap[action || ''] || <Info size={size} />}</>;
}
