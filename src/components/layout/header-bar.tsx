'use client';

import { Activity } from 'lucide-react';

export function HeaderBar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--header-height)] glass-strong flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">H</span>
        </div>
        <span className="font-semibold text-sm tracking-tight">Hermes Dashboard</span>
        <span className="text-muted-foreground text-xs hidden sm:inline">Marketing Engine</span>
      </div>
      <div className="flex items-center gap-4">
        <SyncStatus />
      </div>
    </header>
  );
}

function SyncStatus() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-success pulse-dot" />
      <Activity size={14} />
      <span className="hidden sm:inline">Syncing</span>
    </div>
  );
}
