import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', component: () => import('../views/InboxView.vue') },
  { path: '/deck/:id', component: () => import('../views/DeckView.vue') },
  { path: '/tag/:name', component: () => import('../views/TagView.vue') },
  { path: '/settings', component: () => import('../views/SettingsView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return '/login'
  return true
})
