export type CardDueStatus = 'overdue' | 'due' | 'future'

/** Classifies a card's due date relative to today. */
export function getCardDueStatus(dueDate: string): CardDueStatus {
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'due'
  return 'future'
}
