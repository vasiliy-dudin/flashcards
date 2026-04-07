// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './generate-audio.js'

vi.mock('../services/tts.js', () => ({
  generateAudio: vi.fn(),
}))

import { generateAudio } from '../services/tts.js'

describe('POST /api/generate-audio', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when word field is missing', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string }
    expect(json.error).toMatch(/word/)
  })

  it('returns 400 when word is empty after trim', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: '  ' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 503 when TTS result is degraded', async () => {
    vi.mocked(generateAudio).mockResolvedValue({
      error: 'GOOGLE_TTS_API_KEY is not set',
      degraded: true,
    })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(503)
    const json = await res.json() as { error: string }
    expect(json.error).toContain('GOOGLE_TTS_API_KEY')
  })

  it('returns 200 with audioUrl on success', async () => {
    vi.mocked(generateAudio).mockResolvedValue({
      audioUrl: '/audio/ephemeral-123.mp3',
    })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json() as { audioUrl: string }
    expect(json.audioUrl).toBe('/audio/ephemeral-123.mp3')
  })
})
