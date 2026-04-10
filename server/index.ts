import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sessionMiddleware, CookieStore } from 'hono-sessions'
import type { Session } from 'hono-sessions'
import './db/index.js'
import { seedDevData } from './db/seed.js'
import cardsRoute from './routes/cards.js'
import decksRoute from './routes/decks.js'
import tagsRoute from './routes/tags.js'
import generateCardContent from './routes/generate-card-content.js'
import generateAudio from './routes/generate-audio.js'
import importMochi from './routes/import-mochi.js'
import audioBackfill from './routes/audio-backfill.js'
import authRoute from './routes/auth.js'

const PORT = 3000
const ENCRYPTION_KEY_LENGTH = 32

type SessionData = { authenticated: boolean }

type AppVariables = {
  session: Session<SessionData>
  session_key_rotation: boolean
}

function getEncryptionKey(): string {
  const password = process.env.APP_PASSWORD ?? ''
  // Pad or truncate to exactly 32 chars as required by CookieStore
  return password.padEnd(ENCRYPTION_KEY_LENGTH, '0').slice(0, ENCRYPTION_KEY_LENGTH)
}

const store = new CookieStore()

const app = new Hono<{ Variables: AppVariables }>()

// Allow requests from the Vite dev server during development
app.use(cors())

app.use(sessionMiddleware({
  store,
  encryptionKey: getEncryptionKey(),
  expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days
  cookieOptions: {
    sameSite: 'Lax',
    path: '/',
    httpOnly: true,
  },
}))

app.route('/api/auth', authRoute)

app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/')) {
    return next()
  }
  const session = c.get('session')
  if (!session.get('authenticated')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
})

app.route('/api/cards', cardsRoute)
app.route('/api/decks', decksRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/generate-card-content', generateCardContent)
app.route('/api/generate-audio', generateAudio)
app.route('/api/import/mochi', importMochi)
app.route('/api/audio/backfill', audioBackfill)

if (process.env.NODE_ENV !== 'production') {
  seedDevData()
}

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server listening on port ${PORT}`)
})
