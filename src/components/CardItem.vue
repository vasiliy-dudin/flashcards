<template>
  <article class="card-item" @click="emit('open', card)">
    <header class="card-item__header">
      <span class="card-item__word">{{ card.word }}</span>
      <span class="card-item__badge" :class="`card-item__badge--${dueBadge.variant}`">
        {{ dueBadge.label }}
      </span>
    </header>

    <p v-if="settingsStore.settings.showTranslation" class="card-item__definition">{{ card.definition }}</p>

    <footer class="card-item__footer">
      <div class="card-item__tags">
        <span v-for="tag in card.tags" :key="tag" class="card-item__tag">
          {{ leafSegment(tag) }}
        </span>
      </div>
      <div class="card-item__footer-actions" @click.stop>
        <AppButton
          variant="ghost"
          size="icon"
          :disabled="!card.audioUrl"
          aria-label="Play pronunciation"
          @click="playAudio"
        >▶</AppButton>
        <CardActionMenu :card="card" @edit="showEditModal = true" />
      </div>
    </footer>
  </article>

  <CardEditModal
    v-if="showEditModal"
    :card="card"
    @saved="showEditModal = false"
    @close="showEditModal = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../types'
import { formatDate } from '../utils/formatDate'
import { getCardDueStatus } from '../utils/cardStatus'
import { useSettingsStore } from '../stores/settings'
import AppButton from './AppButton.vue'
import CardActionMenu from './CardActionMenu.vue'
import CardEditModal from './CardEditModal.vue'

interface DueBadge {
  label: string
  variant: 'overdue' | 'due' | 'future'
}

const { card } = defineProps<{ card: Card }>()
const emit = defineEmits<{ open: [card: Card] }>()

const settingsStore = useSettingsStore()
const showEditModal = ref(false)

function leafSegment(tagPath: string): string {
  return tagPath.split('/').at(-1) ?? tagPath
}

const dueBadge = computed<DueBadge>(() => {
  const status = getCardDueStatus(card.dueDate)
  if (status === 'overdue') return { label: 'Overdue', variant: 'overdue' }
  if (status === 'due') return { label: 'Due today', variant: 'due' }
  return { label: formatDate(card.dueDate), variant: 'future' }
})

function playAudio(): void {
  if (!card.audioUrl) return
  new Audio(card.audioUrl).play().catch(err => {
    console.error('[CardItem] Audio playback failed:', card.word, err)
  })
}
</script>

<style lang="scss" scoped>
.card-item {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
  transition: border-color var(--transition-fast);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary);
  }
}

.card-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.card-item__word {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-item__badge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);

  &--overdue {
    background-color: color-mix(in srgb, var(--color-danger) 15%, transparent);
    color: var(--color-danger);
  }

  &--due {
    background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  &--future {
    background-color: var(--color-surface-2);
    color: var(--color-text-muted);
  }
}

.card-item__definition {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: var(--line-height-base);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-item__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
}

.card-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  overflow: hidden;
}

.card-item__tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-surface-2);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.card-item__footer-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}
</style>
