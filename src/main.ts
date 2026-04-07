import './styles/tokens.scss'
import './styles/layout.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
