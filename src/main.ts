import './styles/tokens.scss'
import './styles/layout.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index'
import { useAuthStore } from './stores/auth'
import { loadAllData } from './loadAllData'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return

  try {
    await loadAllData()
  } catch (err) {
    console.error('[main] Failed to load data from server:', err)
    authStore.logout()
    await router.push('/login')
  }
}

bootstrap().catch(err => console.error('[main] Bootstrap failed:', err))
