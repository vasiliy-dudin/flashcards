import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import './db/index.js'
import { seedDevData } from './db/seed.js'
import cardsRoute from './routes/cards.js'
import decksRoute from './routes/decks.js'
import tagsRoute from './routes/tags.js'
import generateCardContent from './routes/generate-card-content.js'
import generateAudio from './routes/generate-audio.js'

const PORT = 3000

const app = new Hono()

// Allow requests from the Vite dev server during development
app.use(cors())

app.route('/api/cards', cardsRoute)
app.route('/api/decks', decksRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/generate-card-content', generateCardContent)
app.route('/api/generate-audio', generateAudio)

if (process.env.NODE_ENV !== 'production') {
  seedDevData()
}

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server listening on port ${PORT}`)
})
