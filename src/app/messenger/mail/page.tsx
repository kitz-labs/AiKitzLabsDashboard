'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Clock,
  Inbox,
  LoaderCircle,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  ShieldCheck,
  Star,
  Tag,
  Trash,
  Trash2,
} from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

type MailFolder = {
  id: string;
  name: string;
  systemKey: string | null;
  color: string | null;
  threadCount: number;
  updatedAt: string;
};

type MailThread = {
  id: string;
  folderId: string;
  mailbox: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  body: string;
  tags: string[];
  unread: boolean;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
};

const SYSTEM_ICONS = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: Mail,
  archive: Archive,
  spam: Trash2,
  trash: Trash,
} as const;

function folderLabel(language: 'en' | 'de', folder: MailFolder) {
  if (folder.systemKey === 'inbox') return t(language, 'mailInbox');
  if (folder.systemKey === 'starred') return t(language, 'mailStarred');
  if (folder.systemKey === 'snoozed') return t(language, 'mailSnoozed');
  if (folder.systemKey === 'sent') return t(language, 'mailSent');
  if (folder.systemKey === 'drafts') return t(language, 'mailDrafts');
  if (folder.systemKey === 'archive') return t(language, 'mailArchive');
  if (folder.systemKey === 'spam') return t(language, 'mailSpam');
  if (folder.systemKey === 'trash') return t(language, 'mailTrash');
  return folder.name;
}

