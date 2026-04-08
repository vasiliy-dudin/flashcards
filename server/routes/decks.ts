import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { decks, cards } from '../db/schema.js'

type DeckInsert = typeof decks.$inferInsert

const REQUIRED_FIELDS = ['id', 'name', 'createdAt'] as const

function isDeckBody(value: unknown): value is DeckInsert {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return REQUIRED_FIELDS.every(field => field in obj)
}

function isRenameBody(value: unknown): value is { name: string } {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj['name'] === 'string' && obj['name'].trim().length > 0
}

const app = new Hono()

app.get('/', (c) => {
  const rows = db.select().from(decks).all()
  return c.json(rows)
})

app.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!isDeckBody(body)) {
    return c.json({ error: 'Missing required deck fields' }, 400)
  }
  const [row] = db.insert(decks).values(body).returning().all()
  return c.json(row, 201)
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!isRenameBody(body)) {
    return c.json({ error: 'name is required and must be a non-empty string' }, 400)
  }
  const [row] = db.update(decks).set({ name: body.name.trim() }).where(eq(decks.id, id)).returning().all()
  if (!row) return c.json({ error: 'Deck not found' }, 404)
  return c.json(row)
})

app.delete('/:id', (c) => {
  const id = c.req.param('id')
  const result = db.transaction(() => {
    db.delete(cards).where(eq(cards.deckId, id)).run()
    return db.delete(decks).where(eq(decks.id, id)).returning().all()
  })
  if (result.length === 0) return c.json({ error: 'Deck not found' }, 404)
  return new Response(null, { status: 204 })
})

export default app
