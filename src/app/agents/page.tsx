'use client';

import { useState } from 'react';
import {
  Bot, Cpu, Clock, Wrench, Zap, ChevronDown, ChevronUp,
  Circle, Activity, Calendar,
} from 'lucide-react';
import { useSmartPoll } from '@/hooks/use-smart-poll';
import { useDashboard } from '@/store';
import { AgentChat } from '@/components/chat/agent-chat';
import { CronStatus } from '@/components/cron/cron-status';
import { timeAgo } from '@/lib/utils';
import type { AgentRuntime, ActivityEntry } from '@/types';
import type { AgentDefinition, CronJob, AgentSkill } from '@/lib/agent-config';

type AgentWithRuntime = AgentDefinition & AgentRuntime;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success',
  idle: 'bg-warning',
  error: 'bg-destructive',
  planned: 'bg-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  planned: 'Not Started',
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: 'bg-primary/15 text-primary',
  sales: 'bg-success/15 text-success',
  research: 'bg-info/15 text-info',
  ops: 'bg-warning/15 text-warning',
};

export default function AgentsPage() {
  const realOnly = useDashboard(s => s.realOnly);

  const { data: agents, loading } = useSmartPoll<AgentWithRuntime[]>(
    () => fetch(`/api/agents${realOnly ? '?real=true' : ''}`).then(r => r.json()),
    { interval: 30_000, key: realOnly },
  );

  if (!agents || loading) {
    return (
      <div className="space-y-6 animate-in">
        <h1 className="text-xl font-semibold">Agents</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="card p-6 h-64 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agents</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Circle size={8} className="fill-success text-success" /> Active</span>
          <span className="flex items-center gap-1.5"><Circle size={8} className="fill-warning text-warning" /> Idle</span>
          <span className="flex items-center gap-1.5"><Circle size={8} className="fill-muted-foreground text-muted-foreground" /> Planned</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Agent-to-Agent Chat */}
      <AgentChat />

      {/* Cron job status */}
      <CronStatus />
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentWithRuntime }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card card-hover overflow-hidden">
      {/* Header */}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
              {agent.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{agent.name}</h3>
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]}`} />
                <span className="text-xs text-muted-foreground">{STATUS_LABELS[agent.status]}</span>
              </div>
              <p className="text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu size={12} />
            <span>{agent.model}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold font-mono">{agent.stats.actions_today}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Today</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold font-mono">{agent.stats.actions_week}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">This Week</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold font-mono">{agent.skills.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Skills</div>
          </div>
        </div>

        {/* Skills Tags */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Zap size={12} />
            <span className="font-medium">Skills</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {agent.skills.map(skill => (
              <span
                key={skill.id}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[skill.category]}`}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>

        {/* Last Activity */}
        {agent.stats.last_action_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity size={12} />
            <span className="truncate">{agent.stats.last_action}</span>
            <span className="shrink-0">{timeAgo(agent.stats.last_action_at)}</span>
          </div>
        )}
      </div>

      {/* Expand Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:bg-muted/30 border-t border-border/50 transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/30 animate-in">
          {/* Schedule */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 mt-4">
              <Calendar size={12} />
              <span className="font-medium">Schedule</span>
            </div>
            <div className="space-y-1.5">
              {agent.cronJobs.map((job: CronJob) => (
                <div key={job.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={10} className="text-muted-foreground" />
                    <span>{job.label}</span>
                    {job.days && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded uppercase">
                        {job.days.join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground font-mono">{job.schedule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Details */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Zap size={12} />
              <span className="font-medium">Skill Details</span>
            </div>
            <div className="space-y-2">
              {agent.skills.map((skill: AgentSkill) => (
                <div key={skill.id} className="text-xs">
                  <span className="font-medium">{skill.name}</span>
                  <p className="text-muted-foreground mt-0.5">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Wrench size={12} />
              <span className="font-medium">Tools ({agent.tools.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agent.tools.map(tool => (
                <code key={tool} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                  {tool}
                </code>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {agent.recent_activity.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Activity size={12} />
                <span className="font-medium">Recent Activity</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {agent.recent_activity.map((entry: ActivityEntry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0 w-16 font-mono">
                      {entry.ts ? timeAgo(entry.ts) : ''}
                    </span>
                    <span className="truncate">{entry.detail}</span>
                    {entry.result && (
                      <span className="text-success shrink-0">{entry.result}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
