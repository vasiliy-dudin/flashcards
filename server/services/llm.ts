const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODEL = 'gemini-2.0-flash'

export interface LlmResponse {
  dictionary: { transcription: string; meanings: string[] }
  aiExample: string
}

export interface LlmProvider {
  generateCardContent(word: string, customPrompt?: string): Promise<LlmResponse>
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
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data: unknown = await response.json()
    return JSON.parse(extractText(data)) as LlmResponse
  }
}

export function createLlmProvider(): LlmProvider {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  return new GeminiProvider(apiKey)
}
