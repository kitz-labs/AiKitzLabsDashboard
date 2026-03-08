'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Gauge, Bot, PenLine, MessageCircle, Mail, Contact, Zap,
  Search, BarChart3, LineChart, BrainCircuit, Rocket, Clock, List, Settings,
  FolderOpen, Box, Wallet, Code2, Github,
} from 'lucide-react';
import { useSmartPoll } from '@/hooks/use-smart-poll';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

interface NavCounts {
  content: number;
  outreach: number;
  signals_today: number;
  new_leads: number;
  total_pending: number;
}

type CountKey = keyof NavCounts;

interface NavItem {
  href: string;
  label: string;
  icon: typeof Gauge;
  countKey?: CountKey;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const getNavGroups = (language: 'en' | 'de'): NavGroup[] => [
  {
    label: t(language, 'navCore'),
    items: [
      { href: '/', label: t(language, 'navOverview'), icon: Gauge },
      { href: '/agents/squads', label: t(language, 'navSquads'), icon: Bot },
      { href: '/agents/comms', label: t(language, 'navComms'), icon: MessageCircle },
      { href: '/agents/workspace', label: t(language, 'navWorkspace'), icon: FolderOpen },
    ],
  },
  {
    label: t(language, 'navOperate'),
    items: [
      { href: '/content', label: t(language, 'navContent'), icon: PenLine, countKey: 'content' },
      { href: '/engagement', label: t(language, 'navEngagement'), icon: MessageCircle },
      { href: '/outreach', label: t(language, 'navOutreach'), icon: Mail, countKey: 'outreach' },
      { href: '/crm', label: t(language, 'navCRM'), icon: Contact, countKey: 'new_leads' },
      { href: '/automations', label: t(language, 'navAutomations'), icon: Zap, countKey: 'outreach' },
    ],
  },
  {
    label: t(language, 'navObserve'),
    items: [
      { href: '/research', label: t(language, 'navResearch'), icon: Search, countKey: 'signals_today' },
      { href: '/kpis', label: t(language, 'navKPIs'), icon: BarChart3 },
      { href: '/analytics', label: t(language, 'navAnalytics'), icon: LineChart },
      { href: '/memory', label: t(language, 'navMemory'), icon: BrainCircuit },
      { href: '/deploy', label: t(language, 'navDeploy'), icon: Rocket },
      { href: '/cron', label: t(language, 'navCron'), icon: Clock },
      { href: '/activity', label: t(language, 'navActivity'), icon: List },
    ],
  },
  {
    label: t(language, 'navManagement'),
    items: [
      { href: '/management/kunden', label: t(language, 'navCustomers'), icon: Contact },
      { href: '/management/produkte', label: t(language, 'navProducts'), icon: Box },
      { href: '/management/finanzen', label: t(language, 'navFinance'), icon: Wallet },
      { href: '/management/stripe', label: t(language, 'navStripe'), icon: Wallet },
    ],
  },
  {
    label: t(language, 'navMessenger'),
    items: [
      { href: '/messenger/mail', label: t(language, 'navMail'), icon: Mail },
      { href: '/messenger/whatsapp', label: t(language, 'navWhatsapp'), icon: MessageCircle },
      { href: '/messenger/telegram', label: t(language, 'navTelegram'), icon: MessageCircle },
    ],
  },
  {
    label: t(language, 'navWebsite'),
    items: [
      { href: '/webseite/webseiten', label: t(language, 'navWebsites'), icon: FolderOpen },
      { href: '/webseite/instagram', label: t(language, 'navInstagram'), icon: MessageCircle },
      { href: '/webseite/facebook', label: t(language, 'navFacebook'), icon: MessageCircle },
      { href: '/webseite/linkedin', label: t(language, 'navLinkedIn'), icon: MessageCircle },
    ],
  },
  {
    label: t(language, 'navFiles'),
    items: [
      { href: '/files/csv', label: t(language, 'navCsv'), icon: List },
      { href: '/files/md', label: t(language, 'navMd'), icon: List },
    ],
  },
];

export function NavRail() {
  const pathname = usePathname();
  const realOnly = useDashboard(s => s.realOnly);
  const language = useDashboard(s => s.language);
  const toggleLanguage = useDashboard(s => s.toggleLanguage);
  const [username, setUsername] = useState<string | null>(null);
  const navGroups = getNavGroups(language);

  const { data: counts } = useSmartPoll<NavCounts>(
    () => fetch(`/api/counts${realOnly ? '?real=true' : ''}`).then(r => r.json()),
    { interval: 30_000, key: realOnly },
  );

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUsername(data?.user?.username || null))
      .catch(() => setUsername(null));
  }, []);

  return (
    <nav className="nav-rail fixed left-0 top-0 bottom-0 z-40 hidden w-[var(--nav-width)] md:flex flex-col border-r border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_96%,transparent),color-mix(in_srgb,var(--surface-1)_92%,transparent))] backdrop-blur-xl">
      <div className="px-4 pt-4 pb-3">
        <div className="rounded-[22px] border border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_98%,transparent),color-mix(in_srgb,var(--surface-1)_90%,transparent))] px-3 py-3 shadow-[0_16px_34px_rgba(3,8,20,0.14)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Image src="/ai-kitz-labs-logo.svg" alt="AI Kitz Labs" width={34} height={34} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight text-foreground">{t(language, 'brandName')}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.45)]" />
                {username ? `@${username}` : t(language, 'missionView')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {navGroups.map((group, idx) => {
          return (
          <div
            key={group.label}
            className={`${idx > 0 ? 'mt-4 pt-4 border-t border-border/35' : ''}`}
          >
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.countKey && counts ? counts[item.countKey] : 0;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group/nav relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-smooth ${
                      active
                        ? 'bg-primary/[0.14] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_26px_rgba(45,120,255,0.12)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                    }`}
                  >
                    {active && <span className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary/80 shadow-[0_0_12px_rgba(45,120,255,0.45)]" />}
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-smooth ${active ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border/45 bg-background/40 text-muted-foreground group-hover/nav:border-border/70 group-hover/nav:bg-background/65 group-hover/nav:text-foreground'}`}>
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span className={`flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold ${
                        item.countKey === 'signals_today' ? 'count-badge-info' : 'count-badge'
                      }`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
        })}
      </div>

      <div className="border-t border-border/45 px-3 py-3">
        <div className="rounded-[22px] border border-border/55 bg-background/45 p-2 shadow-[0_10px_24px_rgba(3,8,20,0.08)]">
        <div className="flex-1 space-y-1">
          <Link
            href="/github"
            className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-smooth ${
              pathname.startsWith('/github')
                ? 'bg-primary/[0.14] text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
            }`}
          >
            {pathname.startsWith('/github') && <span className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary/80" />}
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/45 bg-background/50"><Github size={16} /></span>
            <span>{t(language, 'navGithub')}</span>
          </Link>
          <Link
            href="/coding"
            className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-smooth ${
              pathname.startsWith('/coding')
                ? 'bg-primary/[0.14] text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
            }`}
          >
            {pathname.startsWith('/coding') && <span className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary/80" />}
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/45 bg-background/50"><Code2 size={16} /></span>
            <span>{t(language, 'navCoding')}</span>
          </Link>
          <Link
            href="/settings"
            className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-smooth ${
              pathname === '/settings'
                ? 'bg-primary/[0.14] text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
            }`}
          >
            {pathname === '/settings' && <span className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary/80" />}
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/45 bg-background/50"><Settings size={16} /></span>
            <span>{t(language, 'navSettings')}</span>
          </Link>
        </div>
        <button
          className="mt-2 h-10 w-full rounded-2xl border border-border/50 bg-muted/35 text-[11px] font-mono text-muted-foreground transition-smooth hover:bg-muted/45 hover:text-foreground"
          onClick={toggleLanguage}
          title={t(language, 'language')}
        >
          {language.toUpperCase()}
        </button>
        </div>
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
