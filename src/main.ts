import './styles/tokens.scss'
import './styles/layout.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index'
import { useAuthStore } from './stores/auth'
import { loadAllData, loadAllDataOffline } from './loadAllData'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  const authStore = useAuthStore()
  if (authStore.isAuthenticated) {
    if (navigator.onLine) {
      try {
        await loadAllData()
      } catch (err) {
        const is401 = err instanceof Error && err.message.includes(': 401')
        if (is401) {
          authStore.logout()
        } else {
          console.error('[main] Failed to load data from server, falling back to cache:', err)
          await loadAllDataOffline()
        }
      }
    } else {
      await loadAllDataOffline()
    }
  }

  app.mount('#app')
}

bootstrap().catch(err => console.error('[main] Bootstrap failed:', err))
