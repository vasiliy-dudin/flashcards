import { Hono } from 'hono'
import { db } from '../db/index.js'
import { tags } from '../db/schema.js'

const app = new Hono()

app.get('/', (c) => {
  const rows = db.select().from(tags).all()
  return c.json(rows)
})

export default app
