import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'

const placeholder = (name: string) =>
  defineComponent({ render: () => h('div', name) })

const routes: RouteRecordRaw[] = [
  { path: '/', component: placeholder('Inbox') },
  { path: '/deck/:id', component: placeholder('Deck') },
  { path: '/settings', component: placeholder('Settings') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
