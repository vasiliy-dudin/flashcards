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
              <th class="card-table__th">{{ colDef.label }}</th>
            </template>
            <th class="card-table__th card-table__th--actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="card in props.cards"
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
                <AppButton
                  variant="ghost"
                  size="icon"
                  :disabled="!card.audioUrl"
                  aria-label="Play pronunciation"
                  @click.stop="playAudio(card)"
                >▶</AppButton>
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
            <td class="card-table__td card-table__td--actions" @click.stop>
              <CardActionMenu :card="card" @edit="editingCard = card" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>

  <CardEditModal
    v-if="editingCard"
    :card="editingCard"
    @saved="editingCard = null"
    @close="editingCard = null"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card, TableColumnId } from '../types'
import { ALL_TABLE_COLUMNS } from '../types'
import { formatDate } from '../utils/formatDate'
import { getCardDueStatus } from '../utils/cardStatus'
import { useSettingsStore } from '../stores/settings'
import AppButton from './AppButton.vue'
import CardActionMenu from './CardActionMenu.vue'
import CardEditModal from './CardEditModal.vue'

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

const props = withDefaults(
  defineProps<{ cards: Card[]; selectedIds?: Set<string> }>(),
  { selectedIds: () => new Set<string>() }
)
const emit = defineEmits<{
  open: [card: Card]
  'update:selectedIds': [ids: Set<string>]
}>()

const settingsStore = useSettingsStore()
const editingCard = ref<Card | null>(null)

const ALL_COLUMN_DEFS: ColumnDef[] = ALL_TABLE_COLUMNS.map(id => COLUMN_DEFS[id])

const enabledColumnDefs = computed<ColumnDef[]>(() =>
  ALL_TABLE_COLUMNS
    .filter(id => settingsStore.settings.enabledTableColumns.includes(id))
    .map(id => COLUMN_DEFS[id])
)

const pickerOpen = ref(false)
const pickerEl = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent): void {
  if (pickerEl.value && !pickerEl.value.contains(e.target as Node)) {
    pickerOpen.value = false
  }
}

function openPicker(): void {
  pickerOpen.value = true
  setTimeout(() => {
    document.addEventListener('click', onDocumentClick)
  }, 0)
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

const lastSelectedId = ref<string | null>(null)

function toggleSelection(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function rangeSelect(anchorId: string, targetId: string): Set<string> {
  const ids = props.cards.map(c => c.id)
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
  white-space: nowrap;
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

.card-table__th--actions,
.card-table__td--actions {
  width: 40px;
  padding: 0 var(--space-2);
  text-align: center;
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

@media (max-width: #{$bp-mobile}) {
  .card-table__td--checkbox input[type='checkbox'] {
    width: 20px;
    height: 20px;
  }
}
</style>
