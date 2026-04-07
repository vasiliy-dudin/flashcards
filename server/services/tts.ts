import { saveAudio } from '../storage/audioStore.js'

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const TTS_VOICE_NAME = 'en-GB-Neural2-B'
const TTS_LANGUAGE_CODE = 'en-GB'

export interface TtsSuccess {
  audioUrl: string
}

export interface TtsError {
  error: string
  degraded: true
}

export type TtsResult = TtsSuccess | TtsError

interface TtsApiResponse {
  audioContent: string
}

function generateFilename(word: string): string {
  const slug = word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `${slug || 'audio'}-${Date.now()}.mp3`
}

function isTtsApiResponse(data: unknown): data is TtsApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'audioContent' in data &&
    typeof (data as TtsApiResponse).audioContent === 'string'
  )
}

function extractAudioContent(data: unknown): string {
  if (!isTtsApiResponse(data)) {
    throw new Error('Unexpected TTS API response shape')
  }
  return data.audioContent
}

export async function generateAudio(word: string): Promise<TtsResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return { error: 'GOOGLE_TTS_API_KEY is not set', degraded: true }
  }

  try {
    const response = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: word },
        voice: { languageCode: TTS_LANGUAGE_CODE, name: TTS_VOICE_NAME },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    })

    if (!response.ok) {
      const message =
        response.status === 429 ? 'TTS quota exceeded' : `TTS API error: ${response.status}`
      return { error: message, degraded: true }
    }

    const data: unknown = await response.json()
    const audioUrl = await saveAudio(generateFilename(word), extractAudioContent(data))
    return { audioUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TTS error'
    return { error: message, degraded: true }
  }
}
