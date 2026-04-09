<template>
  <template v-if="cards.length === 0">
    <p class="card-table__empty">No cards here yet.</p>
  </template>
  <template v-else>
    <div class="card-table__toolbar">
      <div class="card-table__col-picker" ref="pickerEl">
        <button class="card-table__col-btn" @click="togglePickerOpen()">
          Columns ▾
        </button>
        <div v-if="pickerOpen" class="card-table__col-panel">
          <label v-for="colDef in ALL_COLUMN_DEFS" :key="colDef.id" class="card-table__col-option">
            <input
              type="checkbox"
              :checked="settingsStore.settings.enabledTableColumns.includes(colDef.id)"
              @change="toggleColumn(colDef.id)"
            />
            {{ colDef.label }}
          </label>
        </div>
      </div>
    </div>
    <div class="card-table-wrap">
      <table class="card-table">
        <thead>
          <tr>
            <th class="card-table__th card-table__th--checkbox"></th>
            <template v-for="colDef in enabledColumnDefs" :key="colDef.id">
              <th v-if="colDef.id === 'transcription'" class="card-table__th card-table__th--audio"></th>
              <th
                class="card-table__th"
                :class="{ 'is-sorted': sortKey === colDef.id }"
                @click="setSort(colDef.id)"
              >
                {{ colDef.label }}
                <span class="card-table__sort-icon">
                  {{ sortKey === colDef.id ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="card in sortedCards"
            :key="card.id"
            class="card-table__row"
            :class="{ 'is-selected': selectedIds.has(card.id) }"
            @click="onRowClick(card, $event)"
          >
            <td class="card-table__td card-table__td--checkbox" @click.stop>
              <input
                type="checkbox"
                :checked="selectedIds.has(card.id)"
                @change="onCheckboxChange(card)"
              />
            </td>
            <template v-for="colDef in enabledColumnDefs" :key="colDef.id">
              <td v-if="colDef.id === 'transcription'" class="card-table__td card-table__td--audio">
                <button
                  class="card-table__audio-btn"
                  :disabled="!card.audioUrl"
                  aria-label="Play pronunciation"
                  @click.stop="playAudio(card)"
                >▶</button>
              </td>
              <td
                class="card-table__td"
                :class="{ 'card-table__td--word': colDef.id === 'word' }"
              >
                <template v-if="colDef.id === 'dueDate'">
                  <span class="card-table__due" :class="dueBadgeClass(card.dueDate)">
                    {{ formatDate(card.dueDate) }}
                  </span>
                </template>
                <template v-else-if="colDef.id === 'tags'">
                  {{ card.tags.join(', ') }}
                </template>
                <template v-else>{{ getCellText(card, colDef.id) }}</template>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card, TableColumnId } from '../types'
import { ALL_TABLE_COLUMNS } from '../types'
import { formatDate } from '../utils/formatDate'
import { getCardDueStatus } from '../utils/cardStatus'
import { useSettingsStore } from '../stores/settings'

interface ColumnDef {
  id: TableColumnId
  label: string
}

const COLUMN_DEFS: Record<TableColumnId, ColumnDef> = {
  word:          { id: 'word',          label: 'Word' },
  translation:   { id: 'translation',   label: 'Translation' },
  transcription: { id: 'transcription', label: 'Transcription' },
  tags:          { id: 'tags',          label: 'Tags' },
  interval:      { id: 'interval',      label: 'Interval' },
  dueDate:       { id: 'dueDate',       label: 'Due date' },
  createdAt:     { id: 'createdAt',     label: 'Created' },
}

type SortDir = 'asc' | 'desc'

const props = defineProps<{ cards: Card[]; selectedIds: Set<string> }>()
const { cards } = props
const emit = defineEmits<{
  open: [card: Card]
  'update:selectedIds': [ids: Set<string>]
}>()

const settingsStore = useSettingsStore()

const ALL_COLUMN_DEFS: ColumnDef[] = ALL_TABLE_COLUMNS.map(id => COLUMN_DEFS[id])

const enabledColumnDefs = computed<ColumnDef[]>(() =>
  ALL_TABLE_COLUMNS
    .filter(id => settingsStore.settings.enabledTableColumns.includes(id))
    .map(id => COLUMN_DEFS[id])
)

const pickerOpen = ref(false)
const pickerEl = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent): void {
  if (!pickerEl.value?.contains(e.target as Node)) pickerOpen.value = false
}

function openPicker(): void {
  pickerOpen.value = true
  document.addEventListener('click', onDocumentClick)
}

function closePicker(): void {
  pickerOpen.value = false
  document.removeEventListener('click', onDocumentClick)
}

function togglePickerOpen(): void {
  pickerOpen.value ? closePicker() : openPicker()
}

