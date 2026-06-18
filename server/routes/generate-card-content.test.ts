// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './generate-card-content.js'

vi.mock('../services/generationQueue.js', () => ({
  generationQueue: { enqueue: vi.fn() },
}))

import { generationQueue } from '../services/generationQueue.js'

const MOCK_RESULT = {
  dictionary: {
    transcription: '/ɪˈfem.ər.əl/',
    meanings: ['Lasting for a very short time.', 'Transitory; short-lived.'],
  },
  aiExample: 'Social media trends are ephemeral by nature.',
}

describe('POST /api/generate-card-content', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when body is missing word field', async () => {
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
      body: JSON.stringify({ word: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 503 when the queue rejects (e.g. missing API key)', async () => {
    vi.mocked(generationQueue.enqueue).mockRejectedValue(
      new Error('GEMINI_API_KEY environment variable is not set'),
    )

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(503)
    const json = await res.json() as { error: string }
    expect(json.error).toContain('GEMINI_API_KEY')
  })

  it('returns 200 with LlmResponse on success', async () => {
    vi.mocked(generationQueue.enqueue).mockResolvedValue(MOCK_RESULT)

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(MOCK_RESULT)
    expect(generationQueue.enqueue).toHaveBeenCalledWith('ephemeral', undefined)
  })

  it('returns 503 when the queue rejects (network error)', async () => {
    vi.mocked(generationQueue.enqueue).mockRejectedValue(new Error('Network timeout'))

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(503)
  })

  it('returns 503 with a distinct message when the daily generation cap is reached', async () => {
    vi.mocked(generationQueue.enqueue).mockRejectedValue(new Error('Daily generation limit reached'))

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(503)
    const json = await res.json() as { error: string }
    expect(json.error).toBe('Daily generation limit reached')
  })
})
