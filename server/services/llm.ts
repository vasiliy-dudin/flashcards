const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODEL = 'gemini-2.0-flash'

export interface LlmResponse {
  definition: string
  examples: string[]
  usageNotes: string
}

export interface LlmProvider {
  generateExamples(word: string): Promise<LlmResponse>
}

interface GeminiApiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    definition: { type: 'string' },
    examples: { type: 'array', items: { type: 'string' } },
    usageNotes: { type: 'string' },
  },
  required: ['definition', 'examples', 'usageNotes'],
}

function buildPrompt(word: string): string {
  return (
    `You are an English vocabulary teacher. For the word or phrase "${word}", provide ` +
    `a clear definition, three example sentences, and brief usage notes (register, ` +
    `collocations, common mistakes). Use British English.`
  )
}

function extractText(data: unknown): string {
  const response = data as GeminiApiResponse
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') {
    throw new Error('Unexpected Gemini API response shape')
  }
  return text
}

export class GeminiProvider implements LlmProvider {
  private readonly apiKey: string
  private readonly model: string

  constructor(apiKey: string, model = GEMINI_MODEL) {
    this.apiKey = apiKey
    this.model = model
  }

  async generateExamples(word: string): Promise<LlmResponse> {
    const url = `${GEMINI_ENDPOINT}/${this.model}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(word) }] }],
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
