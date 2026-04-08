import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

interface TagRow {
  name: string
  cardCount: number
}

const app = new Hono()

app.get('/', (c) => {
  // Derive tags from card data — avoids a separate tags table that can drift out of sync
  const rows = db.all(sql`
    SELECT value as name, COUNT(*) as cardCount
    FROM cards, json_each(cards.tags)
    GROUP BY value
    ORDER BY value
  `) as TagRow[]
  return c.json(rows)
})

export default app
