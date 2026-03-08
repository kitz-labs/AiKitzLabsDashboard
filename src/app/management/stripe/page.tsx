'use client';

import { CreditCard, ShieldCheck, Receipt, Wallet } from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

export default function StripePage() {
  const { language } = useDashboard();

  return (
    <div className="space-y-6 animate-in">
      <div className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-semibold">{t(language, 'titleStripe')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'stripeSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">MRR</div>
          <div className="text-sm font-medium">€84,200</div>
          <div className="text-[11px] text-muted-foreground">+12% this month</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Active Subscriptions</div>
          <div className="text-sm font-medium">326</div>
          <div className="text-[11px] text-muted-foreground">Churn 1.4%</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Payouts</div>
          <div className="text-sm font-medium">€24,600</div>
          <div className="text-[11px] text-muted-foreground">Next payout: Friday</div>
        </div>
        <div className="panel p-4 space-y-2">
          <div className="text-xs text-muted-foreground">Disputes</div>
          <div className="text-sm font-medium">1 open</div>
          <div className="text-[11px] text-muted-foreground">Risk low</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Billing Operations</div>
          <div className="space-y-2">
            {['Enterprise Plan', 'Growth Plan', 'Starter Plan'].map(plan => (
              <div key={plan} className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
                <Wallet size={16} className="text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{plan}</div>
                  <div className="text-[11px] text-muted-foreground">ARPA €620 · 96% paid</div>
                </div>
                <button className="btn btn-ghost btn-sm">Manage</button>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-medium">Risk & Compliance</div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <ShieldCheck size={16} className="text-success" />
            <div>
              <div className="text-sm font-medium">PCI compliance</div>
              <div className="text-[11px] text-muted-foreground">Verified</div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <Receipt size={16} className="text-warning" />
            <div>
              <div className="text-sm font-medium">Invoice automation</div>
              <div className="text-[11px] text-muted-foreground">3 workflows pending review</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm"><CreditCard size={14} /> Open Stripe</button>
        </div>
      </div>
    </div>
  );
}
