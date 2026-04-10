import { Hono } from 'hono'
import { unzipSync, strFromU8 } from 'fflate'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '../db/index.js'
import { cards, decks } from '../db/schema.js'
import { mochiCardToCard } from '../utils/mochi-import.js'
import type { MochiData, MochiCard } from '../utils/mochi-import.js'
import { generateAudio } from '../services/tts.js'

const DATA_JSON_FILENAME = 'data.json'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Extracts, parses, and validates data.json from a ZIP buffer. */
function extractMochiData(buffer: ArrayBuffer): MochiData {
  const unzipped = unzipSync(new Uint8Array(buffer))
  const entry = Object.entries(unzipped).find(([name]) => name === DATA_JSON_FILENAME)
  if (!entry) throw new Error('data.json not found in ZIP archive')

  const raw = JSON.parse(strFromU8(entry[1])) as unknown
  if (
    typeof raw !== 'object' || raw === null ||
    !Array.isArray((raw as Record<string, unknown>)['~:decks'])
  ) {
    throw new Error('data.json does not look like a valid Mochi export')
  }
  return raw as MochiData
}

/**
 * Returns the app-local deck ID for a Mochi deck name.
 * Uses INSERT OR IGNORE pattern via onConflictDoNothing to avoid TOCTOU issues.
 */
function getOrCreateDeck(deckName: string): string {
  return db.transaction(() => {
    const existing = db.select({ id: decks.id }).from(decks).where(eq(decks.name, deckName)).all()
    if (existing[0]) return existing[0].id
    const newId = randomUUID()
    db.insert(decks).values({ id: newId, name: deckName, parentId: null, createdAt: new Date().toISOString() }).run()
    return newId
  })
}

interface InsertedCard {
  id: string
  word: string
}

function insertCard(mochiCard: MochiCard, deckId: string, today: string): InsertedCard | null {
  const duplicate = db.select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.word, mochiCard['~:name']), eq(cards.deckId, deckId)))
    .all()

  if (duplicate.length > 0) return null

  const card = mochiCardToCard(mochiCard, deckId, randomUUID(), today)
  try {
    db.insert(cards).values(card).run()
    return { id: card.id, word: card.word }
  } catch (err) {
    console.error('[import-mochi] Card insert failed:', mochiCard['~:name'], err)
    return null
  }
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

  let mochiData: MochiData
  try {
    mochiData = extractMochiData(await file.arrayBuffer())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[import-mochi] ZIP extraction failed:', message)
    return c.json({ error: `Failed to read ZIP: ${message}` }, 422)
  }

  let imported = 0
  let skipped = 0
  const today = todayIso()
  const insertedCards: InsertedCard[] = []

  for (const mochiDeck of mochiData['~:decks']) {
    const deckId = getOrCreateDeck(mochiDeck['~:name'])
    const mochiCards = mochiDeck['~:cards']['~#list']

    for (const mochiCard of mochiCards) {
      const result = insertCard(mochiCard, deckId, today)
      if (result !== null) {
        insertedCards.push(result)
        imported++
      } else {
        skipped++
      }
    }
  }

  for (const card of insertedCards) {
    generateAudio(card.word).then((result) => {
      if ('degraded' in result) {
        console.error(`[import-mochi] Background audio failed for "${card.word}":`, result.error)
      } else {
        db.update(cards).set({ audioUrl: result.audioUrl }).where(eq(cards.id, card.id)).run()
      }
    }).catch((err: unknown) => {
      console.error('[import-mochi] Background audio threw:', err)
    })
  }

  return c.json({ imported, skipped })
})

export default app
