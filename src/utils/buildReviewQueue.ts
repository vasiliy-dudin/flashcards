import type { Card, SettingsConfig } from '../types'

type QueueConfig = Pick<SettingsConfig, 'retireCards' | 'maxIntervalDays' | 'limitNewCardsPerDay'>

function isNewCard(card: Card): boolean {
  return card.interval === 1 && card.dueDate === card.createdAt
}

/** Filters and sorts cards into the review queue based on current settings. */
export function buildReviewQueue(cards: Card[], today: string, config: QueueConfig): Card[] {
  let due = [...cards]
    .filter(c => c.inReview && !c.archived && c.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  if (config.retireCards) {
    due = due.filter(c => c.interval < config.maxIntervalDays)
  }

  if (config.limitNewCardsPerDay !== null) {
    let newCount = 0
    const limit = config.limitNewCardsPerDay
    due = due.filter(c => {
      if (!isNewCard(c)) return true
      if (newCount < limit) { newCount++; return true }
      return false
    })
  }

  return due
}
