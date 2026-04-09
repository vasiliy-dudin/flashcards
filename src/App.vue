<template>
  <AppSidebar />
  <main class="app-main">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()

watchEffect(() => {
  document.documentElement.dataset.theme = settingsStore.settings.theme
})
</script>
