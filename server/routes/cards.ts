import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { cards } from '../db/schema.js'

type CardInsert = typeof cards.$inferInsert

const REQUIRED_FIELDS = [
  'id', 'word', 'definition', 'examples', 'dictionary', 'aiExample',
  'deckId', 'tags', 'interval', 'dueDate', 'createdAt',
] as const

function isCardBody(value: unknown): value is CardInsert {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return REQUIRED_FIELDS.every(field => field in obj)
}

const app = new Hono()

app.get('/', (c) => {
  const rows = db.select().from(cards).all()
  return c.json(rows)
})

app.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (!isCardBody(body)) {
    return c.json({ error: 'Missing required card fields' }, 400)
  }
  try {
    const [row] = db.insert(cards).values(body).returning().all()
    return c.json(row, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cards] POST insert failed:', message)
    return c.json({ error: `DB insert failed: ${message}` }, 500)
  }
})

app.put('/:id', async (c) => {
  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Patch must be an object' }, 400)
  }
  const patch = body as Partial<CardInsert>
  try {
    const [row] = db.update(cards).set(patch).where(eq(cards.id, id)).returning().all()
    if (row === undefined) return c.json({ error: 'Card not found' }, 404)
    return c.json(row)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cards] PUT update failed:', message)
    return c.json({ error: `DB update failed: ${message}` }, 500)
  }
})

app.delete('/:id', (c) => {
  const id = c.req.param('id')
  const [row] = db.delete(cards).where(eq(cards.id, id)).returning().all()
  if (row === undefined) return c.json({ error: 'Card not found' }, 404)
  return c.body(null, 204)
})

export default app
