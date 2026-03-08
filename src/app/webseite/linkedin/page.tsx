'use client';

import { BarChart3, Briefcase, CalendarDays } from 'lucide-react';
import { LinkedinIcon } from '@/components/ui/platform-icons';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function LinkedInPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold flex items-center gap-2"><LinkedinIcon size={18} className="text-sky-600" /> {t(language, 'titleLinkedIn')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'websiteSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Company Page</div>
          <div className="text-sm font-medium">AI Kitz Labs</div>
          <div className="text-[11px] text-muted-foreground">Followers 9.2k</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Leads</div>
          <div className="text-sm font-medium">124 this month</div>
          <div className="text-[11px] text-muted-foreground">Conversion 4.9%</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Ads</div>
          <div className="text-sm font-medium">3 active</div>
          <div className="text-[11px] text-muted-foreground">Spend €1.2k</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Thought Leadership</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <CalendarDays size={16} className="text-primary" />
            <div>
              <div className="text-sm font-medium">Next article draft</div>
              <div className="text-[11px] text-muted-foreground">Due tomorrow · 09:00</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm">Publish</button>
        </div>
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Pipeline Impact</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase size={12} /> Opportunities influenced: 18</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 size={12} /> Engagement 7.4%</div>
          <button className="btn btn-ghost btn-sm">Open CRM</button>
        </div>
      </div>
    </div>
  );
}
