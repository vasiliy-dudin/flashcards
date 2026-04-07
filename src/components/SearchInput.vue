<template>
  <input
    class="search-input"
    type="search"
    :placeholder="placeholder"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string; placeholder?: string }>(), {
  placeholder: 'Search…',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style lang="scss" scoped>
.search-input {
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--color-primary);
  }
}
</style>
