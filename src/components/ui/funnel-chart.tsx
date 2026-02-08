'use client';

import type { FunnelStep } from '@/types';

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const max = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const pct = (step.value / max) * 100;
        return (
          <div key={step.name} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 text-right capitalize">
              {step.name}
            </span>
            <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: `color-mix(in srgb, var(--primary) ${100 - i * 10}%, var(--accent))`,
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-medium">
                {step.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
