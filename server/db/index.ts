import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema.js'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DB_PATH = join(ROOT_DIR, 'data', 'flashcards.db')
const MIGRATIONS_DIR = join(ROOT_DIR, 'drizzle')

// Ensure the data directory exists before opening the file
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)
// WAL gives better read/write concurrency for the single-user workload
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

migrate(db, { migrationsFolder: MIGRATIONS_DIR })

// Self-healing: add missing columns if migrations were skipped on an existing DB
const columns = sqlite.prepare("PRAGMA table_info('cards')").all() as Array<{ name: string }>
if (!columns.some(c => c.name === 'in_review')) {
  sqlite.prepare("ALTER TABLE cards ADD COLUMN in_review INTEGER NOT NULL DEFAULT 0").run()
  console.log('[db] Applied in_review column via startup patch')
}
if (!columns.some(c => c.name === 'archived')) {
  sqlite.prepare("ALTER TABLE cards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0").run()
  console.log('[db] Applied archived column via startup patch')
}

console.log('[db] Migrations applied, database ready')
