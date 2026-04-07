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

  /** Bulk-replace all tags (used for initial load from IndexedDB). */
  function setTags(next: Tag[]): void {
    tags.value = next
  }

  /** Increment a tag's card count by 1, inserting it with count 1 if absent. */
  function upsertTag(name: string): void {
    const existing = tags.value.find((t) => t.name === name)
    if (existing) {
      existing.cardCount += 1
    } else {
      tags.value.push({ name, cardCount: 1 })
    }
  }

  /** Decrement a tag's card count by 1, removing it when it reaches 0. */
  function decrementTag(name: string): void {
    const index = tags.value.findIndex((t) => t.name === name)
    if (index === -1) return
    const tag = tags.value[index]
    if (tag.cardCount <= 1) {
      tags.value.splice(index, 1)
    } else {
      tag.cardCount -= 1
    }
  }

  return { tags, rootSegments, setTags, upsertTag, decrementTag }
})
