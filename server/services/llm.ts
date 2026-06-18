const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODEL = 'gemini-2.0-flash'

export interface LlmResponse {
  dictionary: { transcription: string; meanings: string[] }
  aiExample: string
}

export class LlmHttpError extends Error {
  readonly status: number

  constructor(status: number, statusText: string) {
    super(`Gemini API error: ${status} ${statusText}`)
    this.name = 'LlmHttpError'
    this.status = status
  }
}

export interface LlmProvider {
  generateCardContent(word: string, customPrompt?: string): Promise<LlmResponse>
  generateCardContentBatch(words: string[], customPrompt?: string): Promise<Map<string, LlmResponse>>
}

interface GeminiApiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    dictionary: {
      type: 'object',
      properties: {
        transcription: { type: 'string' },
        meanings: { type: 'array', items: { type: 'string' } },
      },
      required: ['transcription', 'meanings'],
    },
    aiExample: { type: 'string' },
  },
  required: ['dictionary', 'aiExample'],
}

function buildPrompt(word: string, customPrompt?: string): string {
  const base =
    `You are a British English dictionary. For the word or phrase "${word}", return:\n` +
    `1. "dictionary": IPA transcription and the 2-4 most common meanings as short numbered phrases.\n` +
    `2. "aiExample": one natural example sentence in British English.\n` +
    `Keep meanings concise (under 10 words each). Use British English spelling.`
  return customPrompt ? `${base}\n\nAdditional instructions: ${customPrompt}` : base
}

interface BatchLlmResponseItem extends LlmResponse {
  word: string
}

const BATCH_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      word: { type: 'string' },
      dictionary: RESPONSE_SCHEMA.properties.dictionary,
      aiExample: { type: 'string' },
    },
    required: ['word', 'dictionary', 'aiExample'],
  },
}

function buildBatchPrompt(words: string[], customPrompt?: string): string {
  const wordList = words.map((word, index) => `${index + 1}. "${word}"`).join('\n')
  const base =
    `You are a British English dictionary. For each of the following words or phrases, return:\n` +
    `1. "dictionary": IPA transcription and the 2-4 most common meanings as short numbered phrases.\n` +
    `2. "aiExample": one natural example sentence in British English.\n` +
    `Keep meanings concise (under 10 words each). Use British English spelling.\n\n` +
    `Words:\n${wordList}\n\n` +
    `Return a JSON array with exactly one entry per word, each including the original "word" field exactly as given.`
  return customPrompt ? `${base}\n\nAdditional instructions: ${customPrompt}` : base
}

function isGeminiApiResponse(data: unknown): data is GeminiApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'candidates' in data &&
    Array.isArray((data as { candidates: unknown }).candidates) &&
    typeof (data as GeminiApiResponse).candidates[0]?.content?.parts?.[0]?.text === 'string'
  )
}

function extractText(data: unknown): string {
  if (!isGeminiApiResponse(data)) {
    throw new Error('Unexpected Gemini API response shape')
  }
  return data.candidates[0].content.parts[0].text
}

export class GeminiProvider implements LlmProvider {
  private readonly apiKey: string
  private readonly model: string

  constructor(apiKey: string, model = GEMINI_MODEL) {
    this.apiKey = apiKey
    this.model = model
  }

  async generateCardContent(word: string, customPrompt?: string): Promise<LlmResponse> {
    const url = `${GEMINI_ENDPOINT}/${this.model}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(word, customPrompt) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      }),
    })

    if (!response.ok) {
      throw new LlmHttpError(response.status, response.statusText)
    }

    const data: unknown = await response.json()
    return JSON.parse(extractText(data)) as LlmResponse
  }

  async generateCardContentBatch(words: string[], customPrompt?: string): Promise<Map<string, LlmResponse>> {
    const url = `${GEMINI_ENDPOINT}/${this.model}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildBatchPrompt(words, customPrompt) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: BATCH_RESPONSE_SCHEMA,
        },
      }),
    })

    if (!response.ok) {
      throw new LlmHttpError(response.status, response.statusText)
    }

    const data: unknown = await response.json()
    const items = JSON.parse(extractText(data)) as BatchLlmResponseItem[]
    // If the model echoes the same word twice, the later entry wins; duplicates aren't expected in practice.
    return new Map(items.map((item) => [item.word, { dictionary: item.dictionary, aiExample: item.aiExample }]))
  }
}

export function createLlmProvider(): LlmProvider {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  const model = process.env.GEMINI_MODEL ?? GEMINI_MODEL
  return new GeminiProvider(apiKey, model)
}
