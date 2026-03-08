'use client';

import { Send, Bot, ShieldCheck, Activity } from 'lucide-react';
import { TelegramIcon } from '@/components/ui/platform-icons';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function TelegramPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold flex items-center gap-2"><TelegramIcon className="text-[#229ED9]" /> {t(language, 'titleTelegram')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'telegramSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'telegramBots')}</div>
          <div className="text-sm font-medium">7 active</div>
          <div className="text-[11px] text-muted-foreground">3 in review</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'telegramChannels')}</div>
          <div className="text-sm font-medium">12 managed</div>
          <div className="text-[11px] text-muted-foreground">Growth +14%</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'telegramBroadcasts')}</div>
          <div className="text-sm font-medium">4 queued</div>
          <div className="text-[11px] text-muted-foreground">Next at 14:00</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'telegramSecurity')}</div>
          <div className="text-sm font-medium">Verified</div>
          <div className="text-[11px] text-muted-foreground">TLS enforced</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">{t(language, 'telegramChannelActivity')}</div>
          <div className="space-y-2">
            {['Product Updates', 'Investor Room', 'Community Hub', 'Support Alerts'].map((name) => (
              <div key={name} className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
                <Activity size={16} className="text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-[11px] text-muted-foreground">Engagement 6.3% · 3 posts today</div>
                </div>
                <button className="btn btn-ghost btn-sm">Open</button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4 space-y-4">
          <div className="text-sm font-medium">{t(language, 'telegramBotFleet')}</div>
          <div className="space-y-2">
            {['Lead Qualifier', 'Onboarding', 'Status Bot'].map((bot) => (
              <div key={bot} className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
                <Bot size={16} className="text-warning" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{bot}</div>
                  <div className="text-[11px] text-muted-foreground">Uptime 99.9%</div>
                </div>
                <ShieldCheck size={14} className="text-success" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm"><Send size={14} /> {t(language, 'telegramBroadcast')}</button>
            <button className="btn btn-ghost btn-sm">{t(language, 'telegramAnalytics')}</button>
            <button className="btn btn-ghost btn-sm">{t(language, 'telegramSettings')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
