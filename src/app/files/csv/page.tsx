'use client';

import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function FilesCsvPage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleFilesCsv')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'filesCsvSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5 space-y-3">
          <div className="text-sm font-medium">Upload</div>
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center space-y-2">
            <UploadCloud size={20} className="mx-auto text-muted-foreground" />
            <div className="text-sm">Drop CSV files here</div>
            <div className="text-[11px] text-muted-foreground">Max 250MB · UTF-8</div>
            <button className="btn btn-primary btn-sm">Select files</button>
          </div>
        </div>
        <div className="panel p-5 space-y-3">
          <div className="text-sm font-medium">Validation</div>
          <div className="space-y-2">
            <div className="rounded-xl border border-border/50 p-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              <div className="text-sm">Schema checks passed</div>
            </div>
            <div className="rounded-xl border border-border/50 p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              <div className="text-sm">2 rows need review</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3">
        <div className="text-sm font-medium">Recent Imports</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['leads_march.csv', 'content_queue.csv', 'finance_q1.csv'].map(file => (
            <div key={file} className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <FileSpreadsheet size={16} className="text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file}</div>
                <div className="text-[11px] text-muted-foreground">Imported · 2m ago</div>
              </div>
              <button className="btn btn-ghost btn-sm">Open</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
