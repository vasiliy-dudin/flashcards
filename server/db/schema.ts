import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core'

export const cards = sqliteTable('cards', {
  id:          text('id').primaryKey(),
  word:        text('word').notNull(),
  definition:  text('definition').notNull(),
  /** JSON-encoded string[] */
  examples:    text('examples', { mode: 'json' }).$type<string[]>().notNull(),
  /** JSON-encoded DictionaryEntry { transcription, meanings } */
  dictionary:  text('dictionary', { mode: 'json' }).$type<{ transcription: string; meanings: string[] }>().notNull(),
  aiExample:   text('ai_example').notNull(),
  audioUrl:    text('audio_url'),
  deckId:      text('deck_id').notNull(),
  /** JSON-encoded string[] */
  tags:        text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  interval:    integer('interval').notNull(),
  /** ISO date YYYY-MM-DD */
  dueDate:     text('due_date').notNull(),
  /** ISO date string */
  createdAt:   text('created_at').notNull(),
})

export const decks = sqliteTable('decks', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  parentId:  text('parent_id'),
  createdAt: text('created_at').notNull(),
})

export const tags = sqliteTable('tags', {
  name:      text('name').primaryKey(),
  cardCount: integer('card_count').notNull(),
})
