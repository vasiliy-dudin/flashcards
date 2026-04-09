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
  rememberMultiplier: number
  forgetMultiplier: number
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
}

export const DEFAULT_SETTINGS: SettingsConfig = {
  rememberMultiplier: 1.8,
  forgetMultiplier: 0.5,
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
}
