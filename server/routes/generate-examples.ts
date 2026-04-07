import { Hono } from 'hono'
import { createLlmProvider } from '../services/llm.js'

const app = new Hono()

app.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).word !== 'string') {
    return c.json({ error: 'Request body must include a "word" string field' }, 400)
  }

  const word = (body as Record<string, string>).word.trim()
  if (!word) {
    return c.json({ error: '"word" must not be empty' }, 400)
  }

  try {
    const provider = createLlmProvider()
    const result = await provider.generateExamples(word)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Content generation failed'
    console.error('[generate-examples] Error:', message)
    return c.json({ error: message }, 503)
  }
})

export default app
