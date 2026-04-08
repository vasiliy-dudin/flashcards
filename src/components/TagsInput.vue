<template>
  <div ref="containerRef" class="tags-input" @click="focusInput">
    <span v-for="tag in modelValue" :key="tag" class="tags-input__chip">
      {{ tag }}
      <button
        type="button"
        class="tags-input__remove"
        :aria-label="`Remove tag ${tag}`"
        @click.stop="removeTag(tag)"
      >×</button>
    </span>
    <input
      ref="inputRef"
      v-model="draft"
      class="tags-input__field"
      type="text"
      placeholder="Add tag…"
      :disabled="disabled"
      @focus="onFocus"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <Teleport to="body">
      <ul
        v-if="showDropdown"
        class="tags-input__dropdown"
        :style="dropdownStyle"
        role="listbox"
      >
        <li
          v-for="(suggestion, i) in filteredSuggestions"
          :key="suggestion"
          :class="['tags-input__suggestion', { 'tags-input__suggestion--active': i === activeIndex }]"
          role="option"
          @mousedown.prevent="selectSuggestion(suggestion)"
        >
          {{ suggestion }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{ modelValue: string[]; suggestions?: string[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const MAX_SUGGESTIONS = 8

const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const activeIndex = ref(-1)
const inputFocused = ref(false)
const dropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

const filteredSuggestions = computed((): string[] => {
  if (!props.suggestions?.length) return []
  const available = props.suggestions.filter(s => !props.modelValue.includes(s))
  if (!draft.value) return available.slice(0, MAX_SUGGESTIONS)
  const query = draft.value.toLowerCase()
  return available.filter(s => s.toLowerCase().startsWith(query)).slice(0, MAX_SUGGESTIONS)
})

const showDropdown = computed((): boolean => inputFocused.value && filteredSuggestions.value.length > 0)

watch(draft, () => { activeIndex.value = -1 })

watch(showDropdown, async (visible) => {
  if (visible) {
    await nextTick()
    updateDropdownPosition()
  }
})

function updateDropdownPosition(): void {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

function onFocus(): void {
  inputFocused.value = true
  updateDropdownPosition()
}

function onBlur(): void {
  inputFocused.value = false
  confirmDraft()
}

function focusInput(): void {
  inputRef.value?.focus()
}

function confirmDraft(): void {
  const tag = draft.value.trim().toLowerCase()
  if (tag && !props.modelValue.includes(tag)) {
    emit('update:modelValue', [...props.modelValue, tag])
  }
  draft.value = ''
}

function selectSuggestion(suggestion: string): void {
  if (!props.modelValue.includes(suggestion)) {
    emit('update:modelValue', [...props.modelValue, suggestion])
  }
  draft.value = ''
  activeIndex.value = -1
}

function removeTag(tag: string): void {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filteredSuggestions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
  } else if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    if (activeIndex.value >= 0) {
      selectSuggestion(filteredSuggestions.value[activeIndex.value])
    } else {
      confirmDraft()
    }
  } else if (e.key === 'Backspace' && draft.value === '') {
    const last = props.modelValue.at(-1)
    if (last !== undefined) removeTag(last)
  }
}
</script>

<style lang="scss" scoped>
.tags-input {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-height: 38px;
  cursor: text;
  transition: border-color var(--transition-fast);

  &:focus-within {
    border-color: var(--color-primary);
  }
}

.tags-input__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 1px var(--space-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-text);
}

.tags-input__remove {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: 0;
  line-height: 1;

  &:hover {
    color: var(--color-danger);
  }
}

.tags-input__field {
  flex: 1;
  min-width: 80px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);

  &::placeholder {
    color: var(--color-text-muted);
  }

  &:disabled {
    opacity: 0.5;
  }
}

.tags-input__dropdown {
  position: fixed;
  z-index: 200;
  list-style: none;
  margin: 0;
  padding: var(--space-1) 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

.tags-input__suggestion {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;

  &:hover,
  &--active {
    background-color: var(--color-surface-2);
    color: var(--color-primary);
  }
}
</style>
