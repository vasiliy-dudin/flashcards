<template>
  <div style="display: flex; height: 100vh;">
    <AppSidebar />
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import AppSidebar from './components/AppSidebar.vue'

export default defineComponent({
  name: 'App',
  components: { AppSidebar },
})
</script>
