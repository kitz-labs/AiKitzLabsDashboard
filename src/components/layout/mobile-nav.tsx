'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gauge, PenLine, MessageCircle, Mail,
  FlaskConical, Search, BarChart3, List,
  MoreHorizontal,
} from 'lucide-react';

const PRIMARY_ITEMS = [
  { href: '/', label: 'Overview', icon: Gauge },
  { href: '/content', label: 'Content', icon: PenLine },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/kpis', label: 'KPIs', icon: BarChart3 },
];

const MORE_ITEMS = [
  { href: '/engagement', label: 'Engagement', icon: MessageCircle },
  { href: '/experiments', label: 'Experiments', icon: FlaskConical },
  { href: '/research', label: 'Research', icon: Search },
  { href: '/activity', label: 'Activity', icon: List },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Close menu on navigation
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const moreActive = MORE_ITEMS.some(item => isActive(item.href));

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 glass-strong z-50 border-t border-border">
      <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
              moreOpen || moreActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>

          {/* More menu — expands upward */}
          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-48 py-1 rounded-xl glass-strong border border-border shadow-lg animate-in">
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      active
                        ? 'text-primary bg-primary/10'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
