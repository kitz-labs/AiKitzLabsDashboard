'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gauge, PenLine, MessageCircle, Mail,
  FlaskConical, Search, BarChart3, List,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: Gauge },
  { href: '/content', label: 'Content', icon: PenLine },
  { href: '/engagement', label: 'Engage', icon: MessageCircle },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/experiments', label: 'Experiments', icon: FlaskConical },
  { href: '/research', label: 'Research', icon: Search },
  { href: '/kpis', label: 'KPIs', icon: BarChart3 },
  { href: '/activity', label: 'Activity', icon: List },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 h-16 glass-strong flex items-center justify-around z-50 border-t border-border">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 ${
              active ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
