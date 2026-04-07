<template>
  <div style="display: flex; height: 100vh;">
    <AppSidebar />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
</script>
