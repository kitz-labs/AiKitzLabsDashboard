'use client';

import { PenLine, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useSmartPoll } from '@/hooks/use-smart-poll';
import { timeAgo } from '@/lib/utils';

interface ContentItem {
  id: string;
  platform: string;
  format: string;
  pillar: number;
  text_preview: string;
  status: string;
  scheduled_for: string | null;
}

const PILLAR_LABELS: Record<number, string> = {
  1: 'War Stories', 2: 'Playbooks', 3: 'Market POV', 4: 'Free Tools', 5: 'Curated Signal',
};

const PLATFORM_ICON: Record<string, string> = {
  x: '\u{1D54F}', linkedin: 'in', blog: '\u{1F4DD}',
};

const STATUS_STYLE: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  draft: { icon: PenLine, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  ready: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  scheduled: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  needs_review: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10' },
};

export function ContentCalendar() {
  const [expanded, setExpanded] = useState(false);

  const { data } = useSmartPoll<{ items: ContentItem[] }>(
    () => fetch('/api/content-calendar').then(r => r.json()),
    { interval: 60_000 },
  );

  const items = data?.items || [];
  if (items.length === 0) return null;

  const upcoming = items.filter(i => i.status === 'scheduled' || i.status === 'ready');
  const drafts = items.filter(i => i.status === 'draft' || i.status === 'needs_review');

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-chart-1/10 flex items-center justify-center">
            <PenLine size={16} className="text-chart-1" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">Content Queue</h3>
            <p className="text-[11px] text-muted-foreground">
              {upcoming.length} ready/scheduled · {drafts.length} drafts
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/30 divide-y divide-border/20">
          {items.slice(0, 8).map(item => {
            const style = STATUS_STYLE[item.status] || STATUS_STYLE.draft;
            const Icon = style.icon;
            return (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                  <Icon size={12} className={style.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 font-mono">
                      {PLATFORM_ICON[item.platform] || item.platform}
                    </span>
                    <span className="text-xs truncate">{item.text_preview || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.pillar && (
                      <span className="text-[10px] text-muted-foreground/60">
                        {PILLAR_LABELS[item.pillar] || `Pillar ${item.pillar}`}
                      </span>
                    )}
                    {item.scheduled_for && (
                      <span className="text-[10px] text-primary/60">
                        · {new Date(item.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] capitalize ${style.color}`}>{item.status.replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
