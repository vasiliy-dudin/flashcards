import { Hono } from 'hono'
import { isNull, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { cards } from '../db/schema.js'
import { generateAudio } from '../services/tts.js'

const app = new Hono()

app.post('/', async (c) => {
  const pending = db.select({ id: cards.id, word: cards.word })
    .from(cards)
    .where(isNull(cards.audioUrl))
    .all()

  let filled = 0
  let failed = 0

  for (const card of pending) {
    const result = await generateAudio(card.word)
    if ('degraded' in result) {
      console.error(`[audio-backfill] Failed for "${card.word}":`, result.error)
      failed++
    } else {
      db.update(cards).set({ audioUrl: result.audioUrl }).where(eq(cards.id, card.id)).run()
      filled++
    }
  }

  return c.json({ filled, failed })
})

export default app
