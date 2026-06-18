import { Hono } from 'hono'
import { generationQueue } from '../services/generationQueue.js'

const app = new Hono()

app.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Request body must be a JSON object' }, 400)
  }
  const bodyObj = body as Record<string, unknown>
  if (typeof bodyObj.word !== 'string') {
    return c.json({ error: 'Request body must include a "word" string field' }, 400)
  }

  const word = bodyObj.word.trim()
  if (!word) {
    return c.json({ error: '"word" must not be empty' }, 400)
  }

  const customPrompt = typeof bodyObj.customPrompt === 'string' ? bodyObj.customPrompt.trim() : undefined

  try {
    const result = await generationQueue.enqueue(word, customPrompt)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Content generation failed'
    console.error('[generate-card-content] Error:', message)
    return c.json({ error: message }, 503)
  }
})

export default app