function toggleColumn(id: TableColumnId): void {
  const current = settingsStore.settings.enabledTableColumns
  const next = current.includes(id) ? current.filter(c => c !== id) : [...current, id]
  settingsStore.updateSettings({ enabledTableColumns: next })
}

const sortKey = ref<TableColumnId>('word')
const sortDir = ref<SortDir>('asc')

function setSort(key: TableColumnId): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function compareCards(a: Card, b: Card, key: TableColumnId): number {
  switch (key) {
    case 'word':          return a.word.localeCompare(b.word)
    case 'translation':   return a.definition.localeCompare(b.definition)
    case 'transcription': return a.dictionary.transcription.localeCompare(b.dictionary.transcription)
    case 'tags':          return a.tags.join(',').localeCompare(b.tags.join(','))
    case 'interval':      return a.interval - b.interval
    case 'dueDate':       return a.dueDate.localeCompare(b.dueDate)
    case 'createdAt':     return a.createdAt.localeCompare(b.createdAt)
  }
}

const sortedCards = computed<Card[]>(() =>
  [...cards].sort((a, b) => {
    const cmp = compareCards(a, b, sortKey.value)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
)

const lastSelectedId = ref<string | null>(null)

function toggleSelection(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function rangeSelect(anchorId: string, targetId: string): Set<string> {
  const ids = sortedCards.value.map(c => c.id)
  const from = ids.indexOf(anchorId)
  const to = ids.indexOf(targetId)
  if (from === -1 || to === -1) return new Set(props.selectedIds)
  const [lo, hi] = from < to ? [from, to] : [to, from]
  const next = new Set(props.selectedIds)
  ids.slice(lo, hi + 1).forEach((id: string) => next.add(id))
  return next
}

function onCheckboxChange(card: Card): void {
  lastSelectedId.value = card.id
  emit('update:selectedIds', toggleSelection(props.selectedIds, card.id))
}

function onRowClick(card: Card, event: MouseEvent): void {
  if (event.ctrlKey || event.metaKey) {
    lastSelectedId.value = card.id
    emit('update:selectedIds', toggleSelection(props.selectedIds, card.id))
    return
  }
  if (event.shiftKey && lastSelectedId.value) {
    emit('update:selectedIds', rangeSelect(lastSelectedId.value, card.id))
    return
  }
  emit('open', card)
}

function getCellText(card: Card, id: TableColumnId): string {
  switch (id) {
    case 'word':          return card.word
    case 'translation':   return card.definition
    case 'transcription': return card.dictionary.transcription
    case 'tags':          return card.tags.join(', ')
    case 'interval':      return `${card.interval}d`
    case 'dueDate':       return formatDate(card.dueDate)
    case 'createdAt':     return formatDate(card.createdAt)
  }
}

function dueBadgeClass(dueDate: string): string {
  return `is-${getCardDueStatus(dueDate)}`
}

function playAudio(card: Card): void {
  if (!card.audioUrl) return
  new Audio(card.audioUrl).play().catch(err => {
    console.error('[CardTable] Audio playback failed:', card.word, err)
  })
}
</script>

<style lang="scss" scoped>
.card-table-wrap {
  overflow-x: auto;
}

.card-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.card-table__th {
  padding: var(--space-2) var(--space-4);
  text-align: left;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color var(--transition-fast);

  &:hover,
  &.is-sorted {
    color: var(--color-text);
  }
}

.card-table__sort-icon {
  margin-left: var(--space-1);
  font-size: var(--font-size-xs);
  opacity: 0.5;
}

.card-table__row {
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition-fast);
  cursor: pointer;

  &:hover {
    background-color: var(--color-surface-2);
  }
}

.card-table__td {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
}

.card-table__td--word {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.card-table__due {
  &.is-overdue {
    color: var(--color-danger);
  }

  &.is-due {
    color: var(--color-warning);
  }

  &.is-future {
    color: var(--color-text-muted);
  }
}

.card-table__th--checkbox,
.card-table__td--checkbox {
  width: 36px;
  padding: 0 var(--space-2);
  text-align: center;

  input[type='checkbox'] {
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: var(--color-primary);
  }
}

.card-table__row.is-selected {
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.card-table__th--audio,
.card-table__td--audio {
  width: 40px;
  padding: 0 var(--space-2);
  text-align: center;
}

.card-table__audio-btn {
  --_size: 28px;
  width: var(--_size);
  height: var(--_size);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.card-table__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.card-table__toolbar {
  display: flex;
  justify-content: flex-end;
  padding-bottom: var(--space-3);
}

.card-table__col-picker {
  position: relative;
}

.card-table__col-btn {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }
}

.card-table__col-panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: var(--z-index-dropdown);
  min-width: 160px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.card-table__col-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  border-radius: var(--radius-sm);

  &:hover {
    background-color: var(--color-surface-2);
  }
}
</style>
