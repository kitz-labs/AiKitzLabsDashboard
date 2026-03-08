'use client';

import {
  Activity, Search, Sun, Moon, Radio, PenLine, Mail, Users, LogOut,
  Bell, Eye, EyeOff, Check, CheckCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';
import { useSmartPoll } from '@/hooks/use-smart-poll';
import { timeAgo } from '@/lib/utils';
import type { Notification } from '@/types';

interface HeaderStats {
  posts_today: number;
  emails_sent: number;
  pipeline_count: number;
}

export function HeaderBar() {
  const { feedOpen, toggleFeed, realOnly, toggleRealOnly, language } = useDashboard();
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();

  // Lightweight poll for header stats
  const { data: stats } = useSmartPoll<HeaderStats>(
    () => fetch(`/api/overview${realOnly ? '?real=true' : ''}`).then(r => r.json()).then(d => d.stats),
    { interval: 60_000, key: realOnly },
  );

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUsername(data?.user?.username || null))
      .catch(() => setUsername(null));
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[var(--header-height)] items-center justify-between border-b border-border/55 bg-card/78 px-3 backdrop-blur-xl sm:px-4 md:left-[var(--nav-width)] md:border-b-0 md:bg-transparent md:px-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/45 bg-background/70 px-3 py-2 shadow-[0_10px_28px_rgba(3,8,20,0.10)] md:min-w-[220px]">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary/8 md:hidden">
            <Image src="/ai-kitz-labs-logo.svg" alt="AI Kitz Labs" width={24} height={24} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground/75">Workspace</div>
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">{formatPathLabel(pathname, language)}</div>
          </div>
          {username && <span className="hidden rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">@{username}</span>}
        </div>

        {stats && (
          <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-border/45 bg-background/60 px-3 py-2 shadow-[0_10px_28px_rgba(3,8,20,0.08)]">
            <QuickStat icon={PenLine} value={stats.posts_today} label={t(language, 'labelPosts')} />
            <QuickStat icon={Mail} value={stats.emails_sent} label={t(language, 'labelSent')} />
            <QuickStat icon={Users} value={stats.pipeline_count} label={t(language, 'labelPipeline')} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border/45 bg-background/72 px-2 py-2 shadow-[0_10px_28px_rgba(3,8,20,0.10)] sm:gap-3">
        <SeedToggle active={realOnly} onToggle={toggleRealOnly} language={language} />
        <SearchTrigger language={language} />
        <NotificationBell language={language} />
        <ThemeToggle />
        <FeedToggle open={feedOpen} onToggle={toggleFeed} />
        <SyncStatus />
        <LogoutButton />
      </div>
    </header>
  );
}

function formatPathLabel(pathname: string, language: 'en' | 'de') {
  if (pathname === '/') {
    return language === 'de' ? 'Overview' : 'Overview';
  }

  return pathname
    .split('/')
    .filter(Boolean)
    .slice(-2)
    .map((segment) => segment.replace(/[-_]/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' · ');
}

function QuickStat({ icon: Icon, value, label }: { icon: typeof PenLine; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon size={11} />
      <span className="font-mono font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function SeedToggle({ active, onToggle, language }: { active: boolean; onToggle: () => void; language: 'en' | 'de' }) {
  return (
    <button
      className={`h-7 flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
        active
          ? 'bg-success/15 text-success border border-success/30'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30'
      }`}
      onClick={onToggle}
      title={active ? t(language, 'titleRealOnly') : t(language, 'titleAllData')}
    >
      {active ? <Eye size={13} /> : <EyeOff size={13} />}
      <span className="hidden sm:inline">{active ? t(language, 'real') : t(language, 'all')}</span>
    </button>
  );
}

function NotificationBell({ language }: { language: 'en' | 'de' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const realOnly = useDashboard(s => s.realOnly);

  const { data: notifications, refetch } = useSmartPoll<Notification[]>(
    () => fetch(`/api/notifications?limit=20${realOnly ? '&real=true' : ''}`).then(r => r.json()),
    { interval: 30_000, key: realOnly },
  );

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function markRead(id: number) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    refetch();
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    });
    refetch();
  }

  const SEVERITY_COLORS = {
    info: 'text-primary',
    warning: 'text-warning',
    error: 'text-destructive',
  };

  return (
    <div className="relative" ref={ref}>
      <button
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors relative ${
        open ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      }`}
        onClick={() => setOpen(!open)}
        title={t(language, 'notifications')}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold rounded-full count-badge flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 card border shadow-lg max-h-96 overflow-hidden flex flex-col animate-slide-in z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
            <span className="text-sm font-medium">{t(language, 'notifications')}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <CheckCheck size={12} /> {t(language, 'markAllRead')}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {(!notifications || notifications.length === 0) ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                {t(language, 'noNotifications')}
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border/20 hover:bg-muted/30 transition-colors ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 ${SEVERITY_COLORS[n.severity] || 'text-muted-foreground'}`}>
                      <Bell size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.title && (
                        <div className="text-xs font-medium truncate">{n.title}</div>
                      )}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Check size={10} /> {t(language, 'read')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchTrigger({ language }: { language: 'en' | 'de' }) {
  return (
    <button
      className="hidden md:flex items-center gap-2 h-7 px-3 rounded-md bg-muted/55 hover:bg-muted border border-border/30 text-xs text-muted-foreground transition-colors"
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
    >
      <Search size={13} />
      <span className="hidden sm:inline">{t(language, 'search')}</span>
      <kbd className="hidden sm:inline text-[10px] bg-muted px-1 py-0.5 rounded ml-1">⌘K</kbd>
    </button>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const currentTheme = theme === 'dark' ? 'dark' : 'light';

  return (
    <button
      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {currentTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function FeedToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        open
          ? 'bg-primary/15 text-primary'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      }`}
      onClick={onToggle}
      title="Toggle live feed"
    >
      <Radio size={16} />
    </button>
  );
}

function SyncStatus() {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-success pulse-dot" />
      <Activity size={12} />
      <span className="font-mono">{lastSync}</span>
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
      onClick={handleLogout}
      disabled={loading}
      title="Sign out"
    >
      <LogOut size={15} />
    </button>
  );
}
