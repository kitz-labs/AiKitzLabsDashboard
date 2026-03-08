'use client';

import { BarChart3, Calendar } from 'lucide-react';
import Image from 'next/image';
import { InstagramIcon } from '@/components/ui/platform-icons';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function InstagramPage() {
  const { language } = useDashboard();
  const gallery = [
    '/instagram/01.png',
    '/instagram/02.png',
    '/instagram/03.png',
    '/instagram/04.png',
    '/instagram/05.png',
    '/instagram/06.png',
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold flex items-center gap-2"><InstagramIcon size={18} className="text-pink-500" /> {t(language, 'titleInstagram')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'websiteSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'instagramAccount')}</div>
          <div className="text-sm font-medium">@aikitzlabs</div>
          <div className="text-[11px] text-muted-foreground">Followers +4.2% this week</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'instagramContent')}</div>
          <div className="text-sm font-medium">18 scheduled</div>
          <div className="text-[11px] text-muted-foreground">Stories queued: 7</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">{t(language, 'instagramEngagement')}</div>
          <div className="text-sm font-medium">6.8%</div>
          <div className="text-[11px] text-muted-foreground">Top post: 2.4k likes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">{t(language, 'instagramPublishingCalendar')}</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <Calendar size={16} className="text-primary" />
            <div>
              <div className="text-sm font-medium">{t(language, 'instagramNextDrop')}</div>
              <div className="text-[11px] text-muted-foreground">{t(language, 'instagramTomorrow')}</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm">{t(language, 'instagramSchedulePost')}</button>
        </div>
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">{t(language, 'instagramCreativeLibrary')}</div>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((src, i) => (
              <div key={src} className="aspect-square rounded-lg bg-muted/40 overflow-hidden">
                <Image
                  src={src}
                  alt={`Instagram ${i + 1}`}
                  width={240}
                  height={240}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm"><BarChart3 size={14} /> {t(language, 'instagramInsights')}</button>
        </div>
      </div>
    </div>
  );
}
