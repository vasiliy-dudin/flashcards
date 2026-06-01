<template>
  <div class="app-select-wrap has-dropdown-arrow">
    <select
      class="app-select"
      v-bind="$attrs"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style lang="scss" scoped>
.app-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-muted);
  transition: color var(--transition-fast);

  &:has(.app-select:hover),
  &:has(.app-select:focus-visible) {
    color: var(--color-text);
  }

}

.app-select {
  appearance: none;
  padding: var(--space-2) var(--space-5) var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary);
    outline: none;
  }
}
</style>
