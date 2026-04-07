export interface Card {
  id: string
  word: string
  definition: string
  examples: string[]
  usageNotes: string
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
