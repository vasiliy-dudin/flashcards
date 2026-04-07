<template>
  <main>
    <h1>Deck: {{ route.params.id }}</h1>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
