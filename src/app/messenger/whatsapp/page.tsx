'use client';

import { MessageCircle, PhoneCall, Users, Bot, Zap, CheckCircle2 } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function WhatsappPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleWhatsapp')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'whatsappSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'whatsappBusinessNumber')}</div>
          <div className="text-sm font-medium">+4367763690443</div>
          <div className="text-[11px] text-muted-foreground">Status: Connected</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'whatsappTemplates')}</div>
          <div className="text-sm font-medium">38 approved</div>
          <div className="text-[11px] text-muted-foreground">Compliance: 100%</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'whatsappAutomation')}</div>
          <div className="text-sm font-medium">12 active flows</div>
          <div className="text-[11px] text-muted-foreground">SLA: 4m avg response</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">{t(language, 'whatsappLiveConversations')}</div>
          <div className="space-y-2">
            {['Austrian Retail', 'Enterprise Sales', 'Support Tier 1', 'VIP Client'].map((name) => (
              <div key={name} className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <MessageCircle size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">Last message 3m ago · Priority</div>
                </div>
                <button className="btn btn-ghost btn-sm">Open</button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4 space-y-4">
          <div className="text-sm font-medium">{t(language, 'whatsappAutomationConsole')}</div>
          <div className="space-y-2">
            <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <Bot size={16} className="text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">Intent Router</div>
                <div className="text-[11px] text-muted-foreground">Classification + routing active</div>
              </div>
              <CheckCircle2 size={14} className="text-success" />
            </div>
            <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <Zap size={16} className="text-warning" />
              <div className="flex-1">
                <div className="text-sm font-medium">Lead Capture</div>
                <div className="text-[11px] text-muted-foreground">Pipelines: 4</div>
              </div>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </div>
            <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <Users size={16} className="text-info" />
              <div className="flex-1">
                <div className="text-sm font-medium">Agent Handoff</div>
                <div className="text-[11px] text-muted-foreground">Queue depth: 3</div>
              </div>
              <button className="btn btn-primary btn-sm">Assign</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm">{t(language, 'whatsappLaunchCampaign')}</button>
            <button className="btn btn-ghost btn-sm">{t(language, 'whatsappViewReports')}</button>
            <button className="btn btn-ghost btn-sm"><PhoneCall size={14} /> {t(language, 'whatsappCall')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
