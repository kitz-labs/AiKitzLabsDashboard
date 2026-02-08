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

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="nav-rail fixed left-0 top-[var(--header-height)] bottom-0 w-[var(--nav-width)] glass-strong flex flex-col items-center py-4 gap-1 z-40">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item w-14 ${active ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
