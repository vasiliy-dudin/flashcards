import { Hono } from 'hono'
import { db } from '../db/index.js'
import { decks } from '../db/schema.js'

type DeckInsert = typeof decks.$inferInsert

const REQUIRED_FIELDS = ['id', 'name', 'createdAt'] as const

function isDeckBody(value: unknown): value is DeckInsert {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return REQUIRED_FIELDS.every(field => field in obj)
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
  const [row] = db.insert(decks).values(body).returning()
  return c.json(row, 201)
})

export default app
