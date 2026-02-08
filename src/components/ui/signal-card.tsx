import type { Signal } from '@/types';
import { Badge } from './badge';
import { timeAgo } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  return (
    <div className="card card-hover p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {signal.type && <Badge status={signal.type} />}
          {signal.relevance && <Badge status={signal.relevance} />}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(signal.created_at)}
        </span>
      </div>
      <p className="text-sm">{signal.summary}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {signal.username && <span>@{signal.username}</span>}
        {signal.tweet_url && (
          <a
            href={signal.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            View <ExternalLink size={10} />
          </a>
        )}
        {signal.action_taken && (
          <span className="text-success">Action: {signal.action_taken}</span>
        )}
      </div>
    </div>
  );
}
