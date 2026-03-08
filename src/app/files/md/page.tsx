'use client';

import { FileText, PenLine, Sparkles } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function FilesMdPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleFilesMd')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'filesMdSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['Launch_notes.md', 'Campaign_brief.md', 'Roadmap.md'].map(doc => (
          <div key={doc} className="panel p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium"><FileText size={14} /> {doc}</div>
            <div className="text-[11px] text-muted-foreground">Last edited 2h ago</div>
            <div className="flex items-center gap-2">
              <button className="btn btn-primary btn-sm"><PenLine size={14} /> Edit</button>
              <button className="btn btn-ghost btn-sm"><Sparkles size={14} /> Summarize</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
