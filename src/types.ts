export interface DictionaryEntry {
  transcription: string
  meanings: string[]
}

export interface Card {
  id: string
  word: string
  definition: string
  examples: string[]
  dictionary: DictionaryEntry
  aiExample: string
  audioUrl: string | null
  deckId: string
  /** Full tag paths, e.g. ["grammar/tense/past", "phrasal-verbs"] */
  tags: string[]
  /** Review interval in days */
  interval: number
  /** ISO date string YYYY-MM-DD */
  dueDate: string
  /** ISO date string */
  createdAt: string
  /** Whether the card has been manually enrolled in the review queue */
  inReview: boolean
  /** Whether the card has been archived (excluded from review queue) */
  archived: boolean
  /** FSRS memory stability in days; null for cards not yet reviewed under FSRS */
  stability: number | null
  /** FSRS difficulty [1, 10]; null for cards not yet reviewed under FSRS */
  difficulty: number | null
}

export interface Deck {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

export interface Tag {
  /** Full hierarchical path, e.g. "grammar/tense/past" */
  name: string
  cardCount: number
}

export type Theme = 'dark' | 'light'

export type TableColumnId = 'word' | 'translation' | 'transcription' | 'tags' | 'interval' | 'dueDate' | 'createdAt'

export const ALL_TABLE_COLUMNS: TableColumnId[] = ['word', 'translation', 'transcription', 'tags', 'interval', 'dueDate', 'createdAt']

export interface SettingsConfig {
  maxIntervalDays: number
  applyFuzzing: boolean
  retireCards: boolean
  reviewInReverse: boolean
  /** null means unlimited */
  limitNewCardsPerDay: number | null
  /** Custom instruction prepended to the AI prompt when generating card content */
  aiPrompt: string
  /** Show card definitions (translations) in grid/table card views */
  showTranslation: boolean
  /** UI color scheme */
  theme: Theme
  /** Columns visible in table view */
  enabledTableColumns: TableColumnId[]
  /** Automatically play audio when a card is revealed during review */
  autoPlayAudio: boolean
  /** Target recall probability at each review (0–1) */
  fsrsTargetRetention: number
  /** FSRS parameter vector w (21 values) */
  fsrsParameters: number[]
}

export const DEFAULT_SETTINGS: SettingsConfig = {
  maxIntervalDays: 365,
  applyFuzzing: true,
  retireCards: true,
  reviewInReverse: false,
  limitNewCardsPerDay: 5,
  aiPrompt: '',
  showTranslation: true,
  theme: 'light',
  enabledTableColumns: [...ALL_TABLE_COLUMNS],
  autoPlayAudio: false,
  fsrsTargetRetention: 0.9,
  fsrsParameters: [
    0.212, 1.2931, 2.3065, 8.2956,
    6.4133, 0.8334, 3.0194, 0.001,
    1.8722, 0.1666, 0.796, 1.4835,
    0.0614, 0.2629, 1.6483, 0.6014,
    1.8729, 0.5425, 0.0912, 0.0658,
    0.1542,
  ],
}
