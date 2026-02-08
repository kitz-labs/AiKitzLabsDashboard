'use client';

import { Check, X } from 'lucide-react';
import { Badge } from './badge';

interface ApprovalCardProps {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  status: string;
  meta?: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalCard({
  id, title, subtitle, body, status, meta, onApprove, onReject,
}: ApprovalCardProps) {
  const isPending = status === 'pending_approval';

  return (
    <div className="card card-hover p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <Badge status={status} />
      </div>
      <p className="text-sm text-card-foreground whitespace-pre-wrap line-clamp-4">{body}</p>
      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      {isPending && (
        <div className="flex gap-2 pt-1">
          <button className="btn btn-success btn-sm" onClick={() => onApprove(id)}>
            <Check size={14} /> Approve
          </button>
          <button className="btn btn-destructive btn-sm" onClick={() => onReject(id)}>
            <X size={14} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
