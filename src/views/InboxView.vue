<template>
  <main class="inbox">
    <header class="inbox__header">
      <h2 class="inbox__title">Inbox</h2>
      <span v-if="totalCount > 0" class="inbox__progress">
        {{ reviewedCount }} / {{ totalCount }}
      </span>
    </header>

    <div v-if="!currentCard" class="inbox__empty">
      <p class="inbox__empty-text">All done for today!</p>
      <p class="inbox__empty-sub">Come back tomorrow for more cards.</p>
    </div>

    <template v-else>
      <div class="inbox__stage">
        <div
          class="inbox__flipper"
          :class="{ 'is-flipped': isFlipped }"
          @click="flipCard"
        >
          <div class="inbox__face inbox__face--front">
            <span class="inbox__word">{{ currentCard.word }}</span>
          </div>
          <div class="inbox__face inbox__face--back">
            <span class="inbox__word">{{ currentCard.word }}</span>
            <p class="inbox__definition">{{ currentCard.definition }}</p>
            <ul v-if="currentCard.examples.length > 0" class="inbox__examples">
              <li v-for="example in currentCard.examples" :key="example">{{ example }}</li>
            </ul>
            <p v-if="currentCard.usageNotes" class="inbox__notes">
              {{ currentCard.usageNotes }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="isFlipped" class="inbox__actions">
        <button class="btn btn--danger" @click="submitReview('forget')">Forget</button>
        <button class="btn btn--success" @click="submitReview('remember')">Remember</button>
      </div>
      <p v-else class="inbox__hint">Click the card to reveal</p>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCardsStore } from '../stores/cards'
import { scheduleCard, type ReviewResult } from '../composables/useScheduler'
import { saveCard } from '../db/index'
import type { Card } from '../types'

const cardsStore = useCardsStore()

const queue = ref<Card[]>([])
const totalCount = ref(0)
const isFlipped = ref(false)

const currentCard = computed<Card | undefined>(() => queue.value[0])
const reviewedCount = computed<number>(() => totalCount.value - queue.value.length)

onMounted(() => {
  const today = new Date().toISOString().slice(0, 10)
  queue.value = [...cardsStore.cards]
    .filter(c => c.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  totalCount.value = queue.value.length
})

function flipCard(): void {
  if (!isFlipped.value) isFlipped.value = true
}

async function submitReview(result: ReviewResult): Promise<void> {
  const card = queue.value[0]
  if (!card) return

  const patch = scheduleCard(card, result)
  const updated: Card = { ...card, ...patch }

  cardsStore.updateCard(card.id, patch)
  queue.value.shift()
  isFlipped.value = false

  try {
    await saveCard(updated)
  } catch (err) {
    console.error('[InboxView] Failed to persist card review:', card.id, err)
  }
}
</script>

<style lang="scss" scoped>
.inbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  gap: var(--space-5);
  height: 100%;
}

.inbox__header {
  width: 100%;
  max-width: 640px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inbox__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.inbox__progress {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.inbox__empty-text {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
}

.inbox__empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox__stage {
  perspective: 1200px;
  width: 100%;
  max-width: 640px;
}

.inbox__flipper {
  position: relative;
  height: 280px;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
  cursor: pointer;

  &.is-flipped {
    transform: rotateY(180deg);
  }
}

.inbox__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.inbox__face--front {
  align-items: center;
  justify-content: center;
}

.inbox__face--back {
  transform: rotateY(180deg);
}

.inbox__word {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.inbox__definition {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

.inbox__examples {
  list-style: disc inside;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  li {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
}

.inbox__notes {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.inbox__actions {
  display: flex;
  gap: var(--space-4);
  width: 100%;
  max-width: 640px;
}

.inbox__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.btn {
  flex: 1;
  padding: var(--space-3) var(--space-5);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: filter var(--transition-fast);

  &--success {
    background-color: var(--color-success);
    color: #fff;

    &:hover {
      filter: brightness(1.1);
    }
  }

  &--danger {
    background-color: var(--color-danger);
    color: #fff;

    &:hover {
      filter: brightness(1.1);
    }
  }
}
</style>
