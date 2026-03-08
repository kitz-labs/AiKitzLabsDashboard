'use client';

import { useEffect } from 'react';
import { useDashboard } from '@/store';
import { LiveFeed } from '@/components/live-feed';
import { t } from '@/lib/i18n';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { feedOpen, toggleFeed, language } = useDashboard();

  // Cmd+. to toggle feed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggleFeed();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFeed]);

  return (
    <>
      <main className={`main-content surface-0 flex-1 ml-[var(--nav-width)] mt-[var(--header-height)] p-3 sm:p-5 pb-28 sm:pb-24 overflow-auto transition-[margin] duration-300 ${
        feedOpen ? 'lg:mr-80' : ''
      }`}>
        {children}
      </main>
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border/50 bg-background/85 px-4 py-1.5 text-center text-[11px] text-muted-foreground shadow-lg backdrop-blur">
        {t(language, 'footerCredit')}
      </div>
      <LiveFeed open={feedOpen} onClose={toggleFeed} />
    </>
  );
}
