'use client';

import { useMemo, useState } from 'react';
import {
  Search, Plus, Paperclip, Star, Clock, ShieldCheck, RefreshCw,
  Mail, Inbox, Send, Archive, AlertCircle, Trash2, Tag,
} from 'lucide-react';
import { useDashboard } from '@/store';
import { t } from '@/lib/i18n';

const FOLDERS = ['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'archive', 'spam', 'trash'] as const;
const FOLDER_ICONS = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: Mail,
  archive: Archive,
  spam: AlertCircle,
  trash: Trash2,
};

const mockThreads = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  subject: `Q${i + 1} Client Update`,
  preview: 'Weekly status, performance highlights, and next steps for the account.',
  from: i % 2 === 0 ? 'office@aikitz.at' : 'team@aikitz.at',
  time: `${8 + (i % 9)}:${(i * 7) % 60}`.padStart(2, '0'),
  unread: i % 3 === 0,
  tags: i % 2 === 0 ? ['VIP', 'Client'] : ['Internal'],
}));

export default function MailPage() {
  const { language } = useDashboard();
  const [activeFolder, setActiveFolder] = useState<typeof FOLDERS[number]>('inbox');
  const [activeThread, setActiveThread] = useState(mockThreads[0]);
  const [query, setQuery] = useState('');
  const folderCounts = useMemo(() => [6, 4, 2, 8, 3, 5, 1, 2], []);

  const filteredThreads = useMemo(
    () => mockThreads.filter(t =>
      t.subject.toLowerCase().includes(query.toLowerCase()) ||
      t.preview.toLowerCase().includes(query.toLowerCase()) ||
      t.from.toLowerCase().includes(query.toLowerCase()),
    ),
    [query],
  );

  return (
    <div className="space-y-5 animate-in">
      <div className="panel">
        <div className="panel-header flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{t(language, 'titleMail')}</h1>
            <p className="text-sm text-muted-foreground">{t(language, 'mailProTitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm">
              <Plus size={14} /> {t(language, 'mailCompose')}
            </button>
            <button className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> {t(language, 'mailSync')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[240px_360px_1fr_320px] gap-4">
        <aside className="panel p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-success" /> {t(language, 'mailConnected')}
          </div>
          <div className="space-y-1">
            {FOLDERS.map((folder, index) => {
              const Icon = FOLDER_ICONS[folder];
              const label =
                folder === 'inbox' ? t(language, 'mailInbox') :
                folder === 'starred' ? t(language, 'mailStarred') :
                folder === 'snoozed' ? t(language, 'mailSnoozed') :
                folder === 'sent' ? t(language, 'mailSent') :
                folder === 'drafts' ? t(language, 'mailDrafts') :
                folder === 'archive' ? t(language, 'mailArchive') :
                folder === 'spam' ? t(language, 'mailSpam') :
                t(language, 'mailTrash');
              return (
                <button
                  key={folder}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                    activeFolder === folder ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                  onClick={() => setActiveFolder(folder)}
                >
                  <Icon size={14} />
                  <span className="flex-1 text-left">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{folderCounts[index]}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(language, 'mailLabels')}</div>
            <div className="flex flex-wrap gap-1">
              {['VIP', 'Client', 'Finance', 'Press', 'Internal'].map(tag => (
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(language, 'mailSearch')}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto">
            {filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setActiveThread(thread)}
                className={`w-full text-left rounded-xl p-3 border ${
                  activeThread.id === thread.id ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{thread.subject}</div>
                  <span className="text-[10px] text-muted-foreground">{thread.time}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{thread.from}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{thread.preview}</div>
                <div className="flex items-center gap-2 mt-2">
                  {thread.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                  {thread.unread && <span className="text-[10px] text-primary">Unread</span>}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{activeThread.subject}</div>
              <div className="text-xs text-muted-foreground">{activeThread.from} · Today</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm"><Star size={14} /></button>
              <button className="btn btn-ghost btn-sm"><Tag size={14} /></button>
              <button className="btn btn-ghost btn-sm"><Archive size={14} /></button>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
            <div className="text-xs text-muted-foreground">{t(language, 'mailFrom')}</div>
            <div className="text-sm font-medium">{activeThread.from}</div>
            <div className="text-xs text-muted-foreground">{t(language, 'mailTo')}: office@aikitz.at</div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed">
            <p>Hi team,</p>
            <p>Here is the latest performance snapshot and upcoming milestones for the week. Please review the action items and confirm the launch schedule.</p>
            <p>Regards,<br />AI Kitz Labs</p>
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="text-xs text-muted-foreground">{t(language, 'mailNewMessage')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailTo')} />
              <input className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailCc')} />
              <input className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailBcc')} />
              <input className="px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailSubject')} />
            </div>
            <textarea className="w-full min-h-[140px] px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder={t(language, 'mailMessagePlaceholder')} />
            <div className="flex items-center justify-between">
              <button className="btn btn-ghost btn-sm"><Paperclip size={14} /> {t(language, 'mailAttach')}</button>
              <button className="btn btn-primary btn-sm">{t(language, 'mailSend')}</button>
            </div>
          </div>
        </section>

        <aside className="panel p-4 space-y-4">
          <div className="text-sm font-medium">{t(language, 'mailAccount')}</div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t(language, 'mailServer')}</div>
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-lg border border-border/50 p-3">
                <div className="text-xs text-muted-foreground">{t(language, 'mailSmtp')}</div>
                <div className="text-sm font-medium">smtp.world4you.com</div>
                <div className="text-[11px] text-muted-foreground">{t(language, 'mailPort')}: 587</div>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <div className="text-xs text-muted-foreground">{t(language, 'mailImap')}</div>
                <div className="text-sm font-medium">imap.world4you.com</div>
                <div className="text-[11px] text-muted-foreground">{t(language, 'mailPort')}: 993</div>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <div className="text-xs text-muted-foreground">{t(language, 'mailPop3')}</div>
                <div className="text-sm font-medium">pop3.world4you.com</div>
                <div className="text-[11px] text-muted-foreground">{t(language, 'mailPort')}: 995</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t(language, 'mailUsername')}</div>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" value="office@aikitz.at" readOnly />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t(language, 'mailPassword')}</div>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" type="password" value="••••••••••" readOnly />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t(language, 'mailEncryption')}</div>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option>TLS</option>
              <option>SSL</option>
              <option>STARTTLS</option>
            </select>
          </div>

          <button className="btn btn-primary btn-sm w-full">{t(language, 'mailSave')}</button>
        </aside>
      </div>
    </div>
  );
}
