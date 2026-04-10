<template>
  <main class="login">
    <div class="login__card">
      <h1 class="login__title">Flashcards</h1>

      <form class="login__form" @submit.prevent="handleSubmit">
        <label class="login__label" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="login__input"
          type="password"
          autocomplete="current-password"
          autofocus
          :disabled="isLoading"
        />
        <p v-if="error" class="login__error">{{ error }}</p>
        <button class="login__btn" type="submit" :disabled="isLoading || !password">
          {{ isLoading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { loadAllData } from '../loadAllData'

const authStore = useAuthStore()
const router = useRouter()

const password = ref('')
const error = ref('')
const isLoading = ref(false)

async function handleSubmit(): Promise<void> {
  error.value = ''
  isLoading.value = true
  try {
    await authStore.login(password.value)
    await loadAllData()
    await router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign in failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: var(--space-4);
  background-color: var(--color-bg);
}

.login__card {
  width: 100%;
  max-width: 360px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-md);
}

.login__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.login__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.login__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-base);
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &:disabled { opacity: 0.5; }
}

.login__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.login__btn {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: filter var(--transition-fast);

  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
