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
    <nav className="nav-rail fixed left-0 top-[var(--header-height)] bottom-0 w-[var(--nav-width)] bg-card/92 backdrop-blur-lg border-r border-border/70 z-40 hidden md:flex flex-col">
      <div className="px-3 py-3 border-b border-border/60 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-card border border-border/60 flex items-center justify-center overflow-hidden">
          <Image src="/ai-kitz-labs-logo.svg" alt="AI Kitz Labs" width={32} height={32} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-none">{t(language, 'brandName')}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{username || t(language, 'missionView')}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group, idx) => {
          const groupActive = group.items.some(item => isActive(pathname, item.href));
          return (
          <div
            key={group.label}
            className={`group ${idx > 0 ? 'mt-3 pt-3 border-t border-border/50' : ''}`}
          >
            <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {group.label}
            </div>
            <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
              groupActive
                ? 'max-h-96 opacity-100'
                : 'max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100'
            }`}>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.countKey && counts ? counts[item.countKey] : 0;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-smooth ${
                      active
                        ? 'bg-primary/14 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/80'
                    }`}
                  >
                    {active && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r" />}
                    <Icon size={16} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span className={`min-w-[18px] h-4 px-1 text-[9px] font-bold rounded-full flex items-center justify-center ${
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

      <div className="px-2 py-2 border-t border-border/60 flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Link
            href="/github"
            className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-smooth ${
              pathname.startsWith('/github')
                ? 'bg-primary/14 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/80'
            }`}
          >
            {pathname.startsWith('/github') && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r" />}
            <Github size={16} />
            <span>{t(language, 'navGithub')}</span>
          </Link>
          <Link
            href="/coding"
            className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-smooth ${
              pathname.startsWith('/coding')
                ? 'bg-primary/14 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/80'
            }`}
          >
            {pathname.startsWith('/coding') && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r" />}
            <Code2 size={16} />
            <span>{t(language, 'navCoding')}</span>
          </Link>
          <Link
            href="/settings"
            className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-smooth ${
              pathname === '/settings'
                ? 'bg-primary/14 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/80'
            }`}
          >
            {pathname === '/settings' && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r" />}
            <Settings size={16} />
            <span>{t(language, 'navSettings')}</span>
          </Link>
        </div>
        <button
          className="h-8 px-2 rounded-lg border border-border/50 bg-muted/40 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          onClick={toggleLanguage}
          title={t(language, 'language')}
        >
          {language.toUpperCase()}
        </button>
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
