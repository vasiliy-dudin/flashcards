import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolved relative to this file so the path is stable regardless of CWD
const AUDIO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/audio')
const AUDIO_URL_PREFIX = '/audio'

/** Saves base64-encoded MP3 data to disk and returns its public URL path. */
export async function saveAudio(filename: string, base64Data: string): Promise<string> {
  await mkdir(AUDIO_DIR, { recursive: true })
  const buffer = Buffer.from(base64Data, 'base64')
  await writeFile(join(AUDIO_DIR, filename), buffer)
  return `${AUDIO_URL_PREFIX}/${filename}`
}
