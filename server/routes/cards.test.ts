// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { cards } from '../db/schema.js'
import app from './cards.js'

vi.mock('../services/generationQueue.js', () => ({
  generationQueue: { enqueue: vi.fn() },
}))

import { generationQueue } from '../services/generationQueue.js'

const TEST_CARD_ID = 'test-regenerate-example-card'

function insertTestCard(overrides: Partial<typeof cards.$inferInsert> = {}): void {
  db.insert(cards).values({
    id: TEST_CARD_ID,
    word: 'serendipity',
    definition: 'a happy accident',
    examples: [],
    dictionary: { transcription: '', meanings: [] },
    aiExample: 'Old example sentence.',
    audioUrl: null,
    deckId: 'test-deck',
    tags: [],
    interval: 1,
    dueDate: '2099-01-01',
    createdAt: '2099-01-01',
    inReview: false,
    archived: false,
    stability: null,
    difficulty: null,
    ...overrides,
  }).run()
}

describe('POST /api/cards/:id/regenerate-example', () => {
  beforeEach(() => {
    db.delete(cards).where(eq(cards.id, TEST_CARD_ID)).run()
  })

  afterEach(() => {
    db.delete(cards).where(eq(cards.id, TEST_CARD_ID)).run()
    vi.clearAllMocks()
  })

  it('returns 404 when the card does not exist', async () => {
    const res = await app.request(`/${TEST_CARD_ID}/regenerate-example`, { method: 'POST' })

    expect(res.status).toBe(404)
    expect(generationQueue.enqueue).not.toHaveBeenCalled()
  })

  it('regenerates and persists only aiExample, leaving other fields untouched', async () => {
    insertTestCard()
    vi.mocked(generationQueue.enqueue).mockResolvedValue({
      dictionary: { transcription: '/ignored/', meanings: ['ignored'] },
      aiExample: 'A brand new example sentence.',
    })

    const res = await app.request(`/${TEST_CARD_ID}/regenerate-example`, { method: 'POST' })

    expect(res.status).toBe(200)
    const json = await res.json() as typeof cards.$inferSelect
    expect(json.aiExample).toBe('A brand new example sentence.')
    expect(json.dictionary).toEqual({ transcription: '', meanings: [] })
    expect(generationQueue.enqueue).toHaveBeenCalledWith('serendipity')
  })

  it('returns 503 and leaves the existing aiExample untouched when generation fails', async () => {
    insertTestCard()
    vi.mocked(generationQueue.enqueue).mockRejectedValue(new Error('Daily generation limit reached'))

    const res = await app.request(`/${TEST_CARD_ID}/regenerate-example`, { method: 'POST' })

    expect(res.status).toBe(503)
    const json = await res.json() as { error: string }
    expect(json.error).toBe('Daily generation limit reached')

    const row = db.select().from(cards).where(eq(cards.id, TEST_CARD_ID)).get()
    expect(row?.aiExample).toBe('Old example sentence.')
  })
})

const GENERATE_CONTENT_CARD_ID = 'test-generate-content-card'

function insertEmptyTestCard(overrides: Partial<typeof cards.$inferInsert> = {}): void {
  db.insert(cards).values({
    id: GENERATE_CONTENT_CARD_ID,
    word: 'ephemeral',
    definition: 'lasting a short time',
    examples: [],
    dictionary: { transcription: '', meanings: [] },
    aiExample: '',
    audioUrl: null,
    deckId: 'test-deck',
    tags: [],
    interval: 1,
    dueDate: '2099-01-01',
    createdAt: '2099-01-01',
    inReview: false,
    archived: false,
    stability: null,
    difficulty: null,
    ...overrides,
  }).run()
}

describe('POST /api/cards/:id/generate-content', () => {
  beforeEach(() => {
    db.delete(cards).where(eq(cards.id, GENERATE_CONTENT_CARD_ID)).run()
  })

  afterEach(() => {
    db.delete(cards).where(eq(cards.id, GENERATE_CONTENT_CARD_ID)).run()
    vi.clearAllMocks()
  })

  it('returns 404 when the card does not exist', async () => {
    const res = await app.request(`/${GENERATE_CONTENT_CARD_ID}/generate-content`, { method: 'POST' })

    expect(res.status).toBe(404)
    expect(generationQueue.enqueue).not.toHaveBeenCalled()
  })

  it('generates and persists both dictionary and aiExample', async () => {
    insertEmptyTestCard()
    vi.mocked(generationQueue.enqueue).mockResolvedValue({
      dictionary: { transcription: '/ɪˈfemərəl/', meanings: ['lasting for a very short time'] },
      aiExample: 'The beauty of cherry blossoms is ephemeral.',
    })

    const res = await app.request(`/${GENERATE_CONTENT_CARD_ID}/generate-content`, { method: 'POST' })

    expect(res.status).toBe(200)
    const json = await res.json() as typeof cards.$inferSelect
    expect(json.dictionary).toEqual({ transcription: '/ɪˈfemərəl/', meanings: ['lasting for a very short time'] })
    expect(json.aiExample).toBe('The beauty of cherry blossoms is ephemeral.')
    expect(generationQueue.enqueue).toHaveBeenCalledWith('ephemeral')
  })

  it('returns 503 and leaves existing data untouched when generation fails', async () => {
    insertEmptyTestCard()
    vi.mocked(generationQueue.enqueue).mockRejectedValue(new Error('Daily generation limit reached'))

    const res = await app.request(`/${GENERATE_CONTENT_CARD_ID}/generate-content`, { method: 'POST' })

    expect(res.status).toBe(503)
    const json = await res.json() as { error: string }
    expect(json.error).toBe('Daily generation limit reached')

    const row = db.select().from(cards).where(eq(cards.id, GENERATE_CONTENT_CARD_ID)).get()
    expect(row?.dictionary).toEqual({ transcription: '', meanings: [] })
    expect(row?.aiExample).toBe('')
  })
})
