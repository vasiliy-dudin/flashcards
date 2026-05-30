<template>
  <template v-if="authStore.isAuthenticated">
    <button
      class="app-burger"
      aria-label="Open menu"
      :aria-expanded="uiStore.sidebarOpen.toString()"
      @click="uiStore.toggleSidebar()"
    >
      <span class="app-burger__bar" />
      <span class="app-burger__bar" />
      <span class="app-burger__bar" />
    </button>

    <div
      v-if="uiStore.sidebarOpen"
      class="app-backdrop"
      aria-hidden="true"
      @click="uiStore.closeSidebar()"
    />

    <AppSidebar />
    <main class="app-main">
      <router-view />
    </main>
  </template>
  <router-view v-else />
</template>

<script setup lang="ts">
import { watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()

watchEffect(() => {
  document.documentElement.dataset.theme = settingsStore.settings.theme
})

watch(route, () => {
  uiStore.closeSidebar()
})

watch(
  () => uiStore.sidebarOpen,
  (open) => { document.body.style.overflow = open ? 'hidden' : '' },
)
</script>

<style lang="scss" scoped>
.app-burger {
  display: none;

  @media (max-width: #{$bp-mobile}) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--space-1);
    position: fixed;
    top: max(var(--space-3), env(safe-area-inset-top, 0px));
    left: max(var(--space-3), env(safe-area-inset-left, 0px));
    z-index: var(--z-index-sidebar);
    width: 44px;
    height: 44px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    padding: 0;
  }
}

.app-burger__bar {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--color-text);
  border-radius: var(--radius-full);
}

.app-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: var(--z-index-overlay);
}
</style>
