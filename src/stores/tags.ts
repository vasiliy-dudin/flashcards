import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Tag } from '../types'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  /** Unique top-level tag segments, e.g. ["grammar", "phrasal-verbs"] */
  const rootSegments = computed<string[]>(() => {
    const roots = new Set(tags.value.map((t) => t.name.split('/')[0]))
    return [...roots]
  })

  function setTags(next: Tag[]): void {
    tags.value = next
  }

  return { tags, rootSegments, setTags }
})
