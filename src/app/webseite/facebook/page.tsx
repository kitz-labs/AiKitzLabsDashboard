'use client';

import { BarChart3, Users, CalendarClock } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function FacebookPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleFacebook')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'websiteSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Page</div>
          <div className="text-sm font-medium">AI Kitz Labs</div>
          <div className="text-[11px] text-muted-foreground">Followers 18.4k</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Campaigns</div>
          <div className="text-sm font-medium">6 active</div>
          <div className="text-[11px] text-muted-foreground">ROAS 3.4</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Messages</div>
          <div className="text-sm font-medium">12 waiting</div>
          <div className="text-[11px] text-muted-foreground">Avg response 9m</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Content Planner</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <CalendarClock size={16} className="text-primary" />
            <div>
              <div className="text-sm font-medium">Next live stream</div>
              <div className="text-[11px] text-muted-foreground">Friday · 19:00</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm">Schedule Live</button>
        </div>
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Audience Insights</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users size={12} /> Top segment: B2B founders</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 size={12} /> Engagement 5.1%</div>
          <button className="btn btn-ghost btn-sm">Open Analytics</button>
        </div>
      </div>
    </div>
  );
}
