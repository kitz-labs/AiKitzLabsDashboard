import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from './db';
import { getHermesStateDir } from './hermes-state';

export type CodingProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';
export type CodingFileCategory = 'docs' | 'flows' | 'core' | 'memory' | 'uploads';

export interface CodingKnowledgeFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  category: CodingFileCategory;
  contentPreview: string;
  storagePath: string | null;
  createdBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CodingSessionRecord {
  id: string;
  title: string;
  summary: string;
  input: string;
  output: string;
  status: 'active' | 'saved' | 'archived';
  agents: string[];
  selectedActions: string[];
  createdBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CodingApprovalRecord {
  id: string;
  title: string;
  summary: string;
  payload: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getCodingStorageDir(): string {
  const configured = process.env.HERMES_CODING_STORAGE_DIR?.trim();
  const base = configured || path.join(getHermesStateDir(), 'coding');
  fs.mkdirSync(base, { recursive: true });
  return base;
}

export function getCodingUploadsDir(): string {
  const uploads = path.join(getCodingStorageDir(), 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  return uploads;
}

export function createCodingId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function inferCodingCategory(name: string): CodingFileCategory {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.includes('doc')) return 'docs';
  if (lower.includes('flow') || lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'flows';
  if (lower.includes('memory')) return 'memory';
  if (/(\.ts|\.tsx|\.js|\.jsx|\.json)$/.test(lower)) return 'core';
  return 'uploads';
}

export function buildContentPreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 700);
}

function isAllowedTextFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|json|md|txt|css|scss|mjs|cjs|html|yml|yaml|sql)$/i.test(filePath);
}

export function resolveWorkspacePath(inputPath: string): string {
  const relative = inputPath.trim().replace(/^\/+/, '');
  if (!relative) throw new Error('filePath is required');
  const workspaceRoot = process.cwd();
  const resolved = path.resolve(workspaceRoot, relative);
  if (resolved !== workspaceRoot && !resolved.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('Path must stay within the workspace');
  }
  if (!isAllowedTextFile(resolved)) {
    throw new Error('Only text-like workspace files are allowed for diff preview');
  }
  return resolved;
}

export function readWorkspaceTextFile(inputPath: string): { exists: boolean; content: string; resolvedPath: string } {
  const resolvedPath = resolveWorkspacePath(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    return { exists: false, content: '', resolvedPath };
  }
  const content = fs.readFileSync(resolvedPath, 'utf8');
  if (content.includes('\u0000')) {
    throw new Error('Binary files are not supported for diff preview');
  }
  return { exists: true, content, resolvedPath };
}

function buildLcsTable(beforeLines: string[], afterLines: string[]) {
  const table = Array.from({ length: beforeLines.length + 1 }, () => Array(afterLines.length + 1).fill(0));
  for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
      table[beforeIndex][afterIndex] = beforeLines[beforeIndex] === afterLines[afterIndex]
        ? table[beforeIndex + 1][afterIndex + 1] + 1
        : Math.max(table[beforeIndex + 1][afterIndex], table[beforeIndex][afterIndex + 1]);
    }
  }
  return table;
}

export function createUnifiedDiff(filePath: string, before: string, after: string): string {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const lcs = buildLcsTable(beforeLines, afterLines);
  const diffLines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`, '@@'];

  let beforeIndex = 0;
  let afterIndex = 0;
  let emitted = 0;

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      diffLines.push(` ${beforeLines[beforeIndex]}`);
      beforeIndex += 1;
      afterIndex += 1;
    } else if (lcs[beforeIndex + 1][afterIndex] >= lcs[beforeIndex][afterIndex + 1]) {
      diffLines.push(`-${beforeLines[beforeIndex]}`);
      beforeIndex += 1;
    } else {
      diffLines.push(`+${afterLines[afterIndex]}`);
      afterIndex += 1;
    }

    emitted += 1;
    if (emitted > 500) {
      diffLines.push('... diff truncated ...');
      return diffLines.join('\n');
    }
  }

  while (beforeIndex < beforeLines.length) {
    diffLines.push(`-${beforeLines[beforeIndex]}`);
    beforeIndex += 1;
  }

  while (afterIndex < afterLines.length) {
    diffLines.push(`+${afterLines[afterIndex]}`);
    afterIndex += 1;
  }

  return diffLines.join('\n');
}

export function listCodingKnowledgeFiles(): CodingKnowledgeFileRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, type, size, category, content_preview, storage_path, created_by, updated_at, created_at
    FROM coding_knowledge_files
    ORDER BY updated_at DESC, created_at DESC
  `).all() as Array<{
    id: string;
    name: string;
    type: string | null;
    size: number;
    category: CodingFileCategory;
    content_preview: string | null;
    storage_path: string | null;
    created_by: string | null;
    updated_at: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type || 'application/octet-stream',
    size: row.size,
    category: row.category,
    contentPreview: row.content_preview || '',
    storagePath: row.storage_path,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));
}

