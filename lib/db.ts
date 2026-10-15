import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { InterviewSession } from './types';

// Each session is stored as a single JSON blob in the `sessions` table.
const dbPath = path.resolve(process.env.DATABASE_PATH || './local-data/interviews.sqlite');

let db: Database.Database | undefined;

/** Opens the database on first use and creates the table if needed. */
function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
  return db;
}

/** Inserts a new session or overwrites an existing one. */
export function saveSession(session: InterviewSession) {
  getDb()
    .prepare(`
      INSERT INTO sessions (id, data, created_at, updated_at)
      VALUES (@id, @data, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `)
    .run({
      id: session.id,
      data: JSON.stringify(session),
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    });
}

export function getSession(id: string): InterviewSession | undefined {
  const row = getDb().prepare('SELECT data FROM sessions WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as InterviewSession) : undefined;
}

/** Returns the 50 most recently updated sessions. */
export function listSessions(): InterviewSession[] {
  const rows = getDb()
    .prepare('SELECT data FROM sessions ORDER BY updated_at DESC LIMIT 50')
    .all() as { data: string }[];
  return rows.map(row => JSON.parse(row.data) as InterviewSession);
}
