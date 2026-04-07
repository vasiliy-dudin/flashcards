<template>
  <div class="tags-input" @click="focusInput">
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
      @keydown="onKeydown"
      @blur="confirmDraft"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ modelValue: string[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

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

function removeTag(tag: string): void {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    confirmDraft()
  } else if (e.key === 'Backspace' && draft.value === '') {
    const last = props.modelValue.at(-1)
    if (last !== undefined) removeTag(last)
  }
}
</script>

<style lang="scss" scoped>
.tags-input {
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
</style>