export function upsertCodingKnowledgeFile(input: {
  id?: string;
  name: string;
  type?: string;
  size: number;
  category?: CodingFileCategory;
  contentPreview?: string;
  storagePath?: string | null;
  createdBy?: string | null;
}): CodingKnowledgeFileRecord {
  const db = getDb();
  const id = input.id || createCodingId('coding_file');
  const category = input.category || inferCodingCategory(input.name);
  db.prepare(`
    INSERT INTO coding_knowledge_files (id, name, type, size, category, content_preview, storage_path, created_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      size = excluded.size,
      category = excluded.category,
      content_preview = excluded.content_preview,
      storage_path = excluded.storage_path,
      created_by = excluded.created_by,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    id,
    input.name,
    input.type || 'application/octet-stream',
    input.size,
    category,
    input.contentPreview || '',
    input.storagePath || null,
    input.createdBy || null,
  );

  return listCodingKnowledgeFiles().find((item) => item.id === id)!;
}

export function deleteCodingKnowledgeFile(id: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT storage_path FROM coding_knowledge_files WHERE id = ?').get(id) as { storage_path: string | null } | undefined;
  if (!row) return false;
  if (row.storage_path) {
    const absolute = path.isAbsolute(row.storage_path) ? row.storage_path : path.join(process.cwd(), row.storage_path);
    try {
      fs.unlinkSync(absolute);
    } catch {
      // ignore missing file
    }
  }
  const result = db.prepare('DELETE FROM coding_knowledge_files WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listCodingSessions(): CodingSessionRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, title, summary, input, output, status, agents_json, selected_actions_json, created_by, updated_at, created_at
    FROM coding_sessions
    ORDER BY updated_at DESC, created_at DESC
  `).all() as Array<{
    id: string;
    title: string;
    summary: string | null;
    input: string | null;
    output: string | null;
    status: 'active' | 'saved' | 'archived';
    agents_json: string | null;
    selected_actions_json: string | null;
    created_by: string | null;
    updated_at: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary || '',
    input: row.input || '',
    output: row.output || '',
    status: row.status,
    agents: row.agents_json ? JSON.parse(row.agents_json) : [],
    selectedActions: row.selected_actions_json ? JSON.parse(row.selected_actions_json) : [],
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));
}

export function upsertCodingSession(input: {
  id?: string;
  title: string;
  summary?: string;
  input?: string;
  output?: string;
  status?: 'active' | 'saved' | 'archived';
  agents?: string[];
  selectedActions?: string[];
  createdBy?: string | null;
}): CodingSessionRecord {
  const db = getDb();
  const id = input.id || createCodingId('coding_session');
  db.prepare(`
    INSERT INTO coding_sessions (id, title, summary, input, output, status, agents_json, selected_actions_json, created_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      input = excluded.input,
      output = excluded.output,
      status = excluded.status,
      agents_json = excluded.agents_json,
      selected_actions_json = excluded.selected_actions_json,
      created_by = excluded.created_by,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    id,
    input.title,
    input.summary || '',
    input.input || '',
    input.output || '',
    input.status || 'saved',
    JSON.stringify(input.agents || []),
    JSON.stringify(input.selectedActions || []),
    input.createdBy || null,
  );

  return listCodingSessions().find((item) => item.id === id)!;
}

export function archiveCodingSessionRecord(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`UPDATE coding_sessions SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listCodingApprovals(): CodingApprovalRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, title, summary, payload_json, status, requested_by, reviewed_by, reviewed_at, created_at, updated_at
    FROM coding_approvals
    ORDER BY updated_at DESC, created_at DESC
  `).all() as Array<{
    id: string;
    title: string;
    summary: string | null;
    payload_json: string | null;
    status: 'pending' | 'approved' | 'rejected';
    requested_by: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary || '',
    payload: row.payload_json ? JSON.parse(row.payload_json) : null,
    status: row.status,
    requestedBy: row.requested_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createCodingApproval(input: {
  title: string;
  summary?: string;
  payload?: Record<string, unknown> | null;
  requestedBy?: string | null;
}): CodingApprovalRecord {
  const db = getDb();
  const id = createCodingId('coding_approval');
  db.prepare(`
    INSERT INTO coding_approvals (id, title, summary, payload_json, status, requested_by, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
  `).run(
    id,
    input.title,
    input.summary || '',
    input.payload ? JSON.stringify(input.payload) : null,
    input.requestedBy || null,
  );
  return listCodingApprovals().find((item) => item.id === id)!;
}

export function updateCodingApprovalStatus(id: string, status: 'approved' | 'rejected', reviewedBy?: string | null): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE coding_approvals
    SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, reviewedBy || null, id);
  return result.changes > 0;
}

export function writeCodingUploadFile(name: string, buffer: Buffer): string {
  const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const relative = path.join('state', 'coding', 'uploads', `${Date.now()}-${safeName}`);
  const absolute = path.join(process.cwd(), relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, buffer);
  return relative;
}
