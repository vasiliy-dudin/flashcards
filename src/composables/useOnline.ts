import { onUnmounted, ref, type Ref } from 'vue'

export function useOnline(): { isOnline: Readonly<Ref<boolean>> } {
  const isOnline = ref(navigator.onLine)

  function handleOnline(): void {
    isOnline.value = true
  }

  function handleOffline(): void {
    isOnline.value = false
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline }
}
