import type { Card } from '../../src/types'

// Transit-encoded JSON types matching Mochi Cards data.json export format

interface MochiFieldValue {
  '~:id': string
  '~:value': string
}

interface MochiReview {
  '~:date': string // "~t{ms}" format, e.g. "~t1704067200000"
  '~:interval'?: number // absent on the very first review
  '~:remembered?': boolean
}

export interface MochiCard {
  '~:name': string
  '~:fields': Record<string, MochiFieldValue>
  '~:tags'?: { '~#set': string[] }
  '~:reviews'?: MochiReview[]
  '~:created-at'?: { '~#dt': number }
  '~:deck-id': string
}

export interface MochiDeck {
  '~:name': string
  '~:id': string
  '~:cards': { '~#list': MochiCard[] }
}

export interface MochiData {
  '~:decks': MochiDeck[]
}

const FALLBACK_INTERVAL = 1

// The word field key in the Mochi template — always "~:name"
const WORD_FIELD_KEY = '~:name'

/** Parses a Transit timestamp string "~t{ms}" to a Date. */
function parseTransitDate(transitDate: string): Date {
  const ms = parseInt(transitDate.slice(2), 10)
  return new Date(ms)
}

/** Formats a Date to YYYY-MM-DD. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Adds `days` days to a Date and returns a new Date. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Extracts the definition string from Mochi fields.
 * Skips the word field ("~:name") and returns the first non-empty remaining value.
 */
function extractDefinition(fields: Record<string, MochiFieldValue>): string {
  for (const [key, field] of Object.entries(fields)) {
    if (key === WORD_FIELD_KEY) continue
    if (field['~:value'].trim()) return field['~:value'].trim()
  }
  return ''
}

/**
 * Returns the last review that has an interval value.
 * The first review in Mochi has no interval — only subsequent ones do.
 */
function lastReviewWithInterval(reviews: MochiReview[]): MochiReview | undefined {
  return [...reviews].reverse().find(r => r['~:interval'] !== undefined)
}

/**
 * Maps a single MochiCard to the app's Card type.
 * Scheduling: uses the last review with an interval to compute dueDate.
 * Cards with no reviews (or only a first review) get interval=1 and dueDate=today.
 */
export function mochiCardToCard(
  mochiCard: MochiCard,
  deckId: string,
  cardId: string,
  today: string = toIsoDate(new Date()),
): Omit<Card, 'audioUrl'> & { audioUrl: null } {
  const reviews = mochiCard['~:reviews'] ?? []
  const lastReview = lastReviewWithInterval(reviews)

  const rawInterval = lastReview?.['~:interval'] ?? FALLBACK_INTERVAL
  const interval = Math.max(1, Math.round(rawInterval))

  const dueDate = lastReview
    ? toIsoDate(addDays(parseTransitDate(lastReview['~:date']), interval))
    : today

  const createdAtMs = mochiCard['~:created-at']?.['~#dt']
  const createdAt = createdAtMs
    ? new Date(createdAtMs).toISOString()
    : new Date().toISOString()

  const tags = mochiCard['~:tags']?.['~#set'] ?? []

  return {
    id: cardId,
    word: mochiCard['~:name'],
    definition: extractDefinition(mochiCard['~:fields']),
    examples: [],
    dictionary: { transcription: '', meanings: [] },
    aiExample: '',
    audioUrl: null,
    deckId,
    tags,
    interval,
    dueDate,
    createdAt,
    inReview: true,
    archived: false,
  }
}
