// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './generate-card-content.js'

vi.mock('../services/llm.js', () => ({
  createLlmProvider: vi.fn(),
}))

import { createLlmProvider } from '../services/llm.js'

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

  it('returns 503 when LLM provider throws (e.g. missing API key)', async () => {
    vi.mocked(createLlmProvider).mockImplementation(() => {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    })

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
    vi.mocked(createLlmProvider).mockReturnValue({
      generateCardContent: vi.fn().mockResolvedValue(MOCK_RESULT),
    })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(MOCK_RESULT)
  })

  it('returns 503 when generateCardContent rejects (network error)', async () => {
    vi.mocked(createLlmProvider).mockReturnValue({
      generateCardContent: vi.fn().mockRejectedValue(new Error('Network timeout')),
    })

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral' }),
    })
    expect(res.status).toBe(503)
  })
})
