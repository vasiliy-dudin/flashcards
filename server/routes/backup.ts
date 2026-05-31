import { Hono } from 'hono'
import { readFileSync, existsSync, unlinkSync } from 'fs'
import { join, basename, resolve } from 'path'
import { zipSync, strToU8, type Zippable, type ZipDeflateOptions } from 'fflate'
import { isNotNull, sql } from 'drizzle-orm'
import { db, backupDb } from '../db/index.js'
import { cards } from '../db/schema.js'
import type { BackupManifest } from '../types/backup.js'

const AUDIO_DIR = resolve(process.cwd(), 'data', 'audio')
const TMP_DB_PATH = resolve(process.cwd(), 'data', 'flashcards.db.backup.tmp')

const STORE: ZipDeflateOptions = { level: 0 }
const DEFLATE: ZipDeflateOptions = { level: 6 }

function queryBackupData(): { cardCount: number; audioFilenames: string[] } {
  const [{ total }] = db.select({ total: sql<number>`count(*)` }).from(cards).all()
  const audioRows = db
    .select({ audioUrl: cards.audioUrl })
    .from(cards)
    .where(isNotNull(cards.audioUrl))
    .all()
  const dedupedUrls = [...new Set(audioRows.map(r => r.audioUrl as string))]
  return { cardCount: total, audioFilenames: dedupedUrls.map(url => basename(url)) }
}

function buildZipEntries(
  dbBytes: Uint8Array,
  audioFilenames: string[],
  manifest: BackupManifest,
  settings: Record<string, unknown>,
): Zippable {
  const entries: Zippable = {
    'db/flashcards.db': [dbBytes, STORE],
    'manifest.json': [strToU8(JSON.stringify(manifest, null, 2)), DEFLATE],
    'settings.json': [strToU8(JSON.stringify(settings, null, 2)), DEFLATE],
  }
  for (const filename of audioFilenames) {
    const filePath = join(AUDIO_DIR, filename)
    if (existsSync(filePath)) {
      entries[`audio/${filename}`] = [new Uint8Array(readFileSync(filePath)), STORE]
    } else {
      console.warn(`[backup] Audio file missing, skipping: ${filename}`)
    }
  }
  return entries
}

const app = new Hono()

app.post('/', async (c) => {
  let settings: Record<string, unknown> = {}
  try {
    const body = await c.req.json() as { settings?: unknown }
    if (typeof body.settings === 'object' && body.settings !== null) {
      settings = body.settings as Record<string, unknown>
    }
  } catch {
    // Request body is optional — settings default to {}
  }

  let cardCount: number
  let audioFilenames: string[]
  try {
    const data = queryBackupData()
    cardCount = data.cardCount
    audioFilenames = data.audioFilenames
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[backup] DB query failed:', message)
    return c.json({ error: 'Failed to read database' }, 500)
  }

  try {
    await backupDb(TMP_DB_PATH)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[backup] DB snapshot failed:', message)
    return c.json({ error: 'Failed to create database snapshot' }, 500)
  }

  let dbBytes: Uint8Array
  try {
    dbBytes = new Uint8Array(readFileSync(TMP_DB_PATH))
  } finally {
    if (existsSync(TMP_DB_PATH)) unlinkSync(TMP_DB_PATH)
  }

  const manifest: BackupManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    cardCount,
    audioFiles: audioFilenames,
  }

  let zipped: Uint8Array
  try {
    zipped = zipSync(buildZipEntries(dbBytes, audioFilenames, manifest, settings))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[backup] ZIP creation failed:', message)
    return c.json({ error: 'Failed to build backup archive' }, 500)
  }

  return new Response(zipped, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="flashcards-backup.zip"',
    },
  })
})

export default app