export default function MailPage() {
  const { language } = useDashboard();
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [composeOpen, setComposeOpen] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState({
    toEmail: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    mailbox: 'ceo@aikitz.at',
  });

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || threads[0] || null,
    [activeThreadId, threads],
  );

  async function loadMailState(folderId?: string, searchValue?: string) {
    setBusy('sync');
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('folderId', folderId);
      if (typeof searchValue === 'string' && searchValue.trim()) params.set('q', searchValue.trim());
      const response = await fetch(`/api/mail/bootstrap${params.toString() ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load mail state');

      const nextFolders = Array.isArray(data.folders) ? data.folders as MailFolder[] : [];
      const nextThreads = Array.isArray(data.threads) ? data.threads as MailThread[] : [];
      setFolders(nextFolders);
      setThreads(nextThreads);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setLastSyncAt(typeof data.lastSyncAt === 'string' ? data.lastSyncAt : new Date().toISOString());
      setActiveFolderId((current) => current || nextFolders[0]?.id || null);
      setActiveThreadId((current) => current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0]?.id || null);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void loadMailState();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!activeFolderId) return;
      void loadMailState(activeFolderId, query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeFolderId, query]);

  async function createFolder() {
    if (!folderDraft.trim()) return;
    setBusy('folder');
    try {
      const response = await fetch('/api/mail/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create folder');
      setFolderDraft('');
      await loadMailState(data.folder?.id || activeFolderId || undefined, query);
      if (data.folder?.id) setActiveFolderId(data.folder.id);
    } finally {
      setBusy(null);
    }
  }

  async function updateThread(action: 'archive' | 'trash' | 'toggle-star' | 'mark-read' | 'move', targetFolderId?: string) {
    if (!activeThread) return;
    setBusy(`thread-${action}`);
    try {
      const response = await fetch('/api/mail/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeThread.id, action, targetFolderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update thread');
      await loadMailState(activeFolderId || undefined, query);
      setActiveThreadId(data.thread?.id || null);
    } finally {
      setBusy(null);
    }
  }

  async function sendMail() {
    setBusy('send');
    try {
      const response = await fetch('/api/mail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeDraft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send mail');
      setComposeDraft({
        toEmail: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        mailbox: composeDraft.mailbox,
      });
      setComposeOpen(false);
      await loadMailState(activeFolderId || undefined, query);
      setActiveThreadId(data.thread?.id || null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="panel">
        <div className="panel-header flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{t(language, 'titleMail')}</h1>
            <p className="text-sm text-muted-foreground">{t(language, 'mailProTitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => setComposeOpen((current) => !current)}>
              <Plus size={14} /> {composeOpen ? t(language, 'mailCloseComposer') : t(language, 'mailOpenComposer')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => void loadMailState(activeFolderId || undefined, query)}>
              {busy === 'sync' ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t(language, 'mailSync')}
            </button>
          </div>
        </div>
        <div className="panel-body pt-0 space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2"><ShieldCheck size={14} className="text-success" /> {t(language, 'mailLiveWorkspace')}</div>
              <div className="text-xs text-muted-foreground mt-1">{t(language, 'mailLiveWorkspaceHint')}</div>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>{t(language, 'mailAccountsLive')}: {accounts.join(', ') || '—'}</span>
              <span>{t(language, 'mailLastSyncAt')}: {lastSyncAt ? timeAgo(lastSyncAt) : '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn btn-ghost btn-xs"><Reply size={12} /> {t(language, 'mailReply')}</button>
            <button className="btn btn-ghost btn-xs"><ReplyAll size={12} /> {t(language, 'mailReplyAll')}</button>
            <button className="btn btn-ghost btn-xs" onClick={() => void updateThread('mark-read')} disabled={!activeThread}><Send size={12} /> {t(language, 'mailSend')}</button>
            <button className="btn btn-ghost btn-xs" onClick={() => void updateThread('trash')} disabled={!activeThread}><Trash size={12} /> {t(language, 'mailDelete')}</button>
            <button className="btn btn-ghost btn-xs" onClick={() => void updateThread('archive')} disabled={!activeThread}><Archive size={12} /> {t(language, 'mailArchiveAction')}</button>
            <span className="text-[11px] text-muted-foreground">{t(language, 'mailActionsLive')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_420px_1fr] gap-4">
        <aside className="panel p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-success" /> {t(language, 'mailConnected')}
          </div>
          <div className="rounded-xl border border-border/50 p-3 space-y-1">
            <div className="text-[11px] text-muted-foreground">{t(language, 'mailCombinedInbox')}</div>
            {accounts.map((account) => (
              <div key={account} className="text-sm font-medium">{account}</div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(language, 'mailFoldersReady')}</div>
            <div className="flex gap-2">
              <input
                value={folderDraft}
                onChange={(event) => setFolderDraft(event.target.value)}
                placeholder={t(language, 'mailFolderPlaceholder')}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <button className="btn btn-primary btn-sm" onClick={() => void createFolder()} disabled={!folderDraft.trim() || busy === 'folder'}>
                {busy === 'folder' ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} {t(language, 'mailCreateFolder')}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => {
              const Icon = folder.systemKey ? SYSTEM_ICONS[folder.systemKey as keyof typeof SYSTEM_ICONS] || Mail : Mail;
              return (
                <button
                  key={folder.id}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm ${
                    activeFolderId === folder.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <Icon size={14} />
                  <span className="flex-1 text-left truncate">{folderLabel(language, folder)}</span>
                  <span className="text-[10px] text-muted-foreground">{folder.threadCount}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(language, 'mailLabels')}</div>
            <div className="flex flex-wrap gap-1">
              {['VIP', 'Client', 'Finance', 'Press', 'Internal'].map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-muted/50 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(language, 'mailSearch')}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{t(language, 'mailPrimaryTab')}</span>
            <span>•</span>
            <span>{t(language, 'mailSocialTab')}</span>
            <span>•</span>
            <span>{t(language, 'mailUpdatesTab')}</span>
            <span>•</span>
            <span>{t(language, 'mailPromotionsTab')}</span>
          </div>

          {threads.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-muted/10 p-6 text-sm text-muted-foreground">{t(language, 'mailNoThreads')}</div>
          ) : (
            <div className="space-y-2 max-h-[720px] overflow-y-auto">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left rounded-xl p-3 border ${
                    activeThread?.id === thread.id ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{thread.subject}</div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(thread.updatedAt)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{thread.fromEmail}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{thread.mailbox}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{thread.preview}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {thread.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
                    ))}
                    {thread.unread && <span className="text-[10px] text-primary">{t(language, 'mailUnread')}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5 space-y-4">
          {activeThread ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{activeThread.subject}</div>
                  <div className="text-xs text-muted-foreground">{activeThread.fromEmail} · {timeAgo(activeThread.updatedAt)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => void updateThread('toggle-star')}><Star size={14} /></button>
                  <button className="btn btn-ghost btn-sm"><Tag size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void updateThread('archive')}><Archive size={14} /></button>
                  <select
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      void updateThread('move', event.target.value);
                    }}
                  >
                    <option value="">{t(language, 'mailMoveToFolder')}</option>
                    {folders.filter((folder) => folder.id !== activeThread.folderId).map((folder) => (
                      <option key={folder.id} value={folder.id}>{folderLabel(language, folder)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <div className="text-xs text-muted-foreground">{t(language, 'mailFrom')}</div>
                <div className="text-sm font-medium">{activeThread.fromName} &lt;{activeThread.fromEmail}&gt;</div>
                <div className="text-xs text-muted-foreground">{t(language, 'mailTo')}: {activeThread.toEmail}</div>
              </div>

              <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
                {activeThread.body}
              </div>
            </>
          ) : null}

          {composeOpen && (
            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="text-xs text-muted-foreground">{t(language, 'mailNewMessage')}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input value={composeDraft.toEmail} onChange={(event) => setComposeDraft((current) => ({ ...current, toEmail: event.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailTo')} />
                <input value={composeDraft.cc} onChange={(event) => setComposeDraft((current) => ({ ...current, cc: event.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailCc')} />
                <input value={composeDraft.bcc} onChange={(event) => setComposeDraft((current) => ({ ...current, bcc: event.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailBcc')} />
                <input value={composeDraft.subject} onChange={(event) => setComposeDraft((current) => ({ ...current, subject: event.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailSubject')} />
              </div>
              <textarea value={composeDraft.body} onChange={(event) => setComposeDraft((current) => ({ ...current, body: event.target.value }))} className="w-full min-h-[180px] px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailMessagePlaceholder')} />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button className="btn btn-ghost btn-sm"><Paperclip size={14} /> {t(language, 'mailAttach')}</button>
                <button className="btn btn-primary btn-sm" onClick={() => void sendMail()} disabled={busy === 'send'}>
                  {busy === 'send' ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} {t(language, 'mailSend')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
