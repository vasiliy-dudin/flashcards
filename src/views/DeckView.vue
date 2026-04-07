<template>
  <main>
    <h1>Deck: {{ deckId }}</h1>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// params.id is string | string[] — normalise to a single string
const deckId = computed<string>(() => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] : id
})
</script>
