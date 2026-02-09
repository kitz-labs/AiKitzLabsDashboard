'use client';

import { useSmartPoll } from '@/hooks/use-smart-poll';

interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

export function PipelineFunnel() {
  const { data } = useSmartPoll<{ stages: PipelineStage[] }>(
    () => fetch('/api/pipeline-funnel').then(r => r.json()),
    { interval: 60_000 },
  );

  const stages = data?.stages || [];
  if (stages.length === 0) return null;

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Pipeline Funnel</h3>
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max(15, (stage.count / maxCount) * 100);
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-20 text-right shrink-0">
                {stage.label}
              </span>
              <div className="flex-1 relative">
                <div
                  className="h-7 rounded-md flex items-center px-3 transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stage.color,
                    opacity: 0.85 - i * 0.08,
                  }}
                >
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {stage.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
