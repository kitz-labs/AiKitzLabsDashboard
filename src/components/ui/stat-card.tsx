'use client';

import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  sparkline?: { value: number }[];
  color?: string;
}

export function StatCard({ label, value, icon: Icon, trend, sparkline, color = 'var(--primary)' }: StatCardProps) {
  return (
    <div className="card card-hover stat-glow p-4 relative">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold font-mono tracking-tight">{formatNumber(value)}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last week
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="h-10 mt-2 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#gradient-${label})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
