import type { Card, Deck } from '../types'
import { useCardsStore } from '../stores/cards'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'

const MOCK_DECKS: Deck[] = [
  { id: 'd1', name: 'English Vocabulary', parentId: null, createdAt: '2026-03-01' },
  { id: 'd2', name: 'Phrasal Verbs', parentId: null, createdAt: '2026-03-15' },
]

// Today is 2026-04-07 — cards have varied due dates for visual testing
const MOCK_CARDS: Card[] = [
  {
    id: 'c1',
    word: 'ephemeral',
    definition: 'Lasting for a very short time; transitory.',
    examples: [
      'Social media trends are ephemeral — here today, gone tomorrow.',
      'The ephemeral beauty of cherry blossoms makes them all the more precious.',
    ],
    usageNotes: 'Often used in philosophical or literary contexts.',
    audioUrl: null,
    deckId: 'd1',
    tags: ['formal', 'grammar'],
    interval: 3,
    dueDate: '2026-04-05', // overdue
    createdAt: '2026-03-01',
  },
  {
    id: 'c2',
    word: 'set off',
    definition: 'To begin a journey; to cause something to start happening.',
    examples: [
      'We set off early to avoid the morning traffic.',
      'The alarm was set off by a faulty sensor.',
    ],
    usageNotes: 'Common phrasal verb with multiple meanings depending on context.',
    audioUrl: null,
    deckId: 'd2',
    tags: ['phrasal-verbs', 'phrasal-verbs/motion'],
    interval: 7,
    dueDate: '2026-04-07', // due today
    createdAt: '2026-03-15',
  },
  {
    id: 'c3',
    word: 'meticulous',
    definition: 'Showing great attention to detail or being very careful and precise.',
    examples: ['She kept meticulous records of every expense.'],
    usageNotes: "Positive connotation; often describes a person's work style.",
    audioUrl: null,
    deckId: 'd1',
    tags: ['formal'],
    interval: 14,
    dueDate: '2026-04-21', // future
    createdAt: '2026-03-10',
  },
  {
    id: 'c4',
    word: 'put up with',
    definition: 'To tolerate something unpleasant without complaining.',
    examples: ["I can't put up with this noise any longer."],
    usageNotes: 'Informal. Often used in negative constructions.',
    audioUrl: null,
    deckId: 'd2',
    tags: ['phrasal-verbs'],
    interval: 5,
    dueDate: '2026-04-12', // future
    createdAt: '2026-03-20',
  },
  {
    id: 'c5',
    word: 'ubiquitous',
    definition: 'Present, appearing, or found everywhere.',
    examples: ['Smartphones have become ubiquitous in modern life.'],
    usageNotes: '',
    audioUrl: null,
    deckId: 'd1',
    tags: ['formal'],
    interval: 1,
    dueDate: '2026-04-06', // overdue
    createdAt: '2026-04-01',
  },
]

/** Populates Pinia stores with dev fixtures. No-ops if already seeded. */
export function seedDevData(): void {
  const cardsStore = useCardsStore()
  if (cardsStore.cards.length > 0) return

  const decksStore = useDecksStore()
  const tagsStore = useTagsStore()

  MOCK_DECKS.forEach(deck => decksStore.addDeck(deck))
  MOCK_CARDS.forEach(card => {
    cardsStore.addCard(card)
    card.tags.forEach(tag => tagsStore.upsertTag(tag))
  })
}
