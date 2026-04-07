import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../views/InboxView.vue') },
  { path: '/deck/:id', component: () => import('../views/DeckView.vue') },
  { path: '/settings', component: () => import('../views/SettingsView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
