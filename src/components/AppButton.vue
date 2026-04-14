<template>
  <button
    :class="[
      'app-btn',
      `app-btn--${variant}`,
      `app-btn--${size}`,
      { 'app-btn--active': active },
    ]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-subtle' | 'ghost-danger' | 'danger' | 'danger-subtle' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  active?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  variant: 'ghost',
  size: 'md',
  type: 'button',
})
</script>

<style lang="scss" scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition:
    filter var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast);

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  // Sizes
  &--sm   { padding: var(--space-1) var(--space-3); }
  &--md   { padding: var(--space-2) var(--space-4); }
  &--lg   { padding: var(--space-3) var(--space-5); }
  &--icon { width: 28px; height: 28px; padding: 0; font-size: var(--font-size-xs); }

  // Variants
  &--primary {
    background-color: var(--color-primary);
    color: #fff;
    border: none;

    &:hover:not(:disabled) { filter: brightness(1.1); }
  }

  &--secondary {
    background-color: var(--color-surface-2);
    color: var(--color-text-muted);
    border: none;

    &:hover:not(:disabled) { filter: brightness(1.2); }
  }

  &--ghost {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-text);
    }

    &.app-btn--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  // Ghost with surface-2 background — used for "soft" action buttons (Play, Edit, Actions)
  &--ghost-subtle {
    background-color: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  // Ghost with danger hover — used for bulk delete toolbar button
  &--ghost-danger {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);

    &:hover:not(:disabled) {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }

  &--danger {
    background-color: var(--color-danger);
    color: #fff;
    border: none;

    &:hover:not(:disabled) { filter: brightness(1.1); }
  }

  // Tinted danger — used for inline delete confirm buttons
  &--danger-subtle {
    background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
    color: var(--color-danger);
    border: 1px solid transparent;

    &:hover:not(:disabled) { border-color: var(--color-danger); }
  }

  &--success {
    background-color: var(--color-success);
    color: #fff;
    border: none;

    &:hover:not(:disabled) { filter: brightness(1.1); }
  }
}
</style>
