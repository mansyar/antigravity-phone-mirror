import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

// In a real environment, this might be a user data directory
const DATA_DIR = join(process.cwd(), 'data')

let _db: Database.Database | null = null

/**
 * Get the database instance (lazy initialization)
 */
export function getDb(): Database.Database {
  if (_db) return _db

  // Ensure data directory exists
  try {
    mkdirSync(DATA_DIR, { recursive: true })
  } catch {
    // Ignore if exists
  }

  _db = new Database(join(DATA_DIR, 'antigravity.db'))

  // Enable WAL mode for better performance
  _db.pragma('journal_mode = WAL')

  // Initialize schema
  _db.exec(`
    CREATE TABLE IF NOT EXISTS vapid_keys (
      id INTEGER PRIMARY KEY,
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  console.log('[DB] SQLite initialized at', join(DATA_DIR, 'antigravity.db'))

  return _db
}

/**
 * Close the database connection (for cleanup)
 */
export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
