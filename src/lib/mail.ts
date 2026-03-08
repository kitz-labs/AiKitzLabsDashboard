import { getDb } from './db';

export interface MailFolderRecord {
  id: string;
  name: string;
  systemKey: string | null;
  color: string | null;
  sortOrder: number;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MailThreadRecord {
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
}

const SYSTEM_FOLDERS = [
  { id: 'mail_folder_inbox', systemKey: 'inbox', name: 'Inbox', color: '#4f46e5', sortOrder: 10 },
  { id: 'mail_folder_starred', systemKey: 'starred', name: 'Starred', color: '#f59e0b', sortOrder: 20 },
  { id: 'mail_folder_snoozed', systemKey: 'snoozed', name: 'Snoozed', color: '#06b6d4', sortOrder: 30 },
  { id: 'mail_folder_sent', systemKey: 'sent', name: 'Sent', color: '#10b981', sortOrder: 40 },
  { id: 'mail_folder_drafts', systemKey: 'drafts', name: 'Drafts', color: '#6366f1', sortOrder: 50 },
  { id: 'mail_folder_archive', systemKey: 'archive', name: 'Archive', color: '#64748b', sortOrder: 60 },
  { id: 'mail_folder_spam', systemKey: 'spam', name: 'Spam', color: '#ef4444', sortOrder: 70 },
  { id: 'mail_folder_trash', systemKey: 'trash', name: 'Trash', color: '#dc2626', sortOrder: 80 },
] as const;

function createMailId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function buildPreview(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function getFolderIdBySystemKey(systemKey: string): string {
  const folder = SYSTEM_FOLDERS.find((item) => item.systemKey === systemKey);
  if (!folder) throw new Error(`Unknown system folder: ${systemKey}`);
  return folder.id;
}

export function ensureMailSeeded(): void {
  const db = getDb();
  const insertFolder = db.prepare(`
    INSERT INTO mail_folders (id, name, system_key, color, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      system_key = excluded.system_key,
      color = excluded.color,
      sort_order = excluded.sort_order,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const folder of SYSTEM_FOLDERS) {
    insertFolder.run(folder.id, folder.name, folder.systemKey, folder.color, folder.sortOrder);
  }

  const existing = db.prepare('SELECT COUNT(*) as count FROM mail_threads').get() as { count: number };
  if (existing.count > 0) return;

  const insertThread = db.prepare(`
    INSERT INTO mail_threads (
      id, folder_id, mailbox, from_name, from_email, to_email,
      subject, preview, body, tags_json, unread, starred, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  for (let index = 0; index < 18; index += 1) {
    const body = index % 2 === 0
      ? 'Hi team, here is the latest performance snapshot, next milestones, and pending approvals for this client account.'
      : 'Quick update: deployment is green, the campaign dashboard is ready, and we need confirmation on the launch timing.';
    const createdAt = new Date(now - index * 1000 * 60 * 37).toISOString();
    insertThread.run(
      createMailId('mail_thread'),
      index < 12 ? getFolderIdBySystemKey('inbox') : getFolderIdBySystemKey('sent'),
      index % 2 === 0 ? 'office@aikitz.at' : 'ceo@aikitz.at',
      index % 2 === 0 ? 'AI Kitz Labs Office' : 'CEO Office',
      index % 2 === 0 ? 'office@aikitz.at' : 'partners@aikitz.at',
      'team@aikitz.at',
      `Client update ${index + 1}`,
      buildPreview(body),
      body,
      JSON.stringify(index % 2 === 0 ? ['VIP', 'Client'] : ['Internal']),
      index % 3 === 0 ? 1 : 0,
      index % 5 === 0 ? 1 : 0,
      createdAt,
      createdAt,
    );
  }
}

export function listMailFolders(): MailFolderRecord[] {
  ensureMailSeeded();
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      f.id,
      f.name,
      f.system_key,
      f.color,
      f.sort_order,
      f.created_at,
      f.updated_at,
      COALESCE(COUNT(t.id), 0) as thread_count
    FROM mail_folders f
    LEFT JOIN mail_threads t ON t.folder_id = f.id
    GROUP BY f.id
    ORDER BY f.sort_order ASC, f.updated_at ASC
  `).all() as Array<{
    id: string;
    name: string;
    system_key: string | null;
    color: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    thread_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    systemKey: row.system_key,
    color: row.color,
    sortOrder: row.sort_order,
    threadCount: row.thread_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function listMailThreads(folderId?: string, query?: string): MailThreadRecord[] {
  ensureMailSeeded();
  const db = getDb();
  const filters: string[] = [];
  const params: unknown[] = [];

  if (folderId) {
    filters.push('folder_id = ?');
    params.push(folderId);
  }
  if (query?.trim()) {
    filters.push('(subject LIKE ? OR preview LIKE ? OR from_email LIKE ? OR mailbox LIKE ?)');
    const search = `%${query.trim()}%`;
    params.push(search, search, search, search);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT id, folder_id, mailbox, from_name, from_email, to_email, subject, preview, body, tags_json, unread, starred, created_at, updated_at
    FROM mail_threads
    ${whereClause}
    ORDER BY unread DESC, updated_at DESC, created_at DESC
  `).all(...params) as Array<{
    id: string;
    folder_id: string;
    mailbox: string;
    from_name: string | null;
    from_email: string;
    to_email: string;
    subject: string;
    preview: string | null;
    body: string | null;
    tags_json: string | null;
    unread: number;
    starred: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    folderId: row.folder_id,
    mailbox: row.mailbox,
    fromName: row.from_name || row.from_email,
    fromEmail: row.from_email,
    toEmail: row.to_email,
    subject: row.subject,
    preview: row.preview || '',
    body: row.body || '',
    tags: row.tags_json ? JSON.parse(row.tags_json) : [],
    unread: row.unread === 1,
    starred: row.starred === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createMailFolder(input: { name: string; color?: string | null }): MailFolderRecord {
  const db = getDb();
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error('Folder name is required');
  const id = createMailId('mail_folder');
  const currentMax = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as maxSort FROM mail_folders').get() as { maxSort: number };
  db.prepare(`
    INSERT INTO mail_folders (id, name, system_key, color, sort_order, updated_at)
    VALUES (?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, trimmedName, input.color || '#8b5cf6', currentMax.maxSort + 10);
  return listMailFolders().find((folder) => folder.id === id)!;
}

export function updateMailThread(input: {
  id: string;
  action: 'archive' | 'trash' | 'toggle-star' | 'mark-read' | 'move';
  targetFolderId?: string;
}): MailThreadRecord {
  const db = getDb();
  ensureMailSeeded();
  const current = db.prepare('SELECT id, folder_id, starred FROM mail_threads WHERE id = ?').get(input.id) as { id: string; folder_id: string; starred: number } | undefined;
  if (!current) throw new Error('Mail thread not found');

  if (input.action === 'toggle-star') {
    db.prepare('UPDATE mail_threads SET starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(current.starred ? 0 : 1, input.id);
  } else if (input.action === 'mark-read') {
    db.prepare('UPDATE mail_threads SET unread = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(input.id);
  } else if (input.action === 'archive') {
    db.prepare('UPDATE mail_threads SET folder_id = ?, unread = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(getFolderIdBySystemKey('archive'), input.id);
  } else if (input.action === 'trash') {
    db.prepare('UPDATE mail_threads SET folder_id = ?, unread = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(getFolderIdBySystemKey('trash'), input.id);
  } else if (input.action === 'move') {
    if (!input.targetFolderId) throw new Error('targetFolderId is required');
    db.prepare('UPDATE mail_threads SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(input.targetFolderId, input.id);
  }

  return listMailThreads().find((thread) => thread.id === input.id)!;
}

export function composeMail(input: {
  toEmail: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  mailbox?: string;
}): MailThreadRecord {
  const db = getDb();
  ensureMailSeeded();
  const toEmail = input.toEmail.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!toEmail) throw new Error('Recipient is required');
  if (!subject) throw new Error('Subject is required');
  if (!body) throw new Error('Message body is required');

  const id = createMailId('mail_thread');
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT INTO mail_threads (
      id, folder_id, mailbox, from_name, from_email, to_email,
      subject, preview, body, tags_json, unread, starred, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).run(
    id,
    getFolderIdBySystemKey('sent'),
    input.mailbox || 'office@aikitz.at',
    'AI Kitz Labs',
    input.mailbox || 'office@aikitz.at',
    [toEmail, input.cc?.trim(), input.bcc?.trim()].filter(Boolean).join(', '),
    subject,
    buildPreview(body),
    body,
    JSON.stringify(['Sent']),
    timestamp,
    timestamp,
  );

  return listMailThreads().find((thread) => thread.id === id)!;
}

export function getMailBootstrap(query?: string): {
  folders: MailFolderRecord[];
  threads: MailThreadRecord[];
  connected: boolean;
  accounts: string[];
  lastSyncAt: string;
} {
  const folders = listMailFolders();
  const inboxId = getFolderIdBySystemKey('inbox');
  return {
    folders,
    threads: listMailThreads(inboxId, query),
    connected: true,
    accounts: ['office@aikitz.at', 'ceo@aikitz.at'],
    lastSyncAt: new Date().toISOString(),
  };
}
