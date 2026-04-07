// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiProvider } from './llm.js'

const MOCK_WORD = 'serendipity'

const MOCK_LLM_RESPONSE = {
  definition: 'The occurrence of happy events by chance.',
  examples: ['It was pure serendipity that we met.'],
  usageNotes: 'Formal register, typically used in written English.',
}

const MOCK_GEMINI_RESPONSE = {
  candidates: [{ content: { parts: [{ text: JSON.stringify(MOCK_LLM_RESPONSE) }] } }],
}

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends POST to the correct Gemini endpoint with API key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_GEMINI_RESPONSE,
    } as Response)

    await new GeminiProvider('test-key').generateExamples(MOCK_WORD)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.0-flash:generateContent'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-goog-api-key': 'test-key' }),
      }),
    )
  })

  it('parses Gemini response into LlmResponse shape', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_GEMINI_RESPONSE,
    } as Response)

    const result = await new GeminiProvider('test-key').generateExamples(MOCK_WORD)

    expect(result).toEqual(MOCK_LLM_RESPONSE)
  })

  it('throws on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response)

    await expect(new GeminiProvider('test-key').generateExamples(MOCK_WORD)).rejects.toThrow(
      'Gemini API error: 429',
    )
  })
})
