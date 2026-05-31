import { mkdirSync, copyFileSync, unlinkSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema.js'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DB_PATH = join(ROOT_DIR, 'data', 'flashcards.db')
const MIGRATIONS_DIR = join(ROOT_DIR, 'drizzle')

mkdirSync(dirname(DB_PATH), { recursive: true })

let sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

// export let enables ES module live bindings: all importers see the new instance
// automatically after reconnectDb() reassigns this variable
export let db = drizzle(sqlite, { schema })

function applyStartupPatches(): void {
  const columns = sqlite.prepare("PRAGMA table_info('cards')").all() as Array<{ name: string }>
  if (!columns.some(c => c.name === 'in_review')) {
    sqlite.prepare("ALTER TABLE cards ADD COLUMN in_review INTEGER NOT NULL DEFAULT 0").run()
    console.log('[db] Applied in_review column via startup patch')
  }
  if (!columns.some(c => c.name === 'archived')) {
    sqlite.prepare("ALTER TABLE cards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0").run()
    console.log('[db] Applied archived column via startup patch')
  }
}

migrate(db, { migrationsFolder: MIGRATIONS_DIR })
applyStartupPatches()
console.log('[db] Migrations applied, database ready')

export async function backupDb(destPath: string): Promise<void> {
  await sqlite.backup(destPath)
}

export function reconnectDb(srcPath: string): void {
  sqlite.pragma('wal_checkpoint(TRUNCATE)')
  sqlite.close()
  for (const suffix of ['-wal', '-shm']) {
    const auxPath = DB_PATH + suffix
    if (existsSync(auxPath)) unlinkSync(auxPath)
  }
  copyFileSync(srcPath, DB_PATH)
  sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS_DIR })
  applyStartupPatches()
  console.log('[db] Database reconnected from restore')
}
