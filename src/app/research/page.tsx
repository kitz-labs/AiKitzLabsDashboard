'use client';

import { useEffect, useState } from 'react';
import { SignalCard } from '@/components/ui/signal-card';
import { useDashboard } from '@/store';
import type { Signal } from '@/types';
import { t } from '@/lib/i18n';

const SIGNAL_TYPES: { key: string; labelKey: Parameters<typeof t>[1] }[] = [
  { key: '', labelKey: 'signalAll' },
  { key: 'pain', labelKey: 'signalPain' },
  { key: 'hiring', labelKey: 'signalHiring' },
  { key: 'launch', labelKey: 'signalLaunch' },
  { key: 'competitor', labelKey: 'signalCompetitor' },
  { key: 'brand_mention', labelKey: 'signalBrandMention' },
  { key: 'opportunity', labelKey: 'signalOpportunity' },
];

export default function ResearchPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [relevanceFilter, setRelevanceFilter] = useState('');
  const { realOnly, language } = useDashboard();

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (relevanceFilter) params.set('relevance', relevanceFilter);
    if (realOnly) params.set('real', 'true');
    const q = params.toString();
    fetch(`/api/signals${q ? '?' + q : ''}`).then(r => r.json()).then(setSignals).catch(() => {});
  }, [typeFilter, relevanceFilter, realOnly]);

  const todaySignals = signals.filter(s => s.date === new Date().toISOString().slice(0, 10));
  const otherSignals = signals.filter(s => s.date !== new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-semibold">{t(language, 'titleResearch')}</h1>
          <div className="flex gap-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              {SIGNAL_TYPES.map(type => (
                <option key={type.key} value={type.key}>{t(language, type.labelKey)}</option>
              ))}
            </select>
            <select
              value={relevanceFilter}
              onChange={e => setRelevanceFilter(e.target.value)}
            >
              <option value="">{t(language, 'signalRelevanceAll')}</option>
              <option value="high">{t(language, 'signalRelevanceHigh')}</option>
              <option value="medium">{t(language, 'signalRelevanceMedium')}</option>
              <option value="low">{t(language, 'signalRelevanceLow')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Today's signals */}
      {todaySignals.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="section-title">Today&apos;s Signals ({todaySignals.length})</h2>
          </div>
          <div className="panel-body space-y-3">
            {todaySignals.map(s => <SignalCard key={s.id} signal={s} />)}
          </div>
        </section>
      )}

      {/* Earlier signals */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="section-title">
            {todaySignals.length > 0 ? 'Earlier' : 'All Signals'} ({otherSignals.length})
          </h2>
        </div>
        <div className="panel-body space-y-3">
          {otherSignals.length === 0 && todaySignals.length === 0 ? (
            <div className="panel p-8 text-center text-muted-foreground text-sm">
              No research signals yet
            </div>
          ) : (
            otherSignals.map(s => <SignalCard key={s.id} signal={s} />)
          )}
        </div>
      </section>
    </div>
  );
}
