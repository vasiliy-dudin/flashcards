<template>
  <template v-if="authStore.isAuthenticated">
    <AppSidebar />
    <main class="app-main">
      <router-view />
    </main>
  </template>
  <router-view v-else />
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()

watchEffect(() => {
  document.documentElement.dataset.theme = settingsStore.settings.theme
})
</script>
