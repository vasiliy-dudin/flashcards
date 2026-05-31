import { Hono } from 'hono'
import { mkdirSync, writeFileSync, rmSync, renameSync, unlinkSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { unzipSync, strFromU8 } from 'fflate'
import { reconnectDb } from '../db/index.js'
import type { BackupManifest } from '../types/backup.js'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const AUDIO_DIR = join(ROOT_DIR, 'data', 'audio')
const AUDIO_STAGING_DIR = join(ROOT_DIR, 'data', 'audio.restore')
const TMP_DB_PATH = join(ROOT_DIR, 'data', 'flashcards.db.restore')

const MAX_RESTORE_SIZE = 500 * 1024 * 1024

interface ExtractedBackup {
  dbBytes: Uint8Array
  audioEntries: Array<{ filename: string; bytes: Uint8Array }>
  settings: Record<string, unknown>
}

function validateAndExtract(zipBytes: Uint8Array): ExtractedBackup {
  const files = unzipSync(zipBytes)

  const manifestEntry = files['manifest.json']
  if (!manifestEntry) throw new Error('Not a valid backup: manifest.json missing')

  const manifest = JSON.parse(strFromU8(manifestEntry)) as BackupManifest
  if (manifest.version !== 1) throw new Error(`Unsupported backup version: ${manifest.version}`)

  const dbEntry = files['db/flashcards.db']
  if (!dbEntry) throw new Error('Not a valid backup: db/flashcards.db missing')

  const settingsEntry = files['settings.json']
  const settings = settingsEntry
    ? JSON.parse(strFromU8(settingsEntry)) as Record<string, unknown>
    : {}

  const audioEntries = Object.entries(files)
    .filter(([name]) => name.startsWith('audio/') && name.length > 'audio/'.length)
    .map(([name, bytes]) => ({ filename: basename(name), bytes }))

  return { dbBytes: dbEntry, audioEntries, settings }
}

function stageAudioFiles(audioEntries: Array<{ filename: string; bytes: Uint8Array }>): void {
  if (existsSync(AUDIO_STAGING_DIR)) rmSync(AUDIO_STAGING_DIR, { recursive: true, force: true })
  mkdirSync(AUDIO_STAGING_DIR, { recursive: true })
  for (const { filename, bytes } of audioEntries) {
    writeFileSync(join(AUDIO_STAGING_DIR, filename), bytes)
  }
}

function swapAudioDirs(): void {
  if (existsSync(AUDIO_DIR)) rmSync(AUDIO_DIR, { recursive: true, force: true })
  renameSync(AUDIO_STAGING_DIR, AUDIO_DIR)
}

const app = new Hono()

app.post('/', async (c) => {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return c.json({ error: 'Missing "file" field in form data' }, 400)
  }

  if (file.size > MAX_RESTORE_SIZE) {
    return c.json({ error: 'Backup file too large (max 500MB)' }, 413)
  }

  let extracted: ExtractedBackup
  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    extracted = validateAndExtract(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[restore] ZIP validation failed:', message)
    return c.json({ error: `Invalid backup file: ${message}` }, 422)
  }

  try {
    stageAudioFiles(extracted.audioEntries)
    writeFileSync(TMP_DB_PATH, extracted.dbBytes)
    reconnectDb(TMP_DB_PATH)
    if (existsSync(TMP_DB_PATH)) unlinkSync(TMP_DB_PATH)
    swapAudioDirs()
  } catch (err) {
    if (existsSync(AUDIO_STAGING_DIR)) rmSync(AUDIO_STAGING_DIR, { recursive: true, force: true })
    if (existsSync(TMP_DB_PATH)) unlinkSync(TMP_DB_PATH)
    const message = err instanceof Error ? err.message : String(err)
    console.error('[restore] Restore operation failed:', message)
    return c.json({ error: `Restore failed: ${message}` }, 500)
  }

  return c.json({ settings: extracted.settings })
})

export default app
