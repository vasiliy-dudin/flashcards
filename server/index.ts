import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import generateExamples from './routes/generate-examples.js'
import generateAudio from './routes/generate-audio.js'

const PORT = 3000

const app = new Hono()

app.route('/api/generate-examples', generateExamples)
app.route('/api/generate-audio', generateAudio)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server listening on port ${PORT}`)
})
