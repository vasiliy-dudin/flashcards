import { Hono } from 'hono'
import type { Session } from 'hono-sessions'

type SessionData = { authenticated: boolean }

type AppVariables = {
  session: Session<SessionData>
  session_key_rotation: boolean
}

const app = new Hono<{ Variables: AppVariables }>()

app.post('/login', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).password !== 'string') {
    return c.json({ error: 'Request body must include a "password" string field' }, 400)
  }

  const submitted = (body as Record<string, string>).password
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    console.error('[auth] APP_PASSWORD is not set')
    return c.json({ error: 'Server misconfiguration' }, 500)
  }

  if (submitted !== expected) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const session = c.get('session')
  session.set('authenticated', true)
  return c.json({ ok: true })
})

app.post('/logout', (c) => {
  const session = c.get('session')
  session.set('authenticated', false)
  return c.json({ ok: true })
})

export default app
