import { Hono } from 'hono'
import { generateAudio } from '../services/tts.js'

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

  const result = await generateAudio(word)

  if ('degraded' in result) {
    console.error('[generate-audio] Degraded:', result.error)
    return c.json({ error: result.error }, 503)
  }

  return c.json({ audioUrl: result.audioUrl })
})

export default app
