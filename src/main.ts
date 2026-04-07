import './styles/tokens.scss'
import './styles/layout.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index'
import { useCardsStore } from './stores/cards'
import { useDecksStore } from './stores/decks'
import { useTagsStore } from './stores/tags'
import { fetchAllCards } from './api/cards'
import { fetchAllDecks } from './api/decks'
import { fetchAllTags } from './api/tags'

async function loadAllData(): Promise<void> {
  const [cards, decks, tags] = await Promise.all([
    fetchAllCards(),
    fetchAllDecks(),
    fetchAllTags(),
  ])
  useCardsStore().setCards(cards)
  useDecksStore().setDecks(decks)
  useTagsStore().setTags(tags)
}

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)

  try {
    await loadAllData()
  } catch (err) {
    console.error('[main] Failed to load data from server:', err)
  }

  app.mount('#app')
}

bootstrap().catch(err => console.error('[main] Bootstrap failed:', err))
