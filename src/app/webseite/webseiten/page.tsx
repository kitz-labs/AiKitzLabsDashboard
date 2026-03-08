'use client';

import { Globe, CheckCircle2, AlertTriangle, PencilLine, BarChart3 } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function WebsitesPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleWebsites')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'websiteSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['aikitz.at', 'labs.aikitz.at', 'portal.aikitz.at'].map(site => (
          <div key={site} className="panel p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Globe size={14} /> {site}</div>
            <div className="text-xs text-muted-foreground">Status: <span className="text-success">Healthy</span></div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm"><PencilLine size={14} /> Edit</button>
              <button className="btn btn-ghost btn-sm"><BarChart3 size={14} /> Insights</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-sm font-medium">Publishing Pipeline</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-success" />
            <div>
              <div className="text-sm font-medium">Content sync</div>
              <div className="text-[11px] text-muted-foreground">Last deploy 14m ago</div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-warning" />
            <div>
              <div className="text-sm font-medium">Form tracking</div>
              <div className="text-[11px] text-muted-foreground">2 forms need review</div>
            </div>
          </div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-sm font-medium">SEO & Performance</div>
          <div className="text-xs text-muted-foreground">Core Web Vitals: 98</div>
          <div className="text-xs text-muted-foreground">Avg load time: 1.2s</div>
          <div className="text-xs text-muted-foreground">Indexed pages: 182</div>
        </div>
      </div>
    </div>
  );
}
