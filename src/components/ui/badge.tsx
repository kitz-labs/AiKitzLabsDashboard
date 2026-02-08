import { STATUS_COLORS } from '@/lib/utils';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const color = STATUS_COLORS[status] || 'bg-zinc-700 text-zinc-300';
  return (
    <span className={`badge ${color} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
