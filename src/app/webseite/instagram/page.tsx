'use client';

import { BarChart3, Image as ImageIcon, Calendar } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function InstagramPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleInstagram')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'websiteSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Account</div>
          <div className="text-sm font-medium">@aikitzlabs</div>
          <div className="text-[11px] text-muted-foreground">Followers +4.2% this week</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Content</div>
          <div className="text-sm font-medium">18 scheduled</div>
          <div className="text-[11px] text-muted-foreground">Stories queued: 7</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Engagement</div>
          <div className="text-sm font-medium">6.8%</div>
          <div className="text-[11px] text-muted-foreground">Top post: 2.4k likes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Publishing Calendar</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <Calendar size={16} className="text-primary" />
            <div>
              <div className="text-sm font-medium">Next drop: Product teaser</div>
              <div className="text-[11px] text-muted-foreground">Tomorrow · 10:00</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm">Schedule Post</button>
        </div>
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Creative Library</div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted/40 flex items-center justify-center">
                <ImageIcon size={18} className="text-muted-foreground" />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm"><BarChart3 size={14} /> Insights</button>
        </div>
      </div>
    </div>
  );
}
