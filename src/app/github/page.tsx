'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, GitBranch, Github, LoaderCircle, Rocket, Send, ShieldCheck, Workflow } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

type GitRemoteInfo = {
  name: string;
  fetchUrl: string;
  pushUrl: string;
};

type GitStatusResponse = {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  changedFiles: string[];
  remotes: GitRemoteInfo[];
};

export default function GithubPage() {
  const { language } = useDashboard();
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [busy, setBusy] = useState<'load' | 'push' | null>('load');
  const [selectedRemote, setSelectedRemote] = useState('kitz');

  const primaryRemote = useMemo(
    () => status?.remotes.find((remote) => remote.name === selectedRemote) || status?.remotes[0] || null,
    [selectedRemote, status?.remotes],
  );

  const repoUrl = primaryRemote?.pushUrl?.replace(/\.git$/, '') || 'https://github.com/kitz-labs/AiKitzLabsDashboard';

  async function loadStatus() {
    setBusy('load');
    try {
      const response = await fetch('/api/github/status', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load Git status');
      setStatus(data);
      if (Array.isArray(data.remotes) && data.remotes.length > 0) {
        setSelectedRemote((current) => data.remotes.some((remote: GitRemoteInfo) => remote.name === current) ? current : data.remotes[0].name);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pushRemote() {
    if (!status) return;
    setBusy('push');
    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remote: selectedRemote, branch: status.branch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Push failed');
      toast.success('Git push completed');
      await loadStatus();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const links = [
    { href: repoUrl, label: t(language, 'githubOpenRepo') },
    { href: `${repoUrl}/issues`, label: t(language, 'githubOpenIssues') },
    { href: `${repoUrl}/actions`, label: t(language, 'githubOpenActions') },
    { href: `${repoUrl}/pulls`, label: t(language, 'githubOpenPulls') },
  ];

  return (
    <div className="space-y-6 animate-in">
      <section className="panel p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Github size={22} className="text-primary" /> {t(language, 'titleGithub')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{t(language, 'githubSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button className="btn btn-ghost btn-sm" onClick={() => void loadStatus()} disabled={busy === 'load'}>
              {busy === 'load' ? <LoaderCircle size={14} className="animate-spin" /> : <GitBranch size={14} />} {t(language, 'mailLastSyncAt')}
            </button>
            {links.map((link) => (
              <Link key={link.href} href={link.href} target="_blank" className="btn btn-primary btn-sm">
                <ExternalLink size={14} /> {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Github} label={t(language, 'githubRepository')} value={primaryRemote?.name || 'kitz'} />
          <StatCard icon={GitBranch} label={t(language, 'githubBranch')} value={status?.branch || 'main'} />
          <StatCard icon={ShieldCheck} label={t(language, 'githubProtection')} value={t(language, 'githubProtectionValue')} />
          <StatCard icon={Rocket} label={t(language, 'githubDeployTarget')} value={status?.upstream || 'GitHub'} />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="panel p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Workflow size={16} className="text-primary" /> {t(language, 'githubReadyWorkflows')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{t(language, 'githubReadyWorkflowsHint')}</p>
          </div>
          <div className="space-y-3">
            {[
              t(language, 'githubWorkflowCoding'),
              t(language, 'githubWorkflowMail'),
              t(language, 'githubWorkflowDeploy'),
              t(language, 'githubWorkflowReview'),
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border/40 bg-muted/10 p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Rocket size={16} className="text-primary" /> {t(language, 'githubDeployChecklist')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{t(language, 'githubDeployChecklistHint')}</p>
          </div>
          <div className="space-y-2">
            {[
              t(language, 'githubChecklistLint'),
              t(language, 'githubChecklistTests'),
              t(language, 'githubChecklistEnv'),
              t(language, 'githubChecklistPush'),
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 bg-background/70 text-sm">
                <ShieldCheck size={14} className="text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-4">
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Github size={16} className="text-primary" /> {t(language, 'githubRepository')} / Remotes</h2>
              <p className="text-xs text-muted-foreground mt-1">All configured Git repositories for this workspace are listed here.</p>
            </div>
            {status && (
              <div className="text-xs text-muted-foreground">
                {status.changedFiles.length} changed · ↑{status.ahead} ↓{status.behind}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {(status?.remotes || []).map((remote) => (
              <button
                key={remote.name}
                type="button"
                onClick={() => setSelectedRemote(remote.name)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedRemote === remote.name ? 'border-primary/40 bg-primary/10' : 'border-border/40 bg-muted/10 hover:bg-muted/20'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{remote.name}</div>
                  <Github size={14} className="text-primary" />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground break-all">fetch: {remote.fetchUrl}</div>
                <div className="mt-1 text-[11px] text-muted-foreground break-all">push: {remote.pushUrl}</div>
              </button>
            ))}
            {status && status.remotes.length === 0 && (
              <div className="rounded-xl border border-border/40 bg-muted/10 p-4 text-sm text-muted-foreground">No remotes configured.</div>
            )}
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Send size={16} className="text-primary" /> Push</h2>
            <p className="text-xs text-muted-foreground mt-1">Push the current branch to the selected GitHub remote when local commits are ready.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Remote</div>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={selectedRemote}
                onChange={(event) => setSelectedRemote(event.target.value)}
              >
                {(status?.remotes || []).map((remote) => (
                  <option key={remote.name} value={remote.name}>{remote.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                <div className="text-xs text-muted-foreground">Branch</div>
                <div className="mt-1 font-medium">{status?.branch || 'main'}</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                <div className="text-xs text-muted-foreground">Upstream</div>
                <div className="mt-1 font-medium break-all">{status?.upstream || '—'}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              git push {selectedRemote} {status?.branch || 'main'}:{status?.branch || 'main'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => void pushRemote()} disabled={!status || busy === 'push' || status.remotes.length === 0}>
              {busy === 'push' ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} Push to GitHub
            </button>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Changed files</div>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {(status?.changedFiles || []).slice(0, 20).map((file) => (
                <div key={file} className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs">{file}</div>
              ))}
              {status && status.changedFiles.length === 0 && (
                <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">Working tree clean.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon size={14} className="text-primary" />
      </div>
      <div className="text-sm font-semibold mt-2 break-all">{value}</div>
    </div>
  );
}
