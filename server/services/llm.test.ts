// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiProvider, createLlmProvider, LlmHttpError } from './llm.js'

const MOCK_WORD = 'serendipity'

const MOCK_LLM_RESPONSE = {
  dictionary: {
    transcription: '/ˌser.ənˈdɪp.ɪ.ti/',
    meanings: ['The occurrence of happy events by chance.', 'A fortunate discovery made accidentally.'],
  },
  aiExample: 'It was pure serendipity that we met at the conference.',
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

    await new GeminiProvider('test-key').generateCardContent(MOCK_WORD)

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

    const result = await new GeminiProvider('test-key').generateCardContent(MOCK_WORD)

    expect(result).toEqual(MOCK_LLM_RESPONSE)
  })

  it('throws when candidates array is empty', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    } as Response)

    await expect(new GeminiProvider('test-key').generateCardContent(MOCK_WORD)).rejects.toThrow(
      'Unexpected Gemini API response shape',
    )
  })

  it('throws when response has no candidates field', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'something went wrong' }),
    } as Response)

    await expect(new GeminiProvider('test-key').generateCardContent(MOCK_WORD)).rejects.toThrow(
      'Unexpected Gemini API response shape',
    )
  })

  it('throws on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response)

    await expect(new GeminiProvider('test-key').generateCardContent(MOCK_WORD)).rejects.toThrow(
      'Gemini API error: 429',
    )
  })

  it('throws an LlmHttpError carrying the HTTP status code on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response)

    const error = await new GeminiProvider('test-key').generateCardContent(MOCK_WORD).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LlmHttpError)
    expect((error as LlmHttpError).status).toBe(503)
  })
})

const MOCK_BATCH_ITEMS = [
  { word: 'serendipity', dictionary: MOCK_LLM_RESPONSE.dictionary, aiExample: MOCK_LLM_RESPONSE.aiExample },
  {
    word: 'ubiquitous',
    dictionary: { transcription: '/juːˈbɪkwɪtəs/', meanings: ['Present, appearing, or found everywhere.'] },
    aiExample: 'Smartphones have become ubiquitous in modern life.',
  },
  {
    word: 'ephemeral',
    dictionary: { transcription: '/ɪˈfemərəl/', meanings: ['Lasting for a very short time.'] },
    aiExample: 'Fashion trends are often ephemeral.',
  },
]

const MOCK_BATCH_GEMINI_RESPONSE = {
  candidates: [{ content: { parts: [{ text: JSON.stringify(MOCK_BATCH_ITEMS) }] } }],
}

describe('GeminiProvider.generateCardContentBatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a map keyed by word for a batch of words', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_BATCH_GEMINI_RESPONSE,
    } as Response)

    const result = await new GeminiProvider('test-key').generateCardContentBatch([
      'serendipity',
      'ubiquitous',
      'ephemeral',
    ])

    expect(result.size).toBe(3)
    expect(result.get('serendipity')).toEqual(MOCK_LLM_RESPONSE)
    expect(result.get('ubiquitous')?.aiExample).toBe('Smartphones have become ubiquitous in modern life.')
  })

  it('sends a single POST request for the whole batch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_BATCH_GEMINI_RESPONSE,
    } as Response)

    await new GeminiProvider('test-key').generateCardContentBatch(['serendipity', 'ubiquitous', 'ephemeral'])

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('createLlmProvider', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_GEMINI_RESPONSE } as Response))
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('throws when GEMINI_API_KEY is not set', () => {
    delete process.env.GEMINI_API_KEY
    expect(() => createLlmProvider()).toThrow('GEMINI_API_KEY environment variable is not set')
  })

  it('uses GEMINI_MODEL from env when set', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_MODEL = 'gemma-4-31b-it'

    await createLlmProvider().generateCardContent(MOCK_WORD)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('gemma-4-31b-it:generateContent'), expect.anything())
  })

  it('falls back to the default model when GEMINI_MODEL is unset', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.GEMINI_MODEL

    await createLlmProvider().generateCardContent(MOCK_WORD)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('gemini-2.0-flash:generateContent'), expect.anything())
  })
})
