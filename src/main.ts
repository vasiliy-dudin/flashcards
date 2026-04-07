import './styles/tokens.scss'
import './styles/layout.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)

  if (import.meta.env.DEV) {
    const { seedDevData } = await import('./dev/seed')
    seedDevData()
  }

  app.mount('#app')
}

bootstrap().catch(err => console.error('[main] Bootstrap failed:', err))
