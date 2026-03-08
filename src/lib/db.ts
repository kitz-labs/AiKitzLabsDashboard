import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seedChatMessages } from './seed-chat';
import { getHermesStateDir } from './hermes-state';

const DB_PATH =
  process.env.HERMES_DB_PATH || path.join(getHermesStateDir(), 'hermes.db');

export function getDbPath(): string {
  return DB_PATH;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.pragma('busy_timeout = 5000');
    migrate(_db);
    seedChatMessages(_db);
  }
  return _db;
}

export function resetDbForTests(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_posts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      format TEXT NOT NULL,
      pillar INTEGER,
      text_preview TEXT,
      full_content TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_for DATETIME,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      impressions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      title TEXT,
      company TEXT,
      company_size TEXT,
      industry_segment TEXT,
      source TEXT,
      email TEXT,
      linkedin_url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      score INTEGER,
      tier TEXT,
      last_touch_at DATETIME,
      next_action_at DATETIME,
      sequence_name TEXT,
      reply_type TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sequences (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      sequence_name TEXT,
      step INTEGER,
      subject TEXT,
      body TEXT,
      status TEXT,
      tier TEXT,
      scheduled_for DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppression (
      email TEXT PRIMARY KEY,
      type TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT,
      action_type TEXT,
      target_url TEXT,
      target_username TEXT,
      our_text TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      type TEXT,
      username TEXT,
      tweet_url TEXT,
      summary TEXT,
      relevance TEXT,
      action_taken TEXT,
      likes INTEGER,
      impressions INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week INTEGER,
      hypothesis TEXT,
      action TEXT,
      metric TEXT,
      win_threshold TEXT,
      status TEXT,
      results TEXT,
      winner TEXT,
      margin TEXT,
      decision TEXT,
      learning TEXT,
      next_action TEXT,
      proposed_at DATETIME,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learning TEXT,
      validated_week INTEGER,
      confidence TEXT,
      applied_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      date TEXT PRIMARY KEY,
      x_posts INTEGER DEFAULT 0,
      x_threads INTEGER DEFAULT 0,
      linkedin_drafts INTEGER DEFAULT 0,
      x_replies INTEGER DEFAULT 0,
      x_quote_tweets INTEGER DEFAULT 0,
      x_follows INTEGER DEFAULT 0,
      linkedin_comments INTEGER DEFAULT 0,
      discoveries INTEGER DEFAULT 0,
      enrichments INTEGER DEFAULT 0,
      sends INTEGER DEFAULT 0,
      replies_triaged INTEGER DEFAULT 0,
      opt_outs INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      total_impressions INTEGER DEFAULT 0,
      total_engagement INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts DATETIME,
      action TEXT,
      detail TEXT,
      result TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_content_status ON content_posts(status);
    CREATE INDEX IF NOT EXISTS idx_content_platform ON content_posts(platform);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
    CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);
    CREATE INDEX IF NOT EXISTS idx_sequences_lead ON sequences(lead_id);
    CREATE INDEX IF NOT EXISTS idx_engagements_platform ON engagements(platform);
    CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);
    CREATE INDEX IF NOT EXISTS idx_signals_date ON signals(date);
    CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
    CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
    CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(ts);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT,
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

    CREATE TABLE IF NOT EXISTS seed_registry (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      PRIMARY KEY (table_name, record_id)
    );


    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      from_agent TEXT NOT NULL,
      to_agent TEXT,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      metadata TEXT,
      read_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_agents ON messages(from_agent, to_agent);

    CREATE TABLE IF NOT EXISTS session_sync (
      session_file TEXT PRIMARY KEY,
      last_offset INTEGER NOT NULL DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS coding_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      input TEXT,
      output TEXT,
      status TEXT NOT NULL DEFAULT 'saved',
      agents_json TEXT NOT NULL DEFAULT '[]',
      selected_actions_json TEXT NOT NULL DEFAULT '[]',
      workspace_state_json TEXT,
      created_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coding_sessions_status ON coding_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_coding_sessions_updated ON coding_sessions(updated_at DESC);

    CREATE TABLE IF NOT EXISTS coding_knowledge_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      size INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'uploads',
      content_preview TEXT,
      storage_path TEXT,
      created_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coding_knowledge_category ON coding_knowledge_files(category);
    CREATE INDEX IF NOT EXISTS idx_coding_knowledge_updated ON coding_knowledge_files(updated_at DESC);

    CREATE TABLE IF NOT EXISTS coding_approvals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_by TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coding_approvals_status ON coding_approvals(status);
    CREATE INDEX IF NOT EXISTS idx_coding_approvals_updated ON coding_approvals(updated_at DESC);

    CREATE TABLE IF NOT EXISTS coding_file_change_history (
      id TEXT PRIMARY KEY,
      approval_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      action TEXT NOT NULL,
      before_content TEXT,
      after_content TEXT,
      diff_preview TEXT,
      actor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coding_file_history_approval ON coding_file_change_history(approval_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_coding_file_history_file ON coding_file_change_history(file_path, created_at DESC);

    CREATE TABLE IF NOT EXISTS mail_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_key TEXT UNIQUE,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_mail_folders_sort ON mail_folders(sort_order ASC, updated_at ASC);

    CREATE TABLE IF NOT EXISTS mail_threads (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL REFERENCES mail_folders(id) ON DELETE CASCADE,
      mailbox TEXT NOT NULL,
      from_name TEXT,
      from_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      preview TEXT,
      body TEXT,
      tags_json TEXT,
      unread INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_mail_threads_folder ON mail_threads(folder_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mail_threads_starred ON mail_threads(starred, updated_at DESC);

  `);

  // Column migrations (safe to re-run)
  try { db.exec("ALTER TABLE leads ADD COLUMN pause_outreach INTEGER DEFAULT 0"); } catch { /* column exists */ }
  try { db.exec("ALTER TABLE coding_sessions ADD COLUMN workspace_state_json TEXT"); } catch { /* column exists */ }
}
