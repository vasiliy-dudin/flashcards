import { saveAudio } from '../storage/audioStore.js'

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const TTS_LANGUAGE_CODE = 'en-GB'
const TTS_VOICE_NAMES = [
  'en-GB-Chirp3-HD-Achernar',
  'en-GB-Chirp3-HD-Achird',
  'en-GB-Chirp3-HD-Algenib',
  'en-GB-Chirp3-HD-Algieba',
  'en-GB-Chirp3-HD-Alnilam',
  'en-GB-Chirp3-HD-Aoede',
  'en-GB-Chirp3-HD-Autonoe',
  'en-GB-Chirp3-HD-Callirrhoe',
  'en-GB-Chirp3-HD-Charon',
  'en-GB-Chirp3-HD-Despina',
  'en-GB-Chirp3-HD-Enceladus',
  'en-GB-Chirp3-HD-Erinome',
  'en-GB-Chirp3-HD-Fenrir',
  'en-GB-Chirp3-HD-Gacrux',
  'en-GB-Chirp3-HD-Iapetus',
  'en-GB-Chirp3-HD-Kore',
  'en-GB-Chirp3-HD-Laomedeia',
  'en-GB-Chirp3-HD-Leda',
  'en-GB-Chirp3-HD-Orus',
  'en-GB-Chirp3-HD-Pulcherrima',
  'en-GB-Chirp3-HD-Puck',
  'en-GB-Chirp3-HD-Rasalgethi',
  'en-GB-Chirp3-HD-Sadachbia',
  'en-GB-Chirp3-HD-Sadaltager',
  'en-GB-Chirp3-HD-Schedar',
  'en-GB-Chirp3-HD-Sulafat',
  'en-GB-Chirp3-HD-Umbriel',
  'en-GB-Chirp3-HD-Vindemiatrix',
  'en-GB-Chirp3-HD-Zephyr',
  'en-GB-Chirp3-HD-Zubenelgenubi',
  'en-GB-Neural2-A',
  'en-GB-Neural2-B',
  'en-GB-Neural2-C',
  'en-GB-Neural2-D',
  'en-GB-Neural2-F',
  'en-GB-Neural2-N',
  'en-GB-Neural2-O',
] as const

function pickRandomVoice(): string {
  return TTS_VOICE_NAMES[Math.floor(Math.random() * TTS_VOICE_NAMES.length)]
}

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
        voice: { languageCode: TTS_LANGUAGE_CODE, name: pickRandomVoice() },
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
