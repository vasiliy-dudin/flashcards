import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import './db/index.js'
import cardsRoute from './routes/cards.js'
import generateExamples from './routes/generate-examples.js'
import generateAudio from './routes/generate-audio.js'

const PORT = 3000

const app = new Hono()

// Allow requests from the Vite dev server during development
app.use(cors())

app.route('/api/cards', cardsRoute)
app.route('/api/generate-examples', generateExamples)
app.route('/api/generate-audio', generateAudio)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server listening on port ${PORT}`)
})
