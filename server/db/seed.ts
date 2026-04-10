import { db } from './index.js'
import { cards, decks, tags } from './schema.js'

type DeckInsert = typeof decks.$inferInsert
type CardInsert = typeof cards.$inferInsert
type TagInsert = typeof tags.$inferInsert

const SEED_DECKS: DeckInsert[] = [
  { id: 'd1', name: 'English Vocabulary', parentId: null, createdAt: '2026-03-01' },
  { id: 'd2', name: 'Phrasal Verbs',      parentId: null, createdAt: '2026-03-15' },
]

const SEED_CARDS: CardInsert[] = [
  {
    id: 'c1', word: 'ephemeral',
    definition: 'Lasting for a very short time; transitory.',
    examples: ['Social media trends are ephemeral — here today, gone tomorrow.', 'The ephemeral beauty of cherry blossoms makes them all the more precious.'],
    dictionary: { transcription: '/ɪˈfem.ər.əl/', meanings: ['Lasting for a very short time', 'Existing only briefly; transitory'] },
    aiExample: 'The ephemeral nature of fashion means that trends rarely last more than a season.',
    audioUrl: null, deckId: 'd1', tags: ['formal', 'grammar'],
    interval: 3, dueDate: '2026-04-05', createdAt: '2026-03-01', inReview: false,
  },
  {
    id: 'c2', word: 'set off',
    definition: 'To begin a journey; to cause something to start happening.',
    examples: ['We set off early to avoid the morning traffic.', 'The alarm was set off by a faulty sensor.'],
    dictionary: { transcription: '/ˌset ˈɒf/', meanings: ['To begin a journey', 'To cause something to start or happen', 'To make an alarm or bomb activate'] },
    aiExample: 'They set off at dawn to reach the summit before the afternoon storms.',
    audioUrl: null, deckId: 'd2', tags: ['phrasal-verbs', 'phrasal-verbs/motion'],
    interval: 7, dueDate: '2026-04-07', createdAt: '2026-03-15', inReview: false,
  },
  {
    id: 'c3', word: 'meticulous',
    definition: 'Showing great attention to detail or being very careful and precise.',
    examples: ['She kept meticulous records of every expense.'],
    dictionary: { transcription: '/məˈtɪk.jʊ.ləs/', meanings: ['Showing great care and attention to detail', 'Very precise and thorough'] },
    aiExample: 'The meticulous researcher checked every source before drawing any conclusions.',
    audioUrl: null, deckId: 'd1', tags: ['formal'],
    interval: 14, dueDate: '2026-04-21', createdAt: '2026-03-10', inReview: false,
  },
  {
    id: 'c4', word: 'put up with',
    definition: 'To tolerate something unpleasant without complaining.',
    examples: ["I can't put up with this noise any longer."],
    dictionary: { transcription: '/ˌpʊt ˈʌp wɪð/', meanings: ['To tolerate something unpleasant', 'To accept a difficult situation without complaint'] },
    aiExample: "She could no longer put up with the constant interruptions during her work calls.",
    audioUrl: null, deckId: 'd2', tags: ['phrasal-verbs'],
    interval: 5, dueDate: '2026-04-12', createdAt: '2026-03-20', inReview: false,
  },
  {
    id: 'c5', word: 'ubiquitous',
    definition: 'Present, appearing, or found everywhere.',
    examples: ['Smartphones have become ubiquitous in modern life.'],
    dictionary: { transcription: '/juːˈbɪk.wɪ.təs/', meanings: ['Present or found everywhere', 'Seeming to appear in all places at once'] },
    aiExample: 'Coffee shops have become ubiquitous in every major city across the country.',
    audioUrl: null, deckId: 'd1', tags: ['formal'],
    interval: 1, dueDate: '2026-04-06', createdAt: '2026-04-01', inReview: false,
  },
]

const SEED_TAGS: TagInsert[] = [
  { name: 'formal',              cardCount: 3 },
  { name: 'grammar',             cardCount: 1 },
  { name: 'phrasal-verbs',       cardCount: 2 },
  { name: 'phrasal-verbs/motion', cardCount: 1 },
]

/** Inserts dev fixtures into SQLite. Idempotent — safe to call on every startup. */
export function seedDevData(): void {
  db.insert(decks).values(SEED_DECKS).onConflictDoNothing().run()
  db.insert(cards).values(SEED_CARDS).onConflictDoNothing().run()
  db.insert(tags).values(SEED_TAGS).onConflictDoNothing().run()
  console.log('[db] Dev seed inserted')
}
