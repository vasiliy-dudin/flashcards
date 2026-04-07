// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../storage/audioStore.js', () => ({
  saveAudio: vi.fn().mockResolvedValue('/audio/test.mp3'),
}))

import { generateAudio } from './tts.js'

describe('generateAudio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.GOOGLE_TTS_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_TTS_API_KEY
  })

  it('returns degraded when API key is missing', async () => {
    delete process.env.GOOGLE_TTS_API_KEY
    const result = await generateAudio('hello')
    expect(result).toMatchObject({ degraded: true, error: expect.any(String) })
  })

  it('returns audioUrl on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ audioContent: 'base64data' }),
    } as Response)

    const result = await generateAudio('hello')
    expect(result).toEqual({ audioUrl: '/audio/test.mp3' })
  })

  it('returns degraded with specific message on 429 quota exceeded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response)

    const result = await generateAudio('hello')
    expect(result).toMatchObject({ degraded: true, error: 'TTS quota exceeded' })
  })

  it('returns degraded on other API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)

    const result = await generateAudio('hello')
    expect(result).toMatchObject({ degraded: true, error: expect.stringContaining('500') })
  })
})
