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
console.log('[db] Migrations applied, database ready')
